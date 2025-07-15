import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MemoList from './index';
import type { Memo } from '../../types/memo';

// Mock MemoItem component
vi.mock('../MemoItem', () => ({
  default: ({ memo, onClick, onDelete }: { 
    memo: Memo; 
    onClick: (memo: Memo) => void;
    onDelete?: (memoId: string) => void;
  }) => (
    <div data-testid={`memo-item-${memo.id}`} onClick={() => onClick(memo)}>
      <h3>{memo.title}</h3>
      <p>{memo.createdAt.toISOString()}</p>
      {onDelete && (
        <button 
          data-testid={`delete-button-${memo.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(memo.id);
          }}
        >
          Delete
        </button>
      )}
    </div>
  ),
}));

describe('MemoList', () => {
  const mockMemos: Memo[] = [
    {
      id: '1',
      title: 'First Memo',
      content: 'First Memo\nThis is the first memo content',
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T10:00:00Z'),
    },
    {
      id: '2',
      title: 'Second Memo',
      content: 'Second Memo\nThis is the second memo content',
      createdAt: new Date('2024-01-02T10:00:00Z'),
      updatedAt: new Date('2024-01-02T10:00:00Z'),
    },
  ];

  const mockOnMemoSelect = vi.fn();
  const mockOnMemoDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state when isLoading is true', () => {
    render(
      <MemoList
        memos={[]}
        onMemoSelect={mockOnMemoSelect}
        isLoading={true}
      />
    );

    expect(screen.getByText('メモを読み込み中...')).toBeInTheDocument();
  });

  it('renders empty state when no memos are provided', () => {
    render(
      <MemoList
        memos={[]}
        onMemoSelect={mockOnMemoSelect}
      />
    );

    expect(screen.getByText('メモがありません')).toBeInTheDocument();
    expect(screen.getByText('「新規メモ」ボタンをクリックして、最初のメモを作成しましょう。')).toBeInTheDocument();
    expect(screen.getByText('📝')).toBeInTheDocument();
  });

  it('renders memo list with correct header and count', () => {
    render(
      <MemoList
        memos={mockMemos}
        onMemoSelect={mockOnMemoSelect}
      />
    );

    expect(screen.getByText('メモ一覧')).toBeInTheDocument();
    expect(screen.getByText('2件')).toBeInTheDocument();
  });

  it('renders all memo items', () => {
    render(
      <MemoList
        memos={mockMemos}
        onMemoSelect={mockOnMemoSelect}
      />
    );

    expect(screen.getByTestId('memo-item-1')).toBeInTheDocument();
    expect(screen.getByTestId('memo-item-2')).toBeInTheDocument();
  });

  it('calls onMemoSelect when a memo item is clicked', () => {
    render(
      <MemoList
        memos={mockMemos}
        onMemoSelect={mockOnMemoSelect}
      />
    );

    const firstMemoItem = screen.getByTestId('memo-item-1');
    fireEvent.click(firstMemoItem);

    expect(mockOnMemoSelect).toHaveBeenCalledWith(mockMemos[0]);
    expect(mockOnMemoSelect).toHaveBeenCalledTimes(1);
  });

  it('handles multiple memo selections correctly', () => {
    render(
      <MemoList
        memos={mockMemos}
        onMemoSelect={mockOnMemoSelect}
      />
    );

    const firstMemoItem = screen.getByTestId('memo-item-1');
    const secondMemoItem = screen.getByTestId('memo-item-2');

    fireEvent.click(firstMemoItem);
    fireEvent.click(secondMemoItem);

    expect(mockOnMemoSelect).toHaveBeenCalledTimes(2);
    expect(mockOnMemoSelect).toHaveBeenNthCalledWith(1, mockMemos[0]);
    expect(mockOnMemoSelect).toHaveBeenNthCalledWith(2, mockMemos[1]);
  });

  it('displays correct memo count for single memo', () => {
    render(
      <MemoList
        memos={[mockMemos[0]]}
        onMemoSelect={mockOnMemoSelect}
      />
    );

    expect(screen.getByText('1件')).toBeInTheDocument();
  });

  it('renders without onMemoDelete prop (optional)', () => {
    expect(() => {
      render(
        <MemoList
          memos={mockMemos}
          onMemoSelect={mockOnMemoSelect}
        />
      );
    }).not.toThrow();
  });

  it('shows delete buttons when onMemoDelete is provided', () => {
    render(
      <MemoList
        memos={mockMemos}
        onMemoSelect={mockOnMemoSelect}
        onMemoDelete={mockOnMemoDelete}
      />
    );

    expect(screen.getByTestId('delete-button-1')).toBeInTheDocument();
    expect(screen.getByTestId('delete-button-2')).toBeInTheDocument();
  });

  it('does not show delete buttons when onMemoDelete is not provided', () => {
    render(
      <MemoList
        memos={mockMemos}
        onMemoSelect={mockOnMemoSelect}
      />
    );

    expect(screen.queryByTestId('delete-button-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('delete-button-2')).not.toBeInTheDocument();
  });

  it('shows confirmation dialog when delete button is clicked', () => {
    render(
      <MemoList
        memos={mockMemos}
        onMemoSelect={mockOnMemoSelect}
        onMemoDelete={mockOnMemoDelete}
      />
    );

    const deleteButton = screen.getByTestId('delete-button-1');
    fireEvent.click(deleteButton);

    expect(screen.getByText('メモを削除しますか？')).toBeInTheDocument();
    expect(screen.getByText((content, element) => {
      return element?.textContent === '「First Memo」を削除します。この操作は取り消せません。';
    })).toBeInTheDocument();
    expect(screen.getByText('キャンセル')).toBeInTheDocument();
    expect(screen.getByText('削除')).toBeInTheDocument();
  });

  it('closes confirmation dialog when cancel is clicked', () => {
    render(
      <MemoList
        memos={mockMemos}
        onMemoSelect={mockOnMemoSelect}
        onMemoDelete={mockOnMemoDelete}
      />
    );

    const deleteButton = screen.getByTestId('delete-button-1');
    fireEvent.click(deleteButton);

    expect(screen.getByText('メモを削除しますか？')).toBeInTheDocument();

    const cancelButton = screen.getByText('キャンセル');
    fireEvent.click(cancelButton);

    expect(screen.queryByText('メモを削除しますか？')).not.toBeInTheDocument();
    expect(mockOnMemoDelete).not.toHaveBeenCalled();
  });

  it('calls onMemoDelete when deletion is confirmed', () => {
    render(
      <MemoList
        memos={mockMemos}
        onMemoSelect={mockOnMemoSelect}
        onMemoDelete={mockOnMemoDelete}
      />
    );

    const deleteButton = screen.getByTestId('delete-button-1');
    fireEvent.click(deleteButton);

    const confirmButton = screen.getByText('削除');
    fireEvent.click(confirmButton);

    expect(mockOnMemoDelete).toHaveBeenCalledWith('1');
    expect(mockOnMemoDelete).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('メモを削除しますか？')).not.toBeInTheDocument();
  });

  it('handles deletion of memo with no title correctly', () => {
    const memoWithoutTitle: Memo = {
      id: '3',
      title: '',
      content: '',
      createdAt: new Date('2024-01-03T10:00:00Z'),
      updatedAt: new Date('2024-01-03T10:00:00Z'),
    };

    render(
      <MemoList
        memos={[memoWithoutTitle]}
        onMemoSelect={mockOnMemoSelect}
        onMemoDelete={mockOnMemoDelete}
      />
    );

    const deleteButton = screen.getByTestId('delete-button-3');
    fireEvent.click(deleteButton);

    expect(screen.getByText((content, element) => {
      return element?.textContent === '「無題のメモ」を削除します。この操作は取り消せません。';
    })).toBeInTheDocument();
  });

  it('does not call onMemoSelect when delete button is clicked', () => {
    render(
      <MemoList
        memos={mockMemos}
        onMemoSelect={mockOnMemoSelect}
        onMemoDelete={mockOnMemoDelete}
      />
    );

    const deleteButton = screen.getByTestId('delete-button-1');
    fireEvent.click(deleteButton);

    expect(mockOnMemoSelect).not.toHaveBeenCalled();
  });
});