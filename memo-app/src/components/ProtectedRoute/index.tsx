import React from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
import LoginPage from '../LoginPage';
import AccessDenied from '../AccessDenied';
import { AuthErrorType } from '../../types/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * 認証が必要なルートを保護するコンポーネント
 * 
 * 機能:
 * - 認証状態のチェック
 * - 未認証時のログイン画面表示
 * - アクセス拒否時の専用画面表示
 * - 認証済み時の子コンポーネント表示
 * 
 * 要件: 5.1, 5.2, 5.3, 5.5
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { authState, login } = useAuthContext();

  // ローディング中の表示
  if (authState.isLoading) {
    return (
      <div className="loading-container" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div className="loading-spinner" style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #007bff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p>認証状態を確認中...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // アクセス拒否エラーの場合はAccessDeniedコンポーネントを表示
  if (authState.error?.type === AuthErrorType.ACCESS_DENIED) {
    return (
      <AccessDenied 
        userEmail={authState.user?.email}
        onRetry={login}
      />
    );
  }

  // 未認証の場合はログイン画面を表示
  if (!authState.isAuthenticated) {
    return <LoginPage />;
  }

  // 認証済みの場合は子コンポーネントを表示
  return <>{children}</>;
};

export default ProtectedRoute;