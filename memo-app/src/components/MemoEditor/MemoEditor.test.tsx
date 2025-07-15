import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoEditor } from './index';
import type { Memo } from '../../types/memo';

// Mock memo data
const mockMemo: Memo = {
  id: '1',
  title: 'Test Memo',
  content: 'This is a test memo content',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01')
};

describe('MemoEditor', () => {
  const mockOnSave = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('renders editor with memo content', () => {
    render(
      <MemoEditor
        memo={mockMemo}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onBack={mockOnBack}
      />
    );

    const textarea = screen.getByRole('textbox', { name: 'メモ内容' });
    expect(textarea).toHaveValue('This is a test memo content');
  });

  it('renders editor with empty content for new memo', () => {
    render(
      <MemoEditor
        memo={null}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onBack={mockOnBack}
      />
    );

    const textarea = screen.getByRole('textbox', { name: 'メモ内容' });
    expect(textarea).toHaveValue('');
    expect(textarea).toHaveAttribute('placeholder', 'メモを入力してください...');
  });

  it('calls onBack when back button is clicked', () => {
    render(
      <MemoEditor
        memo={mockMemo}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onBack={mockOnBack}
      />
    );

    const backButton = screen.getByRole('button', { name: '戻る' });
    fireEvent.click(backButton);

    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  it('calls onSave with current content when save button is clicked', () => {
    render(
      <MemoEditor
        memo={mockMemo}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onBack={mockOnBack}
      />
    );

    const textarea = screen.getByRole('textbox', { name: 'メモ内容' });
    const saveButton = screen.getByRole('button', { name: '保存' });

    // Change content
    fireEvent.change(textarea, { target: { value: 'Updated content' } });
    fireEvent.click(saveButton);

    expect(mockOnSave).toHaveBeenCalledWith('Updated content');
  });

  it('shows delete button only when memo exists', () => {
    const { rerender } = render(
      <MemoEditor
        memo={null}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onBack={mockOnBack}
      />
    );

    // No delete button for new memo
    expect(screen.queryByRole('button', { name: '削除' })).not.toBeInTheDocument();

    // Delete button appears for existing memo
    rerender(
      <MemoEditor
        memo={mockMemo}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByRole('button', { name: '削除' })).toBeInTheDocument();
  });

  it('shows confirmation dialog and calls onDelete when delete is confirmed', () => {
    // Mock window.confirm
    const originalConfirm = window.confirm;
    window.confirm = vi.fn(() => true);

    render(
      <MemoEditor
        memo={mockMemo}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onBack={mockOnBack}
      />
    );

    const deleteButton = screen.getByRole('button', { name: '削除' });
    fireEvent.click(deleteButton);

    expect(window.confirm).toHaveBeenCalledWith('このメモを削除しますか？');
    expect(mockOnDelete).toHaveBeenCalledTimes(1);

    // Restore original confirm
    window.confirm = originalConfirm;
  });

  it('does not call onDelete when deletion is cancelled', () => {
    // Mock window.confirm to return false
    const originalConfirm = window.confirm;
    window.confirm = vi.fn(() => false);

    render(
      <MemoEditor
        memo={mockMemo}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onBack={mockOnBack}
      />
    );

    const deleteButton = screen.getByRole('button', { name: '削除' });
    fireEvent.click(deleteButton);

    expect(window.confirm).toHaveBeenCalledWith('このメモを削除しますか？');
    expect(mockOnDelete).not.toHaveBeenCalled();

    // Restore original confirm
    window.confirm = originalConfirm;
  });

  it('updates content when typing in textarea', () => {
    render(
      <MemoEditor
        memo={mockMemo}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onBack={mockOnBack}
      />
    );

    const textarea = screen.getByRole('textbox', { name: 'メモ内容' });
    
    fireEvent.change(textarea, { target: { value: 'New content' } });
    
    expect(textarea).toHaveValue('New content');
  });

  it('updates content when memo prop changes', () => {
    const { rerender } = render(
      <MemoEditor
        memo={mockMemo}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onBack={mockOnBack}
      />
    );

    const textarea = screen.getByRole('textbox', { name: 'メモ内容' });
    expect(textarea).toHaveValue('This is a test memo content');

    const updatedMemo: Memo = {
      ...mockMemo,
      content: 'Updated memo content'
    };

    rerender(
      <MemoEditor
        memo={updatedMemo}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onBack={mockOnBack}
      />
    );

    expect(textarea).toHaveValue('Updated memo content');
  });

  // Auto-save functionality tests
  describe('Auto-save functionality', () => {
    it('shows unsaved changes status when content is modified', async () => {
      render(
        <MemoEditor
          memo={mockMemo}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
          onBack={mockOnBack}
          autoSaveDelay={500}
        />
      );

      const textarea = screen.getByRole('textbox', { name: 'メモ内容' });
      
      // Change content
      act(() => {
        fireEvent.change(textarea, { target: { value: 'Modified content' } });
      });
      
      // Should show unsaved changes status immediately
      expect(screen.getByText('未保存の変更')).toBeInTheDocument();
    });

    it('automatically saves content after delay', async () => {
      render(
        <MemoEditor
          memo={mockMemo}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
          onBack={mockOnBack}
          autoSaveDelay={500}
        />
      );

      const textarea = screen.getByRole('textbox', { name: 'メモ内容' });
      
      // Change content
      act(() => {
        fireEvent.change(textarea, { target: { value: 'Auto-saved content' } });
      });
      
      // Advance timers to trigger auto-save
      await act(async () => {
        vi.advanceTimersByTime(500);
      });
      
      // Should show saving status in the status area
      expect(screen.getByText('保存中...', { selector: '.memo-editor__status-text' })).toBeInTheDocument();

      // Complete the async save operation
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      
      expect(mockOnSave).toHaveBeenCalledWith('Auto-saved content');
      
      // Should show saved status
      expect(screen.getByText('保存済み')).toBeInTheDocument();
    });

    it('debounces multiple rapid changes', async () => {
      render(
        <MemoEditor
          memo={mockMemo}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
          onBack={mockOnBack}
          autoSaveDelay={500}
        />
      );

      const textarea = screen.getByRole('textbox', { name: 'メモ内容' });
      
      // Make multiple rapid changes
      act(() => {
        fireEvent.change(textarea, { target: { value: 'Change 1' } });
      });
      
      await act(async () => {
        vi.advanceTimersByTime(200);
      });
      
      act(() => {
        fireEvent.change(textarea, { target: { value: 'Change 2' } });
      });
      
      await act(async () => {
        vi.advanceTimersByTime(200);
      });
      
      act(() => {
        fireEvent.change(textarea, { target: { value: 'Final change' } });
      });
      
      // Only the final change should be saved after the full delay
      await act(async () => {
        vi.advanceTimersByTime(500);
        vi.advanceTimersByTime(100); // Complete async operation
      });
      
      expect(mockOnSave).toHaveBeenCalledTimes(1);
      expect(mockOnSave).toHaveBeenCalledWith('Final change');
    });

    it('does not auto-save if content has not changed', async () => {
      render(
        <MemoEditor
          memo={mockMemo}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
          onBack={mockOnBack}
          autoSaveDelay={500}
        />
      );

      // Wait for auto-save delay without changing content
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
      
      // Should not call onSave
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('disables buttons during save operation', async () => {
      render(
        <MemoEditor
          memo={mockMemo}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
          onBack={mockOnBack}
          autoSaveDelay={500}
        />
      );

      const textarea = screen.getByRole('textbox', { name: 'メモ内容' });
      const saveButton = screen.getByRole('button', { name: '保存' });
      const deleteButton = screen.getByRole('button', { name: '削除' });
      
      // Change content to trigger auto-save
      act(() => {
        fireEvent.change(textarea, { target: { value: 'Content for save test' } });
      });
      
      // Advance to trigger auto-save
      await act(async () => {
        vi.advanceTimersByTime(500);
      });
      
      expect(saveButton).toBeDisabled();
      expect(deleteButton).toBeDisabled();
    });

    it('shows save button text as "保存中..." during save', async () => {
      render(
        <MemoEditor
          memo={mockMemo}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
          onBack={mockOnBack}
          autoSaveDelay={500}
        />
      );

      const textarea = screen.getByRole('textbox', { name: 'メモ内容' });
      
      // Change content to trigger auto-save
      act(() => {
        fireEvent.change(textarea, { target: { value: 'Content for button test' } });
      });
      
      // Advance to trigger auto-save
      await act(async () => {
        vi.advanceTimersByTime(500);
      });
      
      expect(screen.getByRole('button', { name: '保存' })).toHaveTextContent('保存中...');
    });

    it('clears saved status after timeout', async () => {
      render(
        <MemoEditor
          memo={mockMemo}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
          onBack={mockOnBack}
          autoSaveDelay={500}
        />
      );

      const textarea = screen.getByRole('textbox', { name: 'メモ内容' });
      
      // Change content and trigger auto-save
      act(() => {
        fireEvent.change(textarea, { target: { value: 'Content to clear status' } });
      });
      
      await act(async () => {
        vi.advanceTimersByTime(500);
        vi.advanceTimersByTime(100); // Complete async save
      });
      
      // Should show saved status
      expect(screen.getByText('保存済み')).toBeInTheDocument();
      
      // Advance time to clear saved status (2 seconds)
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });
      
      expect(screen.queryByText('保存済み')).not.toBeInTheDocument();
    });
  });
});