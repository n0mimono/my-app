import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isLocalStorageAvailable,
  getStorageStatus,
  loadFromStorage,
  saveToStorage,
  clearStorage,
  recoverFromStorageError,
  getStorageInfo,
  StorageErrorType,
  STORAGE_KEY
} from '../storage';
import type { StorageData } from '../../types/memo';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null)
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('Enhanced Storage Utilities', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('isLocalStorageAvailable', () => {
    it('returns true when localStorage is available', () => {
      expect(isLocalStorageAvailable()).toBe(true);
    });

    it('returns false when localStorage throws an error', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('localStorage not available');
      });
      
      expect(isLocalStorageAvailable()).toBe(false);
    });
  });

  describe('getStorageStatus', () => {
    it('returns available status when localStorage works', () => {
      const status = getStorageStatus();
      
      expect(status.available).toBe(true);
      expect(status.error).toBeNull();
      expect(status.canRecover).toBe(true);
    });

    it('handles quota exceeded error', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });
      
      const status = getStorageStatus();
      
      expect(status.available).toBe(false);
      expect(status.error?.type).toBe(StorageErrorType.QUOTA_EXCEEDED);
      expect(status.canRecover).toBe(true);
    });

    it('handles localStorage not available error', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('localStorage is not available');
      });
      
      const status = getStorageStatus();
      
      expect(status.available).toBe(false);
      expect(status.error?.type).toBe(StorageErrorType.NOT_AVAILABLE);
      expect(status.canRecover).toBe(false);
    });
  });

  describe('loadFromStorage', () => {
    it('loads valid data successfully', () => {
      const testData: StorageData = {
        memos: [{
          id: '1',
          title: 'Test Memo',
          content: 'Test content',
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-01')
        }],
        version: '1.0.0'
      };
      
      localStorageMock.setItem(STORAGE_KEY, JSON.stringify(testData));
      
      const result = loadFromStorage();
      
      expect(result.error).toBeNull();
      expect(result.data.memos).toHaveLength(1);
      expect(result.data.memos[0].title).toBe('Test Memo');
    });

    it('handles corrupted data', () => {
      localStorageMock.setItem(STORAGE_KEY, 'invalid json');
      
      const result = loadFromStorage();
      
      expect(result.error?.type).toBe(StorageErrorType.PARSE_ERROR);
      expect(result.data.memos).toHaveLength(0);
    });

    it('handles invalid data structure', () => {
      localStorageMock.setItem(STORAGE_KEY, JSON.stringify({ invalid: 'data' }));
      
      const result = loadFromStorage();
      
      expect(result.error?.type).toBe(StorageErrorType.INVALID_DATA);
      expect(result.data.memos).toHaveLength(0);
    });

    it('returns default data when no data exists', () => {
      const result = loadFromStorage();
      
      expect(result.error).toBeNull();
      expect(result.data.memos).toHaveLength(0);
      expect(result.data.version).toBe('1.0.0');
    });
  });

  describe('saveToStorage', () => {
    it('saves data successfully', () => {
      const testData: StorageData = {
        memos: [],
        version: '1.0.0'
      };
      
      const result = saveToStorage(testData);
      
      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        JSON.stringify(testData)
      );
    });

    it('handles quota exceeded error', () => {
      const error = new Error('QuotaExceededError');
      error.name = 'QuotaExceededError';
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw error;
      });
      
      const testData: StorageData = { memos: [], version: '1.0.0' };
      const result = saveToStorage(testData);
      
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(StorageErrorType.QUOTA_EXCEEDED);
    });
  });

  describe('clearStorage', () => {
    it('clears storage successfully', () => {
      const result = clearStorage();
      
      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
    });
  });

  describe('recoverFromStorageError', () => {
    it('recovers from quota exceeded error', async () => {
      // Set up some backup data
      localStorageMock.setItem(`${STORAGE_KEY}_backup_123`, 'old backup');
      
      const result = await recoverFromStorageError(StorageErrorType.QUOTA_EXCEEDED);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('古いバックアップデータを削除しました');
    });

    it('recovers from invalid data error', async () => {
      localStorageMock.setItem(STORAGE_KEY, 'corrupted data');
      
      const result = await recoverFromStorageError(StorageErrorType.INVALID_DATA);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('破損したデータを削除しました');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
    });

    it('handles non-recoverable errors', async () => {
      const result = await recoverFromStorageError(StorageErrorType.NOT_AVAILABLE);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('自動復旧できません');
    });
  });

  describe('getStorageInfo', () => {
    it('returns storage information', () => {
      const testData = JSON.stringify({ memos: [], version: '1.0.0' });
      localStorageMock.setItem(STORAGE_KEY, testData);
      
      const info = getStorageInfo();
      
      expect(info.available).toBe(true);
      expect(info.used).toBeGreaterThan(0);
      expect(info.backupCount).toBe(0);
    });

    it('counts backup files', () => {
      localStorageMock.setItem(`${STORAGE_KEY}_backup_123`, 'backup1');
      localStorageMock.setItem(`${STORAGE_KEY}_backup_456`, 'backup2');
      
      // Mock Object.keys to return our backup keys
      const originalKeys = Object.keys;
      Object.keys = vi.fn(() => [`${STORAGE_KEY}_backup_123`, `${STORAGE_KEY}_backup_456`]);
      
      const info = getStorageInfo();
      
      expect(info.backupCount).toBe(2);
      
      // Restore original Object.keys
      Object.keys = originalKeys;
    });
  });
});