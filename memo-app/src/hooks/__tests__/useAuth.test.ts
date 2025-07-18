import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useAuth } from '../useAuth';
import { googleAuthService } from '../../services/googleAuthService';
import { errorHandlingService } from '../../services/errorHandlingService';
import { AuthErrorType } from '../../types/auth';
import type { User, LoginResult, AuthError } from '../../types/auth';

// Google Auth Service をモック
vi.mock('../../services/googleAuthService', () => ({
  googleAuthService: {
    initialize: vi.fn(),
    getCurrentUser: vi.fn(),
    isTokenValid: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    refreshToken: vi.fn(),
  }
}));

// Error Handling Service をモック
vi.mock('../../services/errorHandlingService', () => ({
  errorHandlingService: {
    executeWithRetry: vi.fn(),
    handleError: vi.fn(),
  }
}));

const mockGoogleAuthService = googleAuthService as any;
const mockErrorHandlingService = errorHandlingService as any;

describe('useAuth', () => {
  const mockUser: User = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    picture: 'https://example.com/avatar.jpg'
  };

  const mockAuthError: AuthError = {
    type: AuthErrorType.NETWORK_ERROR,
    message: 'Network error occurred',
    retryable: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // デフォルトのモック設定
    mockGoogleAuthService.initialize.mockResolvedValue(undefined);
    mockGoogleAuthService.getCurrentUser.mockResolvedValue(null);
    mockGoogleAuthService.isTokenValid.mockResolvedValue(false);
    mockGoogleAuthService.login.mockResolvedValue({ success: false });
    mockGoogleAuthService.logout.mockResolvedValue(undefined);
    mockGoogleAuthService.refreshToken.mockResolvedValue(false);

    // Error Handling Service のデフォルトモック設定
    mockErrorHandlingService.executeWithRetry.mockImplementation(async (operation) => {
      try {
        const result = await operation();
        return { success: true, data: result, retryCount: 0 };
      } catch (error) {
        return { success: false, error: mockAuthError, retryCount: 0 };
      }
    });
    mockErrorHandlingService.handleError.mockReturnValue(mockAuthError);
  });

  describe('基本機能', () => {
    it('初期状態が正しく設定される', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.authState.isAuthenticated).toBe(false);
      expect(result.current.authState.user).toBe(null);
      expect(result.current.authState.isLoading).toBe(true);
      expect(result.current.authState.error).toBe(null);
    });

    it('フックが必要な関数を提供する', () => {
      const { result } = renderHook(() => useAuth());
      
      expect(typeof result.current.login).toBe('function');
      expect(typeof result.current.logout).toBe('function');
      expect(typeof result.current.checkAuthStatus).toBe('function');
      expect(typeof result.current.refreshToken).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
    });

    it('便利なプロパティが正しく提供される', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.isAuthenticated).toBe(result.current.authState.isAuthenticated);
      expect(result.current.user).toBe(result.current.authState.user);
      expect(result.current.isLoading).toBe(result.current.authState.isLoading);
      expect(result.current.error).toBe(result.current.authState.error);
    });

    it('認証状態チェックを手動で実行できる', async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.checkAuthStatus();
      });

      expect(mockGoogleAuthService.initialize).toHaveBeenCalled();
      expect(mockGoogleAuthService.getCurrentUser).toHaveBeenCalled();
    });

    it('ログアウト機能が動作する', async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.logout();
      });

      expect(mockGoogleAuthService.logout).toHaveBeenCalled();
    });

    it('トークンリフレッシュ機能が動作する', async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.refreshToken();
      });

      expect(mockGoogleAuthService.refreshToken).toHaveBeenCalled();
    });

    it('エラークリア機能が動作する', () => {
      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.clearError();
      });

      expect(result.current.authState.error).toBe(null);
    });
  });

  describe('エラーハンドリング統合', () => {
    it('checkAuthStatus でエラーハンドリングサービスを使用する', async () => {
      mockErrorHandlingService.executeWithRetry.mockResolvedValue({
        success: true,
        data: mockUser,
        retryCount: 0
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.checkAuthStatus();
      });

      expect(mockErrorHandlingService.executeWithRetry).toHaveBeenCalledWith(
        expect.any(Function),
        { maxRetries: 2, delay: 1000 },
        'useAuth.checkAuthStatus'
      );
      expect(result.current.authState.isAuthenticated).toBe(true);
      expect(result.current.authState.user).toEqual(mockUser);
    });

    it('checkAuthStatus でエラーが発生した場合の処理', async () => {
      mockErrorHandlingService.executeWithRetry.mockResolvedValue({
        success: false,
        error: mockAuthError,
        retryCount: 2
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.checkAuthStatus();
      });

      expect(result.current.authState.isAuthenticated).toBe(false);
      expect(result.current.authState.user).toBe(null);
      expect(result.current.authState.error).toEqual(mockAuthError);
      expect(result.current.authState.isLoading).toBe(false);
    });

    it('login でエラーハンドリングサービスを使用する', async () => {
      const successResult: LoginResult = {
        success: true,
        user: mockUser
      };

      mockGoogleAuthService.login.mockResolvedValue(successResult);
      mockErrorHandlingService.executeWithRetry.mockResolvedValue({
        success: true,
        data: mockUser,
        retryCount: 0
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login();
      });

      expect(mockErrorHandlingService.executeWithRetry).toHaveBeenCalledWith(
        expect.any(Function),
        { maxRetries: 1, delay: 1000 },
        'useAuth.login'
      );
      expect(result.current.authState.isAuthenticated).toBe(true);
      expect(result.current.authState.user).toEqual(mockUser);
    });

    it('login でエラーが発生した場合の処理', async () => {
      const failureResult: LoginResult = {
        success: false,
        error: mockAuthError
      };

      mockGoogleAuthService.login.mockResolvedValue(failureResult);
      mockErrorHandlingService.executeWithRetry.mockResolvedValue({
        success: false,
        error: mockAuthError,
        retryCount: 1
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login();
      });

      expect(result.current.authState.isAuthenticated).toBe(false);
      expect(result.current.authState.user).toBe(null);
      expect(result.current.authState.error).toEqual(mockAuthError);
      expect(result.current.authState.isLoading).toBe(false);
    });

    it('logout でエラーハンドリングサービスを使用する', async () => {
      mockErrorHandlingService.executeWithRetry.mockResolvedValue({
        success: true,
        data: undefined,
        retryCount: 0
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.logout();
      });

      expect(mockErrorHandlingService.executeWithRetry).toHaveBeenCalledWith(
        expect.any(Function),
        { maxRetries: 1, delay: 500 },
        'useAuth.logout'
      );
      expect(result.current.authState.isAuthenticated).toBe(false);
      expect(result.current.authState.user).toBe(null);
      expect(result.current.authState.error).toBe(null);
    });

    it('logout でエラーが発生してもローカル状態をクリアする', async () => {
      mockErrorHandlingService.executeWithRetry.mockResolvedValue({
        success: false,
        error: mockAuthError,
        retryCount: 1
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.authState.isAuthenticated).toBe(false);
      expect(result.current.authState.user).toBe(null);
      expect(result.current.authState.error).toEqual({
        type: AuthErrorType.NETWORK_ERROR,
        message: 'ログアウト処理でエラーが発生しましたが、ローカル認証状態はクリアされました',
        retryable: false
      });
    });

    it('再試行機能が正しく動作する', async () => {
      let callCount = 0;
      mockErrorHandlingService.executeWithRetry.mockImplementation(async (operation, config, context) => {
        callCount++;
        if (callCount <= 2) {
          // 最初の2回の呼び出しは失敗（初期化時とマニュアル呼び出し時）
          return {
            success: false,
            error: mockAuthError,
            retryCount: 2
          };
        } else {
          // 3回目の呼び出しは成功
          return {
            success: true,
            data: mockUser,
            retryCount: 1
          };
        }
      });

      const { result } = renderHook(() => useAuth());

      // 初期化が完了するまで待機
      await act(async () => {
        // 初期化時のcheckAuthStatusが完了するまで待機
      });

      expect(result.current.authState.error).toEqual(mockAuthError);
      expect(result.current.authState.isAuthenticated).toBe(false);

      // 手動でcheckAuthStatusを呼び出し（これも失敗）
      await act(async () => {
        await result.current.checkAuthStatus();
      });

      expect(result.current.authState.error).toEqual(mockAuthError);

      // 3回目の checkAuthStatus は成功
      await act(async () => {
        await result.current.checkAuthStatus();
      });

      expect(result.current.authState.isAuthenticated).toBe(true);
      expect(result.current.authState.user).toEqual(mockUser);
      expect(result.current.authState.error).toBe(null);
    });

    it('ネットワークエラーを適切に処理する', async () => {
      const networkError: AuthError = {
        type: AuthErrorType.NETWORK_ERROR,
        message: 'ネットワークエラーが発生しました',
        retryable: true
      };

      mockErrorHandlingService.executeWithRetry.mockResolvedValue({
        success: false,
        error: networkError,
        retryCount: 2
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.checkAuthStatus();
      });

      expect(result.current.authState.error).toEqual(networkError);
      expect(result.current.authState.isAuthenticated).toBe(false);
    });

    it('設定エラーを適切に処理する', async () => {
      const configError: AuthError = {
        type: AuthErrorType.CONFIG_ERROR,
        message: 'システム設定エラーが発生しました',
        retryable: false
      };

      mockErrorHandlingService.executeWithRetry.mockResolvedValue({
        success: false,
        error: configError,
        retryCount: 0
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.checkAuthStatus();
      });

      expect(result.current.authState.error).toEqual(configError);
      expect(result.current.authState.isAuthenticated).toBe(false);
    });

    it('アクセス拒否エラーを適切に処理する', async () => {
      const accessDeniedError: AuthError = {
        type: AuthErrorType.ACCESS_DENIED,
        message: 'アクセスが拒否されました',
        retryable: false
      };

      mockErrorHandlingService.executeWithRetry.mockResolvedValue({
        success: false,
        error: accessDeniedError,
        retryCount: 0
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login();
      });

      expect(result.current.authState.error).toEqual(accessDeniedError);
      expect(result.current.authState.isAuthenticated).toBe(false);
    });
  });
});