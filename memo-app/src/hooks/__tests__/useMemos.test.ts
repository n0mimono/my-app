import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useMemos } from '../useMemos';

// Mock the useLocalStorage hook
vi.mock('../useLocalStorage', () => ({
  useLocalStorage: vi.fn()
}));

import { useLocalStorage } from '../useLocalStorage';

const mockUseLocalStorage = useLocalStorage as any;

describe('useMemos', () => {
  let mockStorageData: any;
  let mockSetStorageData: any;

  beforeEach(() => {
    mockStorageData = {
      memos: [],
      version: '1.0.0'
    };
    
    mockSetStorageData = vi.fn();

    mockUseLocalStorage.mockReturnValue({
      value: mockStorageData,
      setValue: mockSetStorageData,
      isLoading: false,
      error: null
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with empty memos array', () => {
    const { result } = renderHook(() => useMemos());

    expect(result.current.memos).toEqual([]);
    expect(result.current.currentMemo).toBe(null);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should create a new memo', () => {
    const { result } = renderHook(() => useMemos());

    let createdMemo: any;
    act(() => {
      createdMemo = result.current.createMemo();
    });

    expect(createdMemo).toBeDefined();
    expect(createdMemo.id).toBeDefined();
    expect(createdMemo.title).toBe('Untitled');
    expect(createdMemo.content).toBe('');
    expect(createdMemo.createdAt).toBeInstanceOf(Date);
    expect(createdMemo.updatedAt).toBeInstanceOf(Date);

    // Verify that setStorageData was called with the new memo
    expect(mockSetStorageData).toHaveBeenCalledWith({
      memos: [createdMemo],
      version: '1.0.0'
    });
  });

  it('should update an existing memo', () => {
    // Setup initial memo
    const existingMemo = {
      id: 'test-id',
      title: 'Old Title',
      content: 'Old content',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01')
    };

    mockStorageData.memos = [existingMemo];
    mockUseLocalStorage.mockReturnValue({
      value: mockStorageData,
      setValue: mockSetStorageData,
      isLoading: false,
      error: null
    });

    const { result } = renderHook(() => useMemos());

    act(() => {
      result.current.updateMemo('test-id', 'New Title\nNew content');
    });

    expect(mockSetStorageData).toHaveBeenCalledWith({
      memos: [{
        id: 'test-id',
        title: 'New Title',
        content: 'New Title\nNew content',
        createdAt: new Date('2023-01-01'),
        updatedAt: expect.any(Date)
      }],
      version: '1.0.0'
    });
  });

  it('should extract title from first line of content', () => {
    const existingMemo = {
      id: 'test-id',
      title: 'Old Title',
      content: 'Old content',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01')
    };

    mockStorageData.memos = [existingMemo];
    mockUseLocalStorage.mockReturnValue({
      value: mockStorageData,
      setValue: mockSetStorageData,
      isLoading: false,
      error: null
    });

    const { result } = renderHook(() => useMemos());

    act(() => {
      result.current.updateMemo('test-id', 'First Line Title\nSecond line content\nThird line');
    });

    const updatedMemo = mockSetStorageData.mock.calls[0][0].memos[0];
    expect(updatedMemo.title).toBe('First Line Title');
  });

  it('should handle empty content when extracting title', () => {
    const existingMemo = {
      id: 'test-id',
      title: 'Old Title',
      content: 'Old content',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01')
    };

    mockStorageData.memos = [existingMemo];
    mockUseLocalStorage.mockReturnValue({
      value: mockStorageData,
      setValue: mockSetStorageData,
      isLoading: false,
      error: null
    });

    const { result } = renderHook(() => useMemos());

    act(() => {
      result.current.updateMemo('test-id', '');
    });

    const updatedMemo = mockSetStorageData.mock.calls[0][0].memos[0];
    expect(updatedMemo.title).toBe('Untitled');
  });

  it('should delete a memo', () => {
    const memo1 = {
      id: 'memo-1',
      title: 'Memo 1',
      content: 'Content 1',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01')
    };

    const memo2 = {
      id: 'memo-2',
      title: 'Memo 2',
      content: 'Content 2',
      createdAt: new Date('2023-01-02'),
      updatedAt: new Date('2023-01-02')
    };

    mockStorageData.memos = [memo1, memo2];
    mockUseLocalStorage.mockReturnValue({
      value: mockStorageData,
      setValue: mockSetStorageData,
      isLoading: false,
      error: null
    });

    const { result } = renderHook(() => useMemos());

    act(() => {
      result.current.deleteMemo('memo-1');
    });

    expect(mockSetStorageData).toHaveBeenCalledWith({
      memos: [memo2],
      version: '1.0.0'
    });
  });

  it('should return existing memos from storage', () => {
    const existingMemos = [
      {
        id: 'memo-1',
        title: 'Memo 1',
        content: 'Content 1',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01')
      },
      {
        id: 'memo-2',
        title: 'Memo 2',
        content: 'Content 2',
        createdAt: new Date('2023-01-02'),
        updatedAt: new Date('2023-01-02')
      }
    ];

    mockStorageData.memos = existingMemos;
    mockUseLocalStorage.mockReturnValue({
      value: mockStorageData,
      setValue: mockSetStorageData,
      isLoading: false,
      error: null
    });

    const { result } = renderHook(() => useMemos());

    expect(result.current.memos).toEqual(existingMemos);
  });

  it('should handle loading and error states from localStorage', () => {
    mockUseLocalStorage.mockReturnValue({
      value: mockStorageData,
      setValue: mockSetStorageData,
      isLoading: true,
      error: 'Storage error'
    });

    const { result } = renderHook(() => useMemos());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe('Storage error');
  });

  it('should add new memos to the beginning of the list', () => {
    const existingMemo = {
      id: 'existing-memo',
      title: 'Existing Memo',
      content: 'Existing content',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01')
    };

    mockStorageData.memos = [existingMemo];
    mockUseLocalStorage.mockReturnValue({
      value: mockStorageData,
      setValue: mockSetStorageData,
      isLoading: false,
      error: null
    });

    const { result } = renderHook(() => useMemos());

    let newMemo: any;
    act(() => {
      newMemo = result.current.createMemo();
    });

    const updatedMemos = mockSetStorageData.mock.calls[0][0].memos;
    expect(updatedMemos[0]).toEqual(newMemo);
    expect(updatedMemos[1]).toEqual(existingMemo);
  });
});