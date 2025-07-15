import React, { useState } from 'react';
import type { Memo } from '../../types/memo';
import MemoItem from '../MemoItem';
import './MemoList.css';

interface MemoListProps {
  memos: Memo[];
  onMemoSelect: (memo: Memo) => void;
  onMemoDelete?: (memoId: string) => void;
  isLoading?: boolean;
}

const MemoList: React.FC<MemoListProps> = ({ 
  memos, 
  onMemoSelect, 
  onMemoDelete,
  isLoading = false 
}) => {
  // State for delete confirmation dialog
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    memo: Memo | null;
  }>({
    isOpen: false,
    memo: null,
  });

  // Handle memo selection
  const handleMemoClick = (memo: Memo) => {
    onMemoSelect(memo);
  };

  // Handle delete request - show confirmation dialog
  const handleDeleteRequest = (memoId: string) => {
    const memo = memos.find(m => m.id === memoId);
    if (memo) {
      setDeleteConfirmation({
        isOpen: true,
        memo: memo,
      });
    }
  };

  // Handle confirmed deletion
  const handleConfirmDelete = () => {
    if (deleteConfirmation.memo && onMemoDelete) {
      onMemoDelete(deleteConfirmation.memo.id);
    }
    setDeleteConfirmation({
      isOpen: false,
      memo: null,
    });
  };

  // Handle cancel deletion
  const handleCancelDelete = () => {
    setDeleteConfirmation({
      isOpen: false,
      memo: null,
    });
  };

  // Loading state with accessibility
  if (isLoading) {
    return (
      <div className="memo-list" role="main" aria-label="メモ一覧">
        <div className="memo-list-loading" role="status" aria-live="polite">
          <div className="loading-spinner" aria-hidden="true"></div>
          <p>メモを読み込み中...</p>
        </div>
      </div>
    );
  }

  // Empty state - display helpful message when no memos exist
  if (memos.length === 0) {
    return (
      <div className="memo-list" role="main" aria-label="メモ一覧">
        <div className="memo-list-empty" role="region" aria-labelledby="empty-state-title">
          <div className="empty-state-icon" aria-hidden="true">📝</div>
          <h2 id="empty-state-title" className="empty-state-title">メモがありません</h2>
          <p className="empty-state-message">
            「新規メモ」ボタンをクリックして、最初のメモを作成しましょう。
          </p>
        </div>
      </div>
    );
  }

  // Render memo list
  return (
    <div className="memo-list" role="main" aria-label="メモ一覧">
      <div className="memo-list-header">
        <h2 id="memo-list-title" className="memo-list-title">メモ一覧</h2>
        <span className="memo-count" aria-label={`${memos.length}件のメモ`}>
          {memos.length}件
        </span>
      </div>
      <div 
        className="memo-list-content" 
        role="list" 
        aria-labelledby="memo-list-title"
        aria-describedby="memo-count"
      >
        {memos.map((memo) => (
          <MemoItem
            key={memo.id}
            memo={memo}
            onClick={handleMemoClick}
            onDelete={onMemoDelete ? handleDeleteRequest : undefined}
          />
        ))}
      </div>
      
      {/* Delete confirmation dialog */}
      {deleteConfirmation.isOpen && deleteConfirmation.memo && (
        <div 
          className="delete-confirmation-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          aria-describedby="delete-dialog-message"
        >
          <div className="delete-confirmation-dialog">
            <h3 id="delete-dialog-title" className="delete-confirmation-title">
              メモを削除しますか？
            </h3>
            <p id="delete-dialog-message" className="delete-confirmation-message">
              「{deleteConfirmation.memo.title || '無題のメモ'}」を削除します。
              <br />
              この操作は取り消せません。
            </p>
            <div className="delete-confirmation-actions">
              <button
                className="delete-confirmation-cancel"
                onClick={handleCancelDelete}
                autoFocus
                aria-label="削除をキャンセル"
              >
                キャンセル
              </button>
              <button
                className="delete-confirmation-confirm"
                onClick={handleConfirmDelete}
                aria-label="メモを削除"
              >
                削除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemoList;