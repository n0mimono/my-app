import type { StorageData } from '../types/memo';

// Storage key for memo data
export const STORAGE_KEY = 'memo-app-data';
export const STORAGE_VERSION = '1.0.0';

// Storage error types
export const StorageErrorType = {
  NOT_AVAILABLE: 'NOT_AVAILABLE',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  PARSE_ERROR: 'PARSE_ERROR',
  INVALID_DATA: 'INVALID_DATA',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

export type StorageErrorType = typeof StorageErrorType[keyof typeof StorageErrorType];

export interface StorageError {
  type: StorageErrorType;
  message: string;
  originalError?: Error;
}

// Storage status interface
export interface StorageStatus {
  available: boolean;
  error: StorageError | null;
  used: number;
  canRecover: boolean;
}

// Check if localStorage is available with detailed error information
export const isLocalStorageAvailable = (): boolean => {
  try {
    const testKey = '__localStorage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

// Get detailed storage status
export const getStorageStatus = (): StorageStatus => {
  let available = false;
  let error: StorageError | null = null;
  let used = 0;
  let canRecover = false;

  try {
    const testKey = '__localStorage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    available = true;

    // Calculate storage usage
    const data = localStorage.getItem(STORAGE_KEY);
    used = data ? new Blob([data]).size : 0;
    canRecover = true;
  } catch (err) {
    const originalError = err as Error;
    
    if (originalError.name === 'QuotaExceededError') {
      error = {
        type: StorageErrorType.QUOTA_EXCEEDED,
        message: 'ストレージの容量が不足しています。不要なデータを削除してください。',
        originalError
      };
      canRecover = true; // Can recover by clearing data
    } else if (originalError.message.includes('localStorage')) {
      error = {
        type: StorageErrorType.NOT_AVAILABLE,
        message: 'ブラウザでローカルストレージが利用できません。プライベートモードを無効にするか、別のブラウザをお試しください。',
        originalError
      };
      canRecover = false;
    } else {
      error = {
        type: StorageErrorType.UNKNOWN_ERROR,
        message: 'ストレージへのアクセスでエラーが発生しました。',
        originalError
      };
      canRecover = false;
    }
  }

  return { available, error, used, canRecover };
};

// Load data from localStorage with enhanced error handling
export const loadFromStorage = (): { data: StorageData; error: StorageError | null } => {
  const defaultData: StorageData = {
    memos: [],
    version: STORAGE_VERSION
  };

  const status = getStorageStatus();
  if (!status.available) {
    return { data: defaultData, error: status.error };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { data: defaultData, error: null };
    }

    const parsed = JSON.parse(stored) as StorageData;
    
    // Validate data structure
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.memos)) {
      const error: StorageError = {
        type: StorageErrorType.INVALID_DATA,
        message: 'データが破損しています。初期状態に復元されました。',
      };
      
      // Try to backup corrupted data
      try {
        localStorage.setItem(`${STORAGE_KEY}_backup_${Date.now()}`, stored);
      } catch {
        // Ignore backup errors
      }
      
      return { data: defaultData, error };
    }

    // Convert date strings back to Date objects with validation
    const memos = parsed.memos.map((memo: any) => {
      try {
        return {
          ...memo,
          createdAt: new Date(memo.createdAt),
          updatedAt: new Date(memo.updatedAt)
        };
      } catch {
        // If date conversion fails, use current date
        const now = new Date();
        return {
          ...memo,
          createdAt: now,
          updatedAt: now
        };
      }
    });

    return {
      data: {
        memos,
        version: parsed.version || STORAGE_VERSION
      },
      error: null
    };
  } catch (error) {
    const originalError = error as Error;
    let storageError: StorageError;

    if (originalError instanceof SyntaxError) {
      storageError = {
        type: StorageErrorType.PARSE_ERROR,
        message: 'データの読み込みに失敗しました。データが破損している可能性があります。',
        originalError
      };
    } else {
      storageError = {
        type: StorageErrorType.UNKNOWN_ERROR,
        message: 'データの読み込み中にエラーが発生しました。',
        originalError
      };
    }

    return { data: defaultData, error: storageError };
  }
};

// Save data to localStorage with enhanced error handling
export const saveToStorage = (data: StorageData): { success: boolean; error: StorageError | null } => {
  const status = getStorageStatus();
  if (!status.available) {
    return { success: false, error: status.error };
  }

  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(STORAGE_KEY, serialized);
    return { success: true, error: null };
  } catch (error) {
    const originalError = error as Error;
    let storageError: StorageError;

    if (originalError.name === 'QuotaExceededError') {
      storageError = {
        type: StorageErrorType.QUOTA_EXCEEDED,
        message: 'ストレージの容量が不足しています。古いメモを削除するか、ブラウザのデータを整理してください。',
        originalError
      };
    } else {
      storageError = {
        type: StorageErrorType.UNKNOWN_ERROR,
        message: 'データの保存中にエラーが発生しました。',
        originalError
      };
    }

    return { success: false, error: storageError };
  }
};

// Clear all data from localStorage with enhanced error handling
export const clearStorage = (): { success: boolean; error: StorageError | null } => {
  const status = getStorageStatus();
  if (!status.available) {
    return { success: false, error: status.error };
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
    return { success: true, error: null };
  } catch (error) {
    const storageError: StorageError = {
      type: StorageErrorType.UNKNOWN_ERROR,
      message: 'データの削除中にエラーが発生しました。',
      originalError: error as Error
    };
    return { success: false, error: storageError };
  }
};

// Recovery utilities
export const recoverFromStorageError = async (errorType: StorageErrorType): Promise<{ success: boolean; message: string }> => {
  switch (errorType) {
    case StorageErrorType.QUOTA_EXCEEDED:
      // Try to free up space by clearing old backups
      try {
        const keys = Object.keys(localStorage);
        const backupKeys = keys.filter(key => key.startsWith(`${STORAGE_KEY}_backup_`));
        
        for (const key of backupKeys) {
          localStorage.removeItem(key);
        }
        
        return {
          success: true,
          message: '古いバックアップデータを削除しました。再度お試しください。'
        };
      } catch {
        return {
          success: false,
          message: 'ストレージの容量不足を解決できませんでした。ブラウザの設定からデータを削除してください。'
        };
      }

    case StorageErrorType.INVALID_DATA:
      // Clear corrupted data and start fresh
      try {
        localStorage.removeItem(STORAGE_KEY);
        return {
          success: true,
          message: '破損したデータを削除しました。新しくメモを作成できます。'
        };
      } catch {
        return {
          success: false,
          message: 'データの復旧に失敗しました。'
        };
      }

    case StorageErrorType.PARSE_ERROR:
      // Try to recover by clearing corrupted data
      try {
        localStorage.removeItem(STORAGE_KEY);
        return {
          success: true,
          message: '破損したデータを削除しました。新しくメモを作成できます。'
        };
      } catch {
        return {
          success: false,
          message: 'データの復旧に失敗しました。'
        };
      }

    default:
      return {
        success: false,
        message: 'このエラーは自動復旧できません。ページを再読み込みしてください。'
      };
  }
};

// Get comprehensive storage information
export const getStorageInfo = (): { 
  used: number; 
  available: boolean; 
  status: StorageStatus;
  backupCount: number;
} => {
  const status = getStorageStatus();
  let backupCount = 0;

  if (status.available) {
    try {
      const keys = Object.keys(localStorage);
      backupCount = keys.filter(key => key.startsWith(`${STORAGE_KEY}_backup_`)).length;
    } catch {
      // Ignore errors for storage info
    }
  }

  return { 
    used: status.used, 
    available: status.available,
    status,
    backupCount
  };
};