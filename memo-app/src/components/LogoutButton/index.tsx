import React from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
import './LogoutButton.css';

/**
 * LogoutButton コンポーネントのプロパティ
 */
interface LogoutButtonProps {
  /** ボタンのスタイルバリアント */
  variant?: 'primary' | 'secondary' | 'text';
  /** ボタンのサイズ */
  size?: 'small' | 'medium' | 'large';
  /** カスタムクラス名 */
  className?: string;
  /** ログアウト完了時のコールバック */
  onLogoutComplete?: () => void;
  /** ボタンのテキスト */
  children?: React.ReactNode;
}

/**
 * ログアウトボタンコンポーネント
 * 
 * 機能:
 * - ローカル認証状態のクリア
 * - Google セッション取り消し
 * - ログアウト処理中の状態表示
 * - エラーハンドリング
 * 
 * 要件: 3.1, 3.2, 3.3, 3.4
 */
export const LogoutButton: React.FC<LogoutButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  className = '',
  onLogoutComplete,
  children = 'ログアウト'
}) => {
  const { authState, logout } = useAuthContext();

  /**
   * ログアウト処理を実行
   */
  const handleLogout = async () => {
    try {
      await logout();
      
      // ログアウト完了コールバックを実行
      if (onLogoutComplete) {
        onLogoutComplete();
      }
    } catch (error) {
      console.error('ログアウト処理でエラーが発生しました:', error);
      // エラーが発生してもコールバックは実行（ローカル状態はクリアされているため）
      if (onLogoutComplete) {
        onLogoutComplete();
      }
    }
  };

  // 認証されていない場合は何も表示しない
  if (!authState.isAuthenticated) {
    return null;
  }

  const buttonClasses = [
    'logout-button',
    `logout-button--${variant}`,
    `logout-button--${size}`,
    authState.isLoading ? 'logout-button--loading' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      className={buttonClasses}
      onClick={handleLogout}
      disabled={authState.isLoading}
      aria-label="ログアウト"
    >
      {authState.isLoading ? (
        <>
          <span className="logout-button__spinner" aria-hidden="true" />
          <span>ログアウト中...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default LogoutButton;