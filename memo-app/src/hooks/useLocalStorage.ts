import { useState, useEffect, useCallback } from 'react';
import { StorageErrorType, getStorageStatus, recoverFromStorageError } from '../utils/storage';
import type { StorageError } from '../utils/storage';

// Generic useLocalStorage hook interface
export interface UseLocalStorage<T> {
  value: T;
  setValue: (value: T | ((prev: T) => T)) => void;
  removeValue: () => void;
  isLoading: boolean;
  error: StorageError | null;
  canRecover: boolean;
  recover: () => Promise<void>;
}

// Generic useLocalStorage hook
export const useLocalStorage = <T>(
  key: string,
  initialValue: T
): UseLocalStorage<T> => {
  const [value, setStoredValue] = useState<T>(initialValue);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<StorageError | null>(null);
  const [canRecover, setCanRecover] = useState(false);

  // Load value from localStorage on mount
  useEffect(() => {
    const loadValue = () => {
      try {
        setIsLoading(true);
        setError(null);
        setCanRecover(false);

        const status = getStorageStatus();
        if (!status.available) {
          setError(status.error);
          setCanRecover(status.canRecover);
          setStoredValue(initialValue);
          return;
        }

        const item = localStorage.getItem(key);
        if (item === null) {
          setStoredValue(initialValue);
          return;
        }

        const parsed = JSON.parse(item);

        // Convert date strings back to Date objects if needed
        const processedValue = processDateStrings(parsed);
        setStoredValue(processedValue);
      } catch (err) {
        console.error(`Error loading from localStorage key "${key}":`, err);
        const storageError: StorageError = {
          type: StorageErrorType.PARSE_ERROR,
          message: `データの読み込みに失敗しました: ${key}`,
          originalError: err as Error
        };
        setError(storageError);
        setCanRecover(true);
        setStoredValue(initialValue);
      } finally {
        setIsLoading(false);
      }
    };

    loadValue();
  }, [key, initialValue]);

  // Helper function to process date strings in objects
  const processDateStrings = (obj: any): any => {
    if (obj === null || obj === undefined) return obj;

    if (typeof obj === 'string') {
      // Check if string looks like an ISO date
      const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
      if (dateRegex.test(obj)) {
        return new Date(obj);
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(processDateStrings);
    }

    if (typeof obj === 'object') {
      const processed: any = {};
      for (const [k, v] of Object.entries(obj)) {
        if (k === 'createdAt' || k === 'updatedAt') {
          processed[k] = new Date(v as string);
        } else {
          processed[k] = processDateStrings(v);
        }
      }
      return processed;
    }

    return obj;
  };

  // Set value with automatic localStorage sync
  const setValue = useCallback((newValue: T | ((prev: T) => T)) => {
    try {
      setError(null);
      setCanRecover(false);

      const valueToStore = newValue instanceof Function ? newValue(value) : newValue;
      setStoredValue(valueToStore);

      const status = getStorageStatus();
      if (!status.available) {
        setError(status.error);
        setCanRecover(status.canRecover);
        return;
      }

      localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (err) {
      console.error(`Error saving to localStorage key "${key}":`, err);
      const originalError = err as Error;
      let storageError: StorageError;

      if (originalError.name === 'QuotaExceededError') {
        storageError = {
          type: StorageErrorType.QUOTA_EXCEEDED,
          message: 'ストレージの容量が不足しています。',
          originalError
        };
        setCanRecover(true);
      } else {
        storageError = {
          type: StorageErrorType.UNKNOWN_ERROR,
          message: `データの保存に失敗しました: ${key}`,
          originalError
        };
        setCanRecover(false);
      }

      setError(storageError);
    }
  }, [key, value]);

  // Remove value from localStorage
  const removeValue = useCallback(() => {
    try {
      setError(null);
      setCanRecover(false);
      setStoredValue(initialValue);

      const status = getStorageStatus();
      if (!status.available) {
        setError(status.error);
        setCanRecover(status.canRecover);
        return;
      }

      localStorage.removeItem(key);
    } catch (err) {
      console.error(`Error removing from localStorage key "${key}":`, err);
      const storageError: StorageError = {
        type: StorageErrorType.UNKNOWN_ERROR,
        message: `データの削除に失敗しました: ${key}`,
        originalError: err as Error
      };
      setError(storageError);
      setCanRecover(false);
    }
  }, [key, initialValue]);

  // Recovery function
  const recover = useCallback(async () => {
    if (!error || !canRecover) return;

    try {
      const result = await recoverFromStorageError(error.type);
      if (result.success) {
        setError(null);
        setCanRecover(false);
        // Reload the value after recovery
        const item = localStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          const processedValue = processDateStrings(parsed);
          setStoredValue(processedValue);
        } else {
          setStoredValue(initialValue);
        }
      } else {
        // Update error message with recovery result
        setError({
          ...error,
          message: result.message
        });
      }
    } catch (err) {
      console.error('Recovery failed:', err);
      setError({
        ...error,
        message: '復旧処理中にエラーが発生しました。'
      });
    }
  }, [error, canRecover, key, initialValue]);

  return {
    value,
    setValue,
    removeValue,
    isLoading,
    error,
    canRecover,
    recover
  };
};