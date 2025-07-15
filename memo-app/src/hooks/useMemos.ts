import { useCallback, useMemo } from 'react';
import { useLocalStorage } from './useLocalStorage';
import type { Memo, StorageData } from '../types/memo';
import { STORAGE_KEY, STORAGE_VERSION } from '../utils/storage';
import type { StorageError } from '../utils/storage';

// Generate unique ID for memos
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Extract title from memo content (first line)
const extractTitle = (content: string): string => {
  const firstLine = content.split('\n')[0].trim();
  return firstLine || 'Untitled';
};

// useMemos hook interface
export interface UseMemos {
  memos: Memo[];
  currentMemo: Memo | null;
  isLoading: boolean;
  error: StorageError | null;
  canRecover: boolean;
  recover: () => Promise<void>;
  createMemo: () => Memo;
  updateMemo: (id: string, content: string) => void;
  deleteMemo: (id: string) => void;
  selectMemo: (id: string) => void;
  clearSelection: () => void;
}

// useMemos hook implementation
export const useMemos = (): UseMemos => {
  // Initialize default storage data
  const defaultStorageData: StorageData = {
    memos: [],
    version: STORAGE_VERSION
  };

  // Use localStorage hook for persistence
  const { 
    value: storageData, 
    setValue: setStorageData, 
    isLoading, 
    error,
    canRecover,
    recover
  } = useLocalStorage<StorageData>(STORAGE_KEY, defaultStorageData);

  // Extract memos from storage data
  const memos = useMemo(() => {
    return storageData?.memos || [];
  }, [storageData]);

  // Current selected memo (for editing)
  const currentMemo = useMemo(() => {
    // For now, we'll manage current memo selection in the parent component
    // This hook focuses on CRUD operations
    return null;
  }, []);

  // Create a new memo
  const createMemo = useCallback((): Memo => {
    const now = new Date();
    const newMemo: Memo = {
      id: generateId(),
      title: 'Untitled',
      content: '',
      createdAt: now,
      updatedAt: now
    };

    // Add new memo to the beginning of the list
    const updatedMemos = [newMemo, ...memos];
    const updatedStorageData: StorageData = {
      ...storageData,
      memos: updatedMemos
    };

    setStorageData(updatedStorageData);
    return newMemo;
  }, [memos, storageData, setStorageData]);

  // Update an existing memo
  const updateMemo = useCallback((id: string, content: string) => {
    const updatedMemos = memos.map(memo => {
      if (memo.id === id) {
        const updatedMemo: Memo = {
          ...memo,
          title: extractTitle(content),
          content,
          updatedAt: new Date()
        };
        return updatedMemo;
      }
      return memo;
    });

    const updatedStorageData: StorageData = {
      ...storageData,
      memos: updatedMemos
    };

    setStorageData(updatedStorageData);
  }, [memos, storageData, setStorageData]);

  // Delete a memo
  const deleteMemo = useCallback((id: string) => {
    const updatedMemos = memos.filter(memo => memo.id !== id);
    const updatedStorageData: StorageData = {
      ...storageData,
      memos: updatedMemos
    };

    setStorageData(updatedStorageData);
  }, [memos, storageData, setStorageData]);

  // Select a memo (placeholder for future implementation)
  const selectMemo = useCallback((id: string) => {
    // This will be implemented when we need memo selection functionality
    // For now, it's a placeholder to match the interface
    console.log(`Selecting memo with id: ${id}`);
  }, []);

  // Clear memo selection (placeholder for future implementation)
  const clearSelection = useCallback(() => {
    // This will be implemented when we need memo selection functionality
    // For now, it's a placeholder to match the interface
    console.log('Clearing memo selection');
  }, []);

  return {
    memos,
    currentMemo,
    isLoading,
    error,
    canRecover,
    recover,
    createMemo,
    updateMemo,
    deleteMemo,
    selectMemo,
    clearSelection
  };
};