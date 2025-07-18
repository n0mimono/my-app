import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthProvider, useAuthContext } from '../AuthContext';
import { useAuth } from '../../hooks/useAuth';
import type { AuthState, AuthError } from '../../types/auth';
import { AuthErrorType } from '../../types/auth';

// useAuth フックをモック
vi.mock('../../hooks/useAuth');

const mockUseAuth = vi.mocked(useAuth);

// テスト用のコンポーネント
const TestComponent: React.FC = () => {
  const { authState, login, logout, checkAuthStatus } = useAuthContext();
  
  return (
    <div>
      <div data-testid="auth-state">
        {JSON.stringify({
          isAuthenticated: authState.isAuthenticated,
          isLoading: authState.isLoading,
          hasUser: !!authState.user,
          hasError: !!authState.error
        })}
      </div>
      <button onClick={login} data-testid="login-button">
        Login
      </button>
      <button onClick={logout} data-testid="logout-button">
        Logout
      </button>
      <button onClick={checkAuthStatus} data-testid="check-auth-button">
        Check Auth
      </button>
    </div>
  );
};

// AuthProvider の外でコンテキストを使用するテスト用コンポーネント
const TestComponentWithoutProvider: React.FC = () => {
  useAuthContext();
  return <div>Should not render</div>;
};

describe('AuthProvider', () => {
  const mockLogin = vi.fn();
  const mockLogout = vi.fn();
  const mockCheckAuthStatus = vi.fn();

  const createMockAuthState = (overrides: Partial<AuthState> = {}): AuthState => ({
    isAuthenticated: false,
    user: null,
    isLoading: false,
    error: null,
    ...overrides
  });

  beforeEach(() => {
    vi.clearAllMocks();
    
    // デフォルトのモック実装
    mockUseAuth.mockReturnValue({
      authState: createMockAuthState(),
      login: mockLogin,
      logout: mockLogout,
      checkAuthStatus: mockCheckAuthStatus,
      refreshToken: vi.fn(),
      clearError: vi.fn(),
      isAuthenticated: false,
      user: null,
      isLoading: false,
      error: null
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('プロバイダーの基本機能', () => {
    it('子コンポーネントに認証コンテキストを提供する', () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const authStateElement = screen.getByTestId('auth-state');
      expect(authStateElement).toBeInTheDocument();
      
      const authState = JSON.parse(authStateElement.textContent || '{}');
      expect(authState).toEqual({
        isAuthenticated: false,
        isLoading: false,
        hasUser: false,
        hasError: false
      });
    });

    it('認証操作関数を提供する', () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('login-button')).toBeInTheDocument();
      expect(screen.getByTestId('logout-button')).toBeInTheDocument();
      expect(screen.getByTestId('check-auth-button')).toBeInTheDocument();
    });

    it('useAuth フックから取得した関数を正しく渡す', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // ログインボタンをクリック
      screen.getByTestId('login-button').click();
      expect(mockLogin).toHaveBeenCalledTimes(1);

      // ログアウトボタンをクリック
      screen.getByTestId('logout-button').click();
      expect(mockLogout).toHaveBeenCalledTimes(1);

      // 認証状態チェックボタンをクリック
      screen.getByTestId('check-auth-button').click();
      expect(mockCheckAuthStatus).toHaveBeenCalledTimes(1);
    });
  });

  describe('認証状態の管理', () => {
    it('初期認証状態を正しく表示する', () => {
      const initialState = createMockAuthState({
        isLoading: true
      });

      mockUseAuth.mockReturnValue({
        authState: initialState,
        login: mockLogin,
        logout: mockLogout,
        checkAuthStatus: mockCheckAuthStatus,
        refreshToken: vi.fn(),
        clearError: vi.fn(),
        isAuthenticated: false,
        user: null,
        isLoading: true,
        error: null
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const authStateElement = screen.getByTestId('auth-state');
      const authState = JSON.parse(authStateElement.textContent || '{}');
      
      expect(authState.isLoading).toBe(true);
      expect(authState.isAuthenticated).toBe(false);
    });

    it('認証済み状態を正しく表示する', () => {
      const authenticatedState = createMockAuthState({
        isAuthenticated: true,
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User'
        }
      });

      mockUseAuth.mockReturnValue({
        authState: authenticatedState,
        login: mockLogin,
        logout: mockLogout,
        checkAuthStatus: mockCheckAuthStatus,
        refreshToken: vi.fn(),
        clearError: vi.fn(),
        isAuthenticated: true,
        user: authenticatedState.user,
        isLoading: false,
        error: null
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const authStateElement = screen.getByTestId('auth-state');
      const authState = JSON.parse(authStateElement.textContent || '{}');
      
      expect(authState.isAuthenticated).toBe(true);
      expect(authState.hasUser).toBe(true);
    });

    it('エラー状態を正しく表示する', () => {
      const errorState = createMockAuthState({
        error: {
          type: AuthErrorType.OAUTH_FAILED,
          message: 'ログインに失敗しました',
          retryable: true
        }
      });

      mockUseAuth.mockReturnValue({
        authState: errorState,
        login: mockLogin,
        logout: mockLogout,
        checkAuthStatus: mockCheckAuthStatus,
        refreshToken: vi.fn(),
        clearError: vi.fn(),
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: errorState.error
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const authStateElement = screen.getByTestId('auth-state');
      const authState = JSON.parse(authStateElement.textContent || '{}');
      
      expect(authState.hasError).toBe(true);
      expect(authState.isAuthenticated).toBe(false);
    });
  });

  describe('エラーハンドリング', () => {
    it('AuthProvider の外でコンテキストを使用した場合にエラーを投げる', () => {
      // コンソールエラーを一時的に無効化
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponentWithoutProvider />);
      }).toThrow('useAuthContext は AuthProvider の子コンポーネント内で使用する必要があります');

      consoleSpy.mockRestore();
    });

    it('useAuth フックがエラーを返した場合も正常に動作する', () => {
      const errorState = createMockAuthState({
        error: {
          type: AuthErrorType.CONFIG_ERROR,
          message: '設定エラーが発生しました',
          retryable: true
        }
      });

      mockUseAuth.mockReturnValue({
        authState: errorState,
        login: mockLogin,
        logout: mockLogout,
        checkAuthStatus: mockCheckAuthStatus,
        refreshToken: vi.fn(),
        clearError: vi.fn(),
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: errorState.error
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const authStateElement = screen.getByTestId('auth-state');
      expect(authStateElement).toBeInTheDocument();
      
      const authState = JSON.parse(authStateElement.textContent || '{}');
      expect(authState.hasError).toBe(true);
    });
  });

  describe('初期認証状態の確認機能', () => {
    it('AuthProvider がマウントされた時に useAuth が呼び出される', () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // useAuth フックが呼び出されることを確認
      expect(mockUseAuth).toHaveBeenCalledTimes(1);
    });

    it('認証状態の変更が子コンポーネントに反映される', async () => {
      const { rerender } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // 初期状態を確認
      let authStateElement = screen.getByTestId('auth-state');
      let authState = JSON.parse(authStateElement.textContent || '{}');
      expect(authState.isAuthenticated).toBe(false);

      // 認証状態を変更
      const authenticatedState = createMockAuthState({
        isAuthenticated: true,
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User'
        }
      });

      mockUseAuth.mockReturnValue({
        authState: authenticatedState,
        login: mockLogin,
        logout: mockLogout,
        checkAuthStatus: mockCheckAuthStatus,
        refreshToken: vi.fn(),
        clearError: vi.fn(),
        isAuthenticated: true,
        user: authenticatedState.user,
        isLoading: false,
        error: null
      });

      rerender(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // 変更後の状態を確認
      authStateElement = screen.getByTestId('auth-state');
      authState = JSON.parse(authStateElement.textContent || '{}');
      expect(authState.isAuthenticated).toBe(true);
      expect(authState.hasUser).toBe(true);
    });
  });

  describe('統合エラーハンドリング', () => {
    it('複数のエラータイプを適切に処理する', () => {
      const errorTypes = [
        AuthErrorType.OAUTH_FAILED,
        AuthErrorType.ACCESS_DENIED,
        AuthErrorType.NETWORK_ERROR,
        AuthErrorType.TOKEN_EXPIRED,
        AuthErrorType.CONFIG_ERROR
      ];

      errorTypes.forEach((errorType) => {
        const errorState = createMockAuthState({
          error: {
            type: errorType,
            message: `${errorType} エラーが発生しました`,
            retryable: errorType !== AuthErrorType.ACCESS_DENIED
          }
        });

        mockUseAuth.mockReturnValue({
          authState: errorState,
          login: mockLogin,
          logout: mockLogout,
          checkAuthStatus: mockCheckAuthStatus,
          refreshToken: vi.fn(),
          clearError: vi.fn(),
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: errorState.error
        });

        const { unmount } = render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        const authStateElement = screen.getByTestId('auth-state');
        const authState = JSON.parse(authStateElement.textContent || '{}');
        expect(authState.hasError).toBe(true);

        unmount();
      });
    });
  });
});