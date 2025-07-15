import React from 'react';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
  onNewMemo?: () => void;
  showNewMemoButton?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  onNewMemo, 
  showNewMemoButton = true 
}) => {
  return (
    <div className="layout" role="application" aria-label="メモ帳アプリケーション">
      <header className="layout-header" role="banner">
        <h1 className="layout-title" id="app-title">メモ帳</h1>
        {showNewMemoButton && (
          <button 
            className="new-memo-button"
            onClick={onNewMemo}
            aria-label="新規メモを作成"
            type="button"
          >
            <span aria-hidden="true">+</span> 新規メモ
          </button>
        )}
      </header>
      <main className="layout-main" role="main" aria-labelledby="app-title">
        {children}
      </main>
    </div>
  );
};

export default Layout;