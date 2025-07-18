import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ProtectedRoute from './index';
import { AuthProvider } from '../../contexts/AuthContext';
import { AuthErrorType } from '../../types/auth';
import type { AuthState } from '../../types/auth';

// Mock the useAuth hook
const mockUseAuth = vi.fn();
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth()
}));

// Mock the LoginPage component
vi.mock('../LoginPage', () => ({
  default: () => <div data-testid="login-page">Login Page</div>
}));

// Mock the AccessDenied component
vi.mock('../AccessDenied', () => ({
  default: ({ userEmail, onRetry }: { userEmail?: string; onRetry?: () => void }) => (
    <div data-testid="access-denied">
      <span>Access Denied</span>
      {userEmail && <span data-testid="user-email">{userEmail}</span>}
      {onRetry && <button onClick={onRetry} data-testid="retry-button">Retry</button>}
    </div>
  )
}));

const TestChild = () => <div data-testid="protected-content">Protected Content</div>;

const renderProtectedRoute = (authState: Partial<AuthState>) => {
  const mockLogin = vi.fn();
  const mockLogout = vi.fn();
  const mockCheckAuthStatus = vi.fn();

  mockUseAuth.mockReturnValue({
    authState: {
      isAuthenticated: false,
      user: null,
      isLoading: false,
      error: null,
      ...authState
    },
    login: mockLogin,
    logout: mockLogout,
    checkAuthStatus: mockCheckAuthStatus
  });

  return render(
    <AuthProvider>
      <ProtectedRoute>
        <TestChild />
      </ProtectedRoute>
    </AuthProvider>
  );
};

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('認証状態に基づく画面遷移', () => {
    it('ローディング中はローディング画面を表示する', () => {
      renderProtectedRoute({ isLoading: true });
      
      expect(screen.getByText('認証状態を確認中...')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
      expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
    });

    it('未認証時はログイン画面を表示する', () => {
      renderProtectedRoute({ 
        isAuthenticated: false,
        isLoading: false 
      });
      
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('認証済み時は保護されたコンテンツを表示する', () => {
      renderProtectedRoute({ 
        isAuthenticated: true,
        isLoading: false,
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User'
        }
      });
      
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
      expect(screen.queryByTestId('access-denied')).not.toBeInTheDocument();
    });

    it('アクセス拒否エラー時はアクセス拒否画面を表示する', () => {
      renderProtectedRoute({ 
        isAuthenticated: false,
        isLoading: false,
        user: {
          id: '1',
          email: 'unauthorized@example.com',
          name: 'Unauthorized User'
        },
        error: {
          type: AuthErrorType.ACCESS_DENIED,
          message: 'Access denied',
          retryable: true
        }
      });
      
      expect(screen.getByTestId('access-denied')).toBeInTheDocument();
      expect(screen.getByTestId('user-email')).toHaveTextContent('unauthorized@example.com');
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
      expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
    });

    it('アクセス拒否画面で再試行ボタンが機能する', () => {
      const mockLogin = vi.fn();
      mockUseAuth.mockReturnValue({
        authState: {
          isAuthenticated: false,
          user: {
            id: '1',
            email: 'unauthorized@example.com',
            name: 'Unauthorized User'
          },
          isLoading: false,
          error: {
            type: AuthErrorType.ACCESS_DENIED,
            message: 'Access denied',
            retryable: true
          }
        },
        login: mockLogin,
        logout: vi.fn(),
        checkAuthStatus: vi.fn()
      });

      render(
        <AuthProvider>
          <ProtectedRoute>
            <TestChild />
          </ProtectedRoute>
        </AuthProvider>
      );
      
      const retryButton = screen.getByTestId('retry-button');
      retryButton.click();
      
      expect(mockLogin).toHaveBeenCalledTimes(1);
    });
  });

  describe('エラーハンドリング', () => {
    it('OAuth失敗エラー時はログイン画面を表示する', () => {
      renderProtectedRoute({ 
        isAuthenticated: false,
        isLoading: false,
        error: {
          type: AuthErrorType.OAUTH_FAILED,
          message: 'OAuth failed',
          retryable: true
        }
      });
      
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
      expect(screen.queryByTestId('access-denied')).not.toBeInTheDocument();
    });

    it('ネットワークエラー時はログイン画面を表示する', () => {
      renderProtectedRoute({ 
        isAuthenticated: false,
        isLoading: false,
        error: {
          type: AuthErrorType.NETWORK_ERROR,
          message: 'Network error',
          retryable: true
        }
      });
      
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
      expect(screen.queryByTestId('access-denied')).not.toBeInTheDocument();
    });

    it('設定エラー時はログイン画面を表示する', () => {
      renderProtectedRoute({ 
        isAuthenticated: false,
        isLoading: false,
        error: {
          type: AuthErrorType.CONFIG_ERROR,
          message: 'Config error',
          retryable: true
        }
      });
      
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
      expect(screen.queryByTestId('access-denied')).not.toBeInTheDocument();
    });
  });

  describe('要件の検証', () => {
    it('要件5.1: 未認証のユーザーがメモ帳画面にアクセスした時、ログイン画面にリダイレクトする', () => {
      renderProtectedRoute({ 
        isAuthenticated: false,
        isLoading: false 
      });
      
      // メモ帳画面（保護されたコンテンツ）は表示されない
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
      // ログイン画面が表示される
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });

    it('要件5.2: 認証済みのユーザーがアクセスした時、メモ帳画面を表示する', () => {
      renderProtectedRoute({ 
        isAuthenticated: true,
        isLoading: false,
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User'
        }
      });
      
      // メモ帳画面（保護されたコンテンツ）が表示される
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      // ログイン画面は表示されない
      expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
    });

    it('要件5.3: ログイン成功時にメモ帳画面に遷移する', async () => {
      // 最初は未認証状態
      const { rerender } = renderProtectedRoute({ 
        isAuthenticated: false,
        isLoading: false 
      });
      
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
      
      // 認証成功後の状態に更新
      mockUseAuth.mockReturnValue({
        authState: {
          isAuthenticated: true,
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User'
          },
          isLoading: false,
          error: null
        },
        login: vi.fn(),
        logout: vi.fn(),
        checkAuthStatus: vi.fn()
      });

      rerender(
        <AuthProvider>
          <ProtectedRoute>
            <TestChild />
          </ProtectedRoute>
        </AuthProvider>
      );
      
      // メモ帳画面が表示される
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
    });

    it('要件5.5: ユーザーがログアウトした時、ログイン画面に遷移する', async () => {
      // 最初は認証済み状態
      const { rerender } = renderProtectedRoute({ 
        isAuthenticated: true,
        isLoading: false,
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User'
        }
      });
      
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      
      // ログアウト後の状態に更新
      mockUseAuth.mockReturnValue({
        authState: {
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: null
        },
        login: vi.fn(),
        logout: vi.fn(),
        checkAuthStatus: vi.fn()
      });

      rerender(
        <AuthProvider>
          <ProtectedRoute>
            <TestChild />
          </ProtectedRoute>
        </AuthProvider>
      );
      
      // ログイン画面が表示される
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
  });
});