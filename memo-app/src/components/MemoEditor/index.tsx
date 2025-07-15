import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Memo } from '../../types/memo';
import './MemoEditor.css';

interface MemoEditorProps {
  memo: Memo | null;
  onSave: (content: string) => void;
  onDelete: () => void;
  onBack: () => void;
  autoSaveDelay?: number; // Delay in milliseconds for auto-save debouncing
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export const MemoEditor: React.FC<MemoEditorProps> = ({
  memo,
  onSave,
  onDelete,
  onBack,
  autoSaveDelay = 500 // Default 500ms delay for better responsiveness
}) => {
  const [content, setContent] = useState(memo?.content || '');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Refs for debouncing
  const autoSaveTimeoutRef = useRef<number | null>(null);
  const lastSavedContentRef = useRef(memo?.content || '');

  // Update content when memo changes
  useEffect(() => {
    const newContent = memo?.content || '';
    setContent(newContent);
    lastSavedContentRef.current = newContent;
    setHasUnsavedChanges(false);
    setSaveStatus('idle');
  }, [memo]);

  // Auto-save function with error handling
  const performAutoSave = useCallback(async (contentToSave: string) => {
    if (contentToSave === lastSavedContentRef.current) {
      return; // No changes to save
    }

    try {
      setSaveStatus('saving');
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate async operation
      onSave(contentToSave);
      lastSavedContentRef.current = contentToSave;
      setHasUnsavedChanges(false);
      setSaveStatus('saved');
      
      // Clear saved status after 2 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    } catch (error) {
      console.error('Auto-save failed:', error);
      setSaveStatus('error');
      
      // Clear error status after 3 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    }
  }, [onSave]);

  // Debounced auto-save effect
  useEffect(() => {
    if (content !== lastSavedContentRef.current) {
      setHasUnsavedChanges(true);
      
      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      // Set new timeout for auto-save
      autoSaveTimeoutRef.current = setTimeout(() => {
        performAutoSave(content);
      }, autoSaveDelay);
    }

    // Cleanup timeout on unmount
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [content, autoSaveDelay, performAutoSave]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
  };

  const handleSave = () => {
    onSave(content);
  };

  const handleDelete = () => {
    if (window.confirm('このメモを削除しますか？')) {
      onDelete();
    }
  };

  return (
    <div className="memo-editor">
      <div className="memo-editor__header">
        <button 
          className="memo-editor__button memo-editor__button--back"
          onClick={onBack}
          aria-label="戻る"
        >
          ← 戻る
        </button>
        
        <div className="memo-editor__status-and-actions">
          {/* Auto-save status indicator */}
          <div className="memo-editor__status" role="status" aria-live="polite">
            {saveStatus === 'saving' && (
              <span className="memo-editor__status-text memo-editor__status-text--saving">
                <span aria-hidden="true">⏳</span> 保存中...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="memo-editor__status-text memo-editor__status-text--saved">
                <span aria-hidden="true">✓</span> 保存済み
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="memo-editor__status-text memo-editor__status-text--error">
                <span aria-hidden="true">⚠</span> 保存エラー
              </span>
            )}
            {hasUnsavedChanges && saveStatus === 'idle' && (
              <span className="memo-editor__status-text memo-editor__status-text--unsaved">
                <span aria-hidden="true">●</span> 未保存の変更
              </span>
            )}
          </div>
          
          <div className="memo-editor__actions">
            <button 
              className="memo-editor__button memo-editor__button--save"
              onClick={handleSave}
              aria-label="保存"
              disabled={saveStatus === 'saving'}
            >
              {saveStatus === 'saving' ? '保存中...' : '保存'}
            </button>
            
            {memo && (
              <button 
                className="memo-editor__button memo-editor__button--delete"
                onClick={handleDelete}
                aria-label="削除"
                disabled={saveStatus === 'saving'}
              >
                削除
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="memo-editor__content">
        <textarea
          className="memo-editor__textarea"
          value={content}
          onChange={handleContentChange}
          placeholder="メモを入力してください..."
          autoFocus
          aria-label="メモ内容"
        />
      </div>
    </div>
  );
};

export default MemoEditor;