import { useState, useEffect, useCallback } from 'react';
import { googleAuthService } from '../services/googleAuthService';
import { errorHandlingService } from '../services/errorHandlingService';
import type { AuthState, AuthError } from '../types/auth';
import { AuthErrorType } from '../types/auth';

/**
 * 認証状態管理フック
 * Google OAuth 認証の状態管理、ログイン・ログアウト機能、状態の永続化を提供
 */
export const useAuth = () => {
  // 認証状態の初期値
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: true,
    error: null
  });

  /**
   * 認証状態を更新するヘルパー関数
   */
  const updateAuthState = useCallback((updates: Partial<AuthState>) => {
    setAuthState(prevState => ({
      ...prevState,
      ...updates
    }));
  }, []);

  /**
   * エラー状態をクリアする
   */
  const clearError = useCallback(() => {
    updateAuthState({ error: null });
  }, [updateAuthState]);

  /**
   * 認証状態をチェックする
   * アプリケーション起動時や状態変更時に呼び出される
   */
  const checkAuthStatus = useCallback(async () => {
    updateAuthState({ isLoading: true, error: null });

    const result = await errorHandlingService.executeWithRetry(
      async () => {
        // Google Auth サービスを初期化（まだ初期化されていない場合）
        await googleAuthService.initialize();

        // 現在のユーザー情報を取得
        const user = await googleAuthService.getCurrentUser();
        return user;
      },
      { maxRetries: 2, delay: 1000 },
      'useAuth.checkAuthStatus'
    );

    if (result.success) {
      const user = result.data;
      if (user) {
        updateAuthState({
          isAuthenticated: true,
          user,
          isLoading: false,
          error: null
        });
      } else {
        updateAuthState({
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: null
        });
      }
    } else {
      updateAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: result.error
      });
    }
  }, [updateAuthState]);

  /**
   * ログイン処理
   */
  const login = useCallback(async () => {
    updateAuthState({ isLoading: true, error: null });

    const result = await errorHandlingService.executeWithRetry(
      async () => {
        const loginResult = await googleAuthService.login();
        if (!loginResult.success) {
          throw loginResult.error || new Error('ログインに失敗しました');
        }
        return loginResult.user;
      },
      { maxRetries: 1, delay: 1000 }, // ログインは1回のみ再試行
      'useAuth.login'
    );

    if (result.success && result.data) {
      updateAuthState({
        isAuthenticated: true,
        user: result.data,
        isLoading: false,
        error: null
      });
    } else {
      updateAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: result.error
      });
    }
  }, [updateAuthState]);

  /**
   * ログアウト処理
   */
  const logout = useCallback(async () => {
    updateAuthState({ isLoading: true, error: null });

    const result = await errorHandlingService.executeWithRetry(
      async () => {
        await googleAuthService.logout();
      },
      { maxRetries: 1, delay: 500 }, // ログアウトは軽く再試行
      'useAuth.logout'
    );

    // ログアウトは失敗してもローカル状態はクリアする
    updateAuthState({
      isAuthenticated: false,
      user: null,
      isLoading: false,
      error: result.success ? null : {
        type: AuthErrorType.NETWORK_ERROR,
        message: 'ログアウト処理でエラーが発生しましたが、ローカル認証状態はクリアされました',
        retryable: false
      }
    });
  }, [updateAuthState]);

  /**
   * トークンリフレッシュ処理
   */
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const success = await googleAuthService.refreshToken();
      
      if (success) {
        // リフレッシュ成功時は認証状態を再チェック
        await checkAuthStatus();
        return true;
      } else {
        // リフレッシュ失敗時はログアウト
        await logout();
        return false;
      }
    } catch (error) {
      console.error('トークンリフレッシュでエラーが発生しました:', error);
      await logout();
      return false;
    }
  }, [checkAuthStatus, logout]);

  /**
   * 認証状態の永続化監視
   * ローカルストレージの変更を監視して認証状態を同期
   */
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      // Google認証関連のキーが変更された場合は認証状態を再チェック
      if (event.key && (
        event.key.includes('google_access_token') ||
        event.key.includes('google_id_token') ||
        event.key.includes('google_user_info')
      )) {
        checkAuthStatus();
      }
    };

    // ストレージイベントリスナーを追加
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [checkAuthStatus]);

  /**
   * 初期認証状態チェック
   * コンポーネントマウント時に実行
   */
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  /**
   * トークン有効期限の監視
   * 定期的にトークンの有効性をチェックし、必要に応じてリフレッシュ
   */
  useEffect(() => {
    if (!authState.isAuthenticated) {
      return;
    }

    const checkTokenValidity = async () => {
      try {
        const isValid = await googleAuthService.isTokenValid();
        
        if (!isValid) {
          // トークンが無効な場合はリフレッシュを試行
          const refreshed = await refreshToken();
          
          if (!refreshed) {
            console.log('トークンリフレッシュに失敗しました。再ログインが必要です。');
          }
        }
      } catch (error) {
        console.error('トークン有効性チェックでエラーが発生しました:', error);
      }
    };

    // 5分ごとにトークンの有効性をチェック
    const interval = setInterval(checkTokenValidity, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, [authState.isAuthenticated, refreshToken]);

  return {
    // 認証状態
    authState,
    
    // 認証操作
    login,
    logout,
    checkAuthStatus,
    refreshToken,
    
    // ユーティリティ
    clearError,
    
    // 便利なプロパティ
    isAuthenticated: authState.isAuthenticated,
    user: authState.user,
    isLoading: authState.isLoading,
    error: authState.error
  };
};

export default useAuth;