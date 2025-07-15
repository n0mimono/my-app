import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { test } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { test } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { test } from 'vitest';
import { expect } from 'vitest';
import { test } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { test } from 'vitest';
import { beforeEach } from 'vitest';
import { describe } from 'vitest';

// Mock localStorage for testing
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();

// Replace the global localStorage with our mock
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

describe('App Integration Tests', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  test('renders app and creates memo with manual save', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Initial empty state
    expect(screen.getByText('メモがありません')).toBeInTheDocument();

    // Create new memo
    await user.click(screen.getByText('新規メモ'));
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('メモを入力してください...')).toBeInTheDocument();
    });

    // Type content
    const editor = screen.getByPlaceholderText('メモを入力してください...');
    await user.type(editor, 'Test memo');

    // Manually save to avoid auto-save timing issues
    await user.click(screen.getByText('保存'));

    // Verify localStorage
    const storageData = mockLocalStorage.getItem('memo-app-data');
    expect(storageData).toBeTruthy();
    const data = JSON.parse(storageData!);
    expect(data.memos).toHaveLength(1);
    expect(data.memos[0].content).toBe('Test memo');
  });

  test('displays pre-existing memo from localStorage', async () => {
    // Pre-populate localStorage
    const testData = {
      memos: [{
        id: 'test-id',
        title: 'Existing memo',
        content: 'Existing memo\nSome content',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }],
      version: '1.0.0'
    };
    mockLocalStorage.setItem('memo-app-data', JSON.stringify(testData));

    render(<App />);

    // Should display the memo
    await waitFor(() => {
      expect(screen.getByText('Existing memo')).toBeInTheDocument();
    });
  });

  test('handles localStorage error gracefully', async () => {
    // Mock localStorage to throw error
    const originalSetItem = mockLocalStorage.setItem;
    mockLocalStorage.setItem = () => {
      throw new Error('localStorage not available');
    };

    const user = userEvent.setup();
    render(<App />);

    // Try to create memo
    await user.click(screen.getByText('新規メモ'));
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('メモを入力してください...')).toBeInTheDocument();
    });

    const editor = screen.getByPlaceholderText('メモを入力してください...');
    await user.type(editor, 'Test memo');
    await user.click(screen.getByText('保存'));

    // Should show error notification
    await waitFor(() => {
      expect(screen.getByText(/ローカルストレージ/)).toBeInTheDocument();
    });

    // Restore original setItem
    mockLocalStorage.setItem = originalSetItem;
  });

  test('recovers from corrupted localStorage data', async () => {
    // Set corrupted data in localStorage
    mockLocalStorage.setItem('memo-app-data', 'invalid json data');

    render(<App />);

    // Should show error notification and recovery option
    await waitFor(() => {
      expect(screen.getByText(/データの読み込み/)).toBeInTheDocument();
    });

    // Should show recovery button
    expect(screen.getByText('復旧を試す')).toBeInTheDocument();

    // Click recovery
    const user = userEvent.setup();
    await user.click(screen.getByText('復旧を試す'));

    // Should recover to empty state
    await waitFor(() => {
      expect(screen.getByText('メモがありません')).toBeInTheDocument();
    });
  });

  test('complete CRUD workflow with manual saves', async () => {
    const user = userEvent.setup();
    render(<App />);

    // CREATE: Create memo
    await user.click(screen.getByText('新規メモ'));
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('メモを入力してください...')).toBeInTheDocument();
    });

    const editor = screen.getByPlaceholderText('メモを入力してください...');
    await user.type(editor, 'Test memo\nContent');
    await user.click(screen.getByText('保存'));

    // Go back to list
    await user.click(screen.getByText('← 戻る'));

    // READ: Verify memo in list
    await waitFor(() => {
      expect(screen.getByText('Test memo')).toBeInTheDocument();
    });

    // UPDATE: Edit memo
    await user.click(screen.getByText('Test memo'));
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('Test memo\nContent')).toBeInTheDocument();
    });

    const editorForUpdate = screen.getByDisplayValue('Test memo\nContent');
    await user.clear(editorForUpdate);
    await user.type(editorForUpdate, 'Updated memo\nUpdated content');
    await user.click(screen.getByText('保存'));

    // Go back to list
    await user.click(screen.getByText('← 戻る'));

    // Verify updated memo
    await waitFor(() => {
      expect(screen.getByText('Updated memo')).toBeInTheDocument();
    });

    // DELETE: Delete memo
    await user.click(screen.getByText('Updated memo'));
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('Updated memo\nUpdated content')).toBeInTheDocument();
    });

    await user.click(screen.getByText('削除'));

    // Confirm deletion
    await waitFor(() => {
      expect(screen.getByText('このメモを削除しますか？')).toBeInTheDocument();
    });
    
    await user.click(screen.getByText('削除'));

    // Should return to empty list
    await waitFor(() => {
      expect(screen.getByText('メモがありません')).toBeInTheDocument();
    });

    // Verify localStorage is empty
    const storageData = mockLocalStorage.getItem('memo-app-data');
    const data = JSON.parse(storageData!);
    expect(data.memos).toHaveLength(0);
  });
});