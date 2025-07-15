import React from 'react';
import type { Memo } from '../../types/memo';
import './MemoItem.css';

interface MemoItemProps {
  memo: Memo;
  onClick: (memo: Memo) => void;
  onDelete?: (memoId: string) => void;
}

const MemoItem: React.FC<MemoItemProps> = ({ memo, onClick, onDelete }) => {
  // Extract title from content (first line)
  const getTitle = (content: string): string => {
    const firstLine = content.split('\n')[0].trim();
    return firstLine || '無題のメモ';
  };

  // Format date for display
  const formatDate = (date: Date): string => {
    const now = new Date();
    const memoDate = new Date(date);
    
    // Check if it's today
    if (memoDate.toDateString() === now.toDateString()) {
      return memoDate.toLocaleTimeString('ja-JP', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
    
    // Check if it's this year
    if (memoDate.getFullYear() === now.getFullYear()) {
      return memoDate.toLocaleDateString('ja-JP', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
    
    // Different year
    return memoDate.toLocaleDateString('ja-JP', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const handleClick = () => {
    onClick(memo);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick(memo);
    }
  };

  const handleDelete = (event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering the memo click
    if (onDelete) {
      onDelete(memo.id);
    }
  };

  const handleDeleteKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      if (onDelete) {
        onDelete(memo.id);
      }
    }
  };

  const title = getTitle(memo.content);
  const formattedDate = formatDate(memo.createdAt);

  return (
    <div 
      className="memo-item"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="listitem"
      aria-label={`メモを開く: ${title}, 作成日時: ${formattedDate}`}
    >
      <div className="memo-item-content">
        <h3 className="memo-item-title" aria-label={`タイトル: ${title}`}>
          {title}
        </h3>
        <p className="memo-item-date" aria-label={`作成日時: ${formattedDate}`}>
          <time dateTime={memo.createdAt.toISOString()}>
            {formattedDate}
          </time>
        </p>
      </div>
      {onDelete && (
        <button
          className="memo-item-delete"
          onClick={handleDelete}
          onKeyDown={handleDeleteKeyDown}
          aria-label={`メモを削除: ${title}`}
          title="メモを削除"
          type="button"
        >
          <span aria-hidden="true">🗑️</span>
        </button>
      )}
    </div>
  );
};

export default MemoItem;