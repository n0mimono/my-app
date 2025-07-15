import { useState, useCallback } from 'react';
import { useMemos } from './hooks/useMemos';
import Layout from './components/Layout';
import MemoList from './components/MemoList';
import MemoEditor from './components/MemoEditor';
import ErrorNotification from './components/ErrorNotification';
import type { Memo } from './types/memo';
import { StorageErrorType } from './utils/storage';
import './App.css';
import './mobile.css';

// Application view states
type AppView = 'list' | 'editor';

function App() {
  // Application state management
  const [currentView, setCurrentView] = useState<AppView>('list');
  const [selectedMemo, setSelectedMemo] = useState<Memo | null>(null);
  
  // Memo data management
  const {
    memos,
    isLoading,
    error,
    canRecover,
    recover,
    createMemo,
    updateMemo,
    deleteMemo
  } = useMemos();

  // Error notification state
  const [showErrorNotification, setShowErrorNotification] = useState(true);

  // Handle new memo creation
  const handleNewMemo = useCallback(() => {
    const newMemo = createMemo();
    setSelectedMemo(newMemo);
    setCurrentView('editor');
  }, [createMemo]);

  // Handle memo selection from list
  const handleMemoSelect = useCallback((memo: Memo) => {
    setSelectedMemo(memo);
    setCurrentView('editor');
  }, []);

  // Handle memo content save
  const handleMemoSave = useCallback((content: string) => {
    if (selectedMemo) {
      updateMemo(selectedMemo.id, content);
      // Update the selected memo with new content for immediate UI feedback
      setSelectedMemo(prev => prev ? {
        ...prev,
        content,
        title: content.split('\n')[0].trim() || 'Untitled',
        updatedAt: new Date()
      } : null);
    }
  }, [selectedMemo, updateMemo]);

  // Handle memo deletion from editor
  const handleMemoDelete = useCallback(() => {
    if (selectedMemo) {
      deleteMemo(selectedMemo.id);
      setSelectedMemo(null);
      setCurrentView('list');
    }
  }, [selectedMemo, deleteMemo]);

  // Handle memo deletion from list
  const handleMemoDeleteFromList = useCallback((memoId: string) => {
    deleteMemo(memoId);
    // If the deleted memo was currently selected, clear selection
    if (selectedMemo && selectedMemo.id === memoId) {
      setSelectedMemo(null);
      setCurrentView('list');
    }
  }, [deleteMemo, selectedMemo]);

  // Handle back navigation from editor to list
  const handleBackToList = useCallback(() => {
    setSelectedMemo(null);
    setCurrentView('list');
  }, []);

  // Handle error recovery
  const handleErrorRecover = useCallback(async () => {
    try {
      await recover();
      setShowErrorNotification(false);
    } catch (err) {
      console.error('Recovery failed:', err);
    }
  }, [recover]);

  // Handle error notification dismiss
  const handleErrorDismiss = useCallback(() => {
    setShowErrorNotification(false);
  }, []);

  // Determine error notification type and message
  const getErrorNotificationProps = () => {
    if (!error || !showErrorNotification) return null;

    let type: 'error' | 'warning' | 'info' = 'error';
    let message = error.message;

    switch (error.type) {
      case StorageErrorType.NOT_AVAILABLE:
        type = 'warning';
        break;
      case StorageErrorType.QUOTA_EXCEEDED:
        type = 'warning';
        break;
      case StorageErrorType.INVALID_DATA:
      case StorageErrorType.PARSE_ERROR:
        type = 'error';
        break;
      default:
        type = 'error';
    }

    return { type, message };
  };

  const errorProps = getErrorNotificationProps();

  return (
    <>
      <Layout 
        onNewMemo={handleNewMemo}
        showNewMemoButton={currentView === 'list'}
      >
        {currentView === 'list' ? (
          <MemoList
            memos={memos}
            onMemoSelect={handleMemoSelect}
            onMemoDelete={handleMemoDeleteFromList}
            isLoading={isLoading}
          />
        ) : (
          <MemoEditor
            memo={selectedMemo}
            onSave={handleMemoSave}
            onDelete={handleMemoDelete}
            onBack={handleBackToList}
          />
        )}
      </Layout>
      
      {/* Error Notification */}
      {errorProps && (
        <ErrorNotification
          error={errorProps.message}
          type={errorProps.type}
          onDismiss={handleErrorDismiss}
        />
      )}
      
      {/* Recovery Button for recoverable errors */}
      {error && canRecover && showErrorNotification && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 1001
        }}>
          <button
            onClick={handleErrorRecover}
            style={{
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            復旧を試す
          </button>
        </div>
      )}
    </>
  );
}

export default App;
