import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import LoginPage from './index';
import { AuthProvider } from '../../contexts/AuthContext';
import type { AuthState, AuthError } from '../../types/auth';
import { AuthErrorType } from '../../types/auth';

// useAuth フックのモック
const mockLogin = vi.fn();
const mockLogout = vi.fn();
const mockCheckAuthStatus = vi.fn();

const mockAuthState: AuthState = {
  isAuthenticated: false,
  user: null,
  isLoading: false,
  error: null
};

// AuthContext のモック
vi.mock('../../contexts/AuthContext', async () => {
  const actual = await vi.importActual('../../contexts/AuthContext');
  return {
    ...actual,
    useAuthContext: () => ({
      authState: mockAuthState,
      login: mockLogin,
      logout: mockLogout,
      checkAuthStatus: mockCheckAuthStatus
    })
  };
});

// テスト用のラッパーコンポーネント
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div>{children}</div>;
};

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルトの認証状態をリセット
    Object.assign(mockAuthState, {
      isAuthenticated: false,
      user: null,
      isLoading: false,
      error: null
    });
  });

  describe('基本的な表示', () => {
    it('ログイン画面が正しく表示される', () => {
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      // タイトルとサブタイトルの確認
      expect(screen.getByRole('heading', { name: 'メモ帳' })).toBeInTheDocument();
      expect(screen.getByText('Googleアカウントでログインしてください')).toBeInTheDocument();

      // ログインボタンの確認
      expect(screen.getByRole('button', { name: 'Googleアカウントでログイン' })).toBeInTheDocument();

      // 免責事項の確認
      expect(screen.getByText('このアプリケーションは承認されたユーザーのみが利用できます。')).toBeInTheDocument();
    });

    it('Googleアイコンが表示される', () => {
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const googleIcon = screen.getByRole('button', { name: 'Googleアカウントでログイン' })
        .querySelector('.google-icon');
      expect(googleIcon).toBeInTheDocument();
    });
  });

  describe('ログイン機能', () => {
    it('ログインボタンをクリックするとlogin関数が呼ばれる', async () => {
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const loginButton = screen.getByRole('button', { name: 'Googleアカウントでログイン' });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledTimes(1);
      });
    });

    it('ローディング中はボタンが無効化され、ローディング表示になる', () => {
      // ローディング状態に設定
      Object.assign(mockAuthState, { isLoading: true });

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const loginButton = screen.getByRole('button', { name: 'Googleアカウントでログイン' });
      
      // ボタンが無効化されている
      expect(loginButton).toBeDisabled();
      
      // ローディングテキストが表示されている
      expect(screen.getByText('ログイン中...')).toBeInTheDocument();
      
      // スピナーが表示されている
      expect(loginButton.querySelector('.login-spinner')).toBeInTheDocument();
    });
  });

  describe('エラー表示', () => {
    it('OAuth失敗エラーが正しく表示される', () => {
      const error: AuthError = {
        type: AuthErrorType.OAUTH_FAILED,
        message: 'OAuth failed',
        retryable: true
      };
      Object.assign(mockAuthState, { error });

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Googleログインに失敗しました。もう一度お試しください。')).toBeInTheDocument();
    });

    it('アクセス拒否エラーが正しく表示される', () => {
      const error: AuthError = {
        type: AuthErrorType.ACCESS_DENIED,
        message: 'Access denied',
        retryable: false
      };
      Object.assign(mockAuthState, { error });

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('アクセスが拒否されました。このアプリケーションを使用する権限がありません。')).toBeInTheDocument();
      expect(screen.getByText('管理者に連絡して、アクセス許可を依頼してください。')).toBeInTheDocument();
    });

    it('ネットワークエラーが正しく表示される', () => {
      const error: AuthError = {
        type: AuthErrorType.NETWORK_ERROR,
        message: 'Network error',
        retryable: true
      };
      Object.assign(mockAuthState, { error });

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      expect(screen.getByText('ネットワークエラーが発生しました。インターネット接続を確認してください。')).toBeInTheDocument();
    });

    it('設定エラーが正しく表示される', () => {
      const error: AuthError = {
        type: AuthErrorType.CONFIG_ERROR,
        message: 'Config error',
        retryable: true
      };
      Object.assign(mockAuthState, { error });

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      expect(screen.getByText('システム設定エラーが発生しました。管理者にお問い合わせください。')).toBeInTheDocument();
    });

    it('不明なエラーが正しく表示される', () => {
      const error: AuthError = {
        type: 'UNKNOWN_ERROR' as AuthErrorType,
        message: 'Unknown error occurred',
        retryable: true
      };
      Object.assign(mockAuthState, { error });

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      expect(screen.getByText('Unknown error occurred')).toBeInTheDocument();
    });

    it('エラーメッセージがない場合のデフォルトメッセージ', () => {
      const error: AuthError = {
        type: 'UNKNOWN_ERROR' as AuthErrorType,
        message: '',
        retryable: true
      };
      Object.assign(mockAuthState, { error });

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      expect(screen.getByText('ログインに失敗しました。')).toBeInTheDocument();
    });
  });

  describe('再試行機能', () => {
    it('再試行可能なエラーの場合、再試行ボタンが表示される', () => {
      const error: AuthError = {
        type: AuthErrorType.OAUTH_FAILED,
        message: 'OAuth failed',
        retryable: true
      };
      Object.assign(mockAuthState, { error });

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      expect(screen.getByRole('button', { name: 'ログインを再試行' })).toBeInTheDocument();
    });

    it('再試行不可能なエラーの場合、再試行ボタンが表示されない', () => {
      const error: AuthError = {
        type: AuthErrorType.ACCESS_DENIED,
        message: 'Access denied',
        retryable: false
      };
      Object.assign(mockAuthState, { error });

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      expect(screen.queryByRole('button', { name: 'ログインを再試行' })).not.toBeInTheDocument();
    });

    it('ローディング中は再試行ボタンが表示されない', () => {
      const error: AuthError = {
        type: AuthErrorType.OAUTH_FAILED,
        message: 'OAuth failed',
        retryable: true
      };
      Object.assign(mockAuthState, { error, isLoading: true });

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      expect(screen.queryByRole('button', { name: 'ログインを再試行' })).not.toBeInTheDocument();
    });

    it('再試行ボタンをクリックするとlogin関数が呼ばれる', async () => {
      const error: AuthError = {
        type: AuthErrorType.OAUTH_FAILED,
        message: 'OAuth failed',
        retryable: true
      };
      Object.assign(mockAuthState, { error });

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const retryButton = screen.getByRole('button', { name: 'ログインを再試行' });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('アクセシビリティ', () => {
    it('適切なARIAラベルが設定されている', () => {
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      // メインコンテンツのrole
      expect(screen.getByRole('main')).toBeInTheDocument();
      
      // ログインボタンのaria-label
      expect(screen.getByRole('button', { name: 'Googleアカウントでログイン' })).toBeInTheDocument();
    });

    it('エラーメッセージにaria-liveが設定されている', () => {
      const error: AuthError = {
        type: AuthErrorType.OAUTH_FAILED,
        message: 'OAuth failed',
        retryable: true
      };
      Object.assign(mockAuthState, { error });

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const errorElement = screen.getByRole('alert');
      expect(errorElement).toHaveAttribute('aria-live', 'polite');
    });

    it('ローディング中のスピナーにaria-hiddenが設定されている', () => {
      Object.assign(mockAuthState, { isLoading: true });

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const spinner = screen.getByRole('button', { name: 'Googleアカウントでログイン' })
        .querySelector('.login-spinner');
      expect(spinner).toHaveAttribute('aria-hidden', 'true');
    });

    it('Googleアイコンにaria-hiddenが設定されている', () => {
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const googleIcon = screen.getByRole('button', { name: 'Googleアカウントでログイン' })
        .querySelector('.google-icon');
      expect(googleIcon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('エラーハンドリング', () => {
    it('login関数でエラーが発生してもクラッシュしない', async () => {
      mockLogin.mockRejectedValueOnce(new Error('Login failed'));

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const loginButton = screen.getByRole('button', { name: 'Googleアカウントでログイン' });
      
      // エラーが発生してもコンポーネントがクラッシュしないことを確認
      expect(() => {
        fireEvent.click(loginButton);
      }).not.toThrow();

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledTimes(1);
      });
    });
  });
});