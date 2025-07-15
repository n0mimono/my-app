import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useLocalStorage } from '../useLocalStorage';

// Simple localStorage mock
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => localStorageMock.store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageMock.store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageMock.store[key];
  }),
  clear: vi.fn(() => {
    localStorageMock.store = {};
  }),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('should return initial value when localStorage is empty', async () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
    
    // Wait for loading to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result.current.value).toBe('initial');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should save and load values correctly', async () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    // Set a value
    act(() => {
      result.current.setValue('new-value');
    });

    expect(result.current.value).toBe('new-value');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('test-key', '"new-value"');
  });

  it('should handle date conversion for memo objects', async () => {
    const testMemo = {
      id: '123',
      title: 'Test Memo',
      content: 'Test content',
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-02T00:00:00.000Z'
    };

    // Pre-populate localStorage
    localStorageMock.store['memo-key'] = JSON.stringify(testMemo);
    
    const { result } = renderHook(() => useLocalStorage('memo-key', null));
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    const value = result.current.value as any;
    expect(value.id).toBe('123');
    expect(value.createdAt).toBeInstanceOf(Date);
    expect(value.updatedAt).toBeInstanceOf(Date);
  });
});