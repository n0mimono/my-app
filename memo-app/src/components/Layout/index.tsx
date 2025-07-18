import React from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
import LogoutButton from '../LogoutButton';
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
  const { authState } = useAuthContext();

  return (
    <div className="layout" role="application" aria-label="メモ帳アプリケーション">
      <header className="layout-header" role="banner">
        <div className="layout-header-left">
          <h1 className="layout-title" id="app-title">メモ帳</h1>
        </div>
        
        <div className="layout-header-center">
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
        </div>

        <div className="layout-header-right">
          {authState.isAuthenticated && authState.user && (
            <div className="user-info">
              {authState.user.picture && (
                <img 
                  src={authState.user.picture} 
                  alt={`${authState.user.name}のプロフィール画像`}
                  className="user-avatar"
                />
              )}
              <div className="user-details">
                <span className="user-name">{authState.user.name}</span>
                <span className="user-email">{authState.user.email}</span>
              </div>
            </div>
          )}
          <LogoutButton 
            variant="secondary" 
            size="small"
            className="layout-logout-button"
          />
        </div>
      </header>
      <main className="layout-main" role="main" aria-labelledby="app-title">
        {children}
      </main>
    </div>
  );
};

export default Layout;