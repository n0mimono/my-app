import React from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
import type { AuthError } from '../../types/auth';
import { AuthErrorType } from '../../types/auth';
import './LoginPage.css';

/**
 * ログイン画面コンポーネント
 * Google OAuth を使用したログイン機能を提供
 * 
 * 機能:
 * - Google ログインボタンの表示
 * - エラーメッセージの表示
 * - 認証済みユーザーの自動リダイレクト
 * 
 * 要件: 1.1, 1.2, 2.5, 6.1, 6.2
 */
const LoginPage: React.FC = () => {
  const { authState, login } = useAuthContext();

  /**
   * ログインボタンクリック時の処理
   */
  const handleLogin = async () => {
    try {
      await login();
    } catch (error) {
      console.error('ログイン処理でエラーが発生しました:', error);
    }
  };

  /**
   * エラーメッセージを取得する
   * @param error 認証エラー
   * @returns ユーザーフレンドリーなエラーメッセージ
   */
  const getErrorMessage = (error: AuthError): string => {
    switch (error.type) {
      case AuthErrorType.OAUTH_FAILED:
        return 'Googleログインに失敗しました。もう一度お試しください。';
      case AuthErrorType.ACCESS_DENIED:
        return 'アクセスが拒否されました。このアプリケーションを使用する権限がありません。';
      case AuthErrorType.NETWORK_ERROR:
        return 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
      case AuthErrorType.CONFIG_ERROR:
        return 'システム設定エラーが発生しました。管理者にお問い合わせください。';
      default:
        return error.message || 'ログインに失敗しました。';
    }
  };

  /**
   * 再試行ボタンの表示判定
   * @param error 認証エラー
   * @returns 再試行可能かどうか
   */
  const canRetry = (error: AuthError): boolean => {
    return error.retryable;
  };

  return (
    <div className="login-page" role="main" aria-labelledby="login-title">
      <div className="login-container">
        <div className="login-header">
          <h1 id="login-title" className="login-title">
            メモ帳
          </h1>
          <p className="login-subtitle">
            Googleアカウントでログインしてください
          </p>
        </div>

        <div className="login-content">
          {/* エラーメッセージ表示 */}
          {authState.error && (
            <div 
              className={`login-error ${authState.error.type === AuthErrorType.ACCESS_DENIED ? 'login-error--access-denied' : ''}`}
              role="alert"
              aria-live="polite"
            >
              <div className="login-error-message">
                {getErrorMessage(authState.error)}
              </div>
              {authState.error.type === AuthErrorType.ACCESS_DENIED && (
                <div className="login-error-details">
                  管理者に連絡して、アクセス許可を依頼してください。
                </div>
              )}
            </div>
          )}

          {/* ログインボタン */}
          <button
            className="google-login-button"
            onClick={handleLogin}
            disabled={authState.isLoading}
            aria-label="Googleアカウントでログイン"
            type="button"
          >
            {authState.isLoading ? (
              <>
                <div className="login-spinner" aria-hidden="true"></div>
                <span>ログイン中...</span>
              </>
            ) : (
              <>
                <svg 
                  className="google-icon" 
                  viewBox="0 0 24 24" 
                  aria-hidden="true"
                  width="20" 
                  height="20"
                >
                  <path 
                    fill="#4285F4" 
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path 
                    fill="#34A853" 
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path 
                    fill="#FBBC05" 
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path 
                    fill="#EA4335" 
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Googleでログイン</span>
              </>
            )}
          </button>

          {/* 再試行ボタン */}
          {authState.error && canRetry(authState.error) && !authState.isLoading && (
            <button
              className="retry-button"
              onClick={handleLogin}
              aria-label="ログインを再試行"
              type="button"
            >
              再試行
            </button>
          )}
        </div>

        <div className="login-footer">
          <p className="login-disclaimer">
            このアプリケーションは承認されたユーザーのみが利用できます。
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;