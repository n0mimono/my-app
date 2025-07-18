import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import App from '../App';
import { googleAuthService } from '../services/googleAuthService';
import { allowlistService } from '../services/allowlistService';
import type { User, LoginResult } from '../types/auth';
import { AuthErrorType } from '../types/auth';

// Mock services
vi.mock('../services/googleAuthService');
vi.mock('../services/allowlistService');

// Mock window.google API
const mockGoogleAPI = {
  accounts: {
    id: {
      initialize: vi.fn(),
      prompt: vi.fn(),
      disableAutoSelect: vi.fn(),
    }
  }
};

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

Object.defineProperty(window, 'google', {
  value: mockGoogleAPI,
  writable: true,
});

describe('エラーシナリオの統合テスト', () => {
  const mockUser: User = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    picture: 'https://example.com/avatar.jpg'
  };

  const mockGoogleAuthService = googleAuthService as any;
  const mockAllowlistService = allowlistService as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.clear();
    
    // Default mock implementations
    mockGoogleAuthService.initialize = vi.fn().mockResolvedValue(undefined);
    mockGoogleAuthService.getCurrentUser = vi.fn().mockResolvedValue(null);
    mockGoogleAuthService.login = vi.fn();
    mockGoogleAuthService.logout = vi.fn().mockResolvedValue(undefined);
    mockGoogleAuthService.isTokenValid = vi.fn().mockResolvedValue(false);
    mockGoogleAuthService.refreshToken = vi.fn().mockResolvedValue(false);
    
    mockAllowlistService.loadConfig = vi.fn().mockResolvedValue({
      googleClientId: 'test-client-id',
      allowedEmails: ['test@example.com'],
      version: '1.0.0'
    });
    mockAllowlistService.checkEmailAllowed = vi.fn().mockResolvedValue({
      isAllowed: true,
      reason: null
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('要件6.1-6.5: 認証エラーの適切な処理', () => {
    it('要件6.1: Google OAuth が失敗した時、ユーザーフレンドリーなエラーメッセージを表示する', async () => {
      const user = userEvent.setup();
      
      // Mock OAuth failure
      const mockLoginResult: LoginResult = {
        success: false,
        error: {
          type: AuthErrorType.OAUTH_FAILED,
          message: 'OAuth認証に失敗しました',
          retryable: true
        }
      };
      mockGoogleAuthService.login.mockResolvedValue(mockLoginResult);
      
      render(<App />);
      
      // Wait for login page
      await waitFor(() => {
        expect(screen.getByLabelText('Googleアカウントでログイン')).toBeInTheDocument();
      });
      
      // Click login button
      const loginButton = screen.getByLabelText('Googleアカウントでログイン');
      await user.click(loginButton);
      
      // Should show user-friendly error message
      await waitFor(() => {
        expect(screen.getByText('Googleログインに失敗しました。もう一度お試しください。')).toBeInTheDocument();
      });
    });

    it('要件6.2: 許可リスト制限によりアクセスが拒否された時、明確な説明を表示する', async () => {
      const user = userEvent.setup();
      
      // Mock access denied
      const mockLoginResult: LoginResult = {
        success: false,
        error: {
          type: AuthErrorType.ACCESS_DENIED,
          message: 'アクセスが拒否されました',
          retryable: false
        }
      };
      mockGoogleAuthService.login.mockResolvedValue(mockLoginResult);
      
      render(<App />);
      
      // Wait for login page
      await waitFor(() => {
        expect(screen.getByLabelText('Googleアカウントでログイン')).toBeInTheDocument();
      });
      
      // Click login button
      const loginButton = screen.getByLabelText('Googleアカウントでログイン');
      await user.click(loginButton);
      
      // Should show access denied message
      await waitFor(() => {
        expect(screen.getByText('アクセスが拒否されました')).toBeInTheDocument();
        expect(screen.getByText('このアプリケーションへのアクセス権限がありません')).toBeInTheDocument();
        expect(screen.getByText('管理者に連絡して、アクセス許可を依頼してください。')).toBeInTheDocument();
      });
    });

    it('要件6.3: ネットワークエラーが発生した時、再試行オプションを提供する', async () => {
      const user = userEvent.setup();
      
      // Mock network error
      const mockLoginResult: LoginResult = {
        success: false,
        error: {
          type: AuthErrorType.NETWORK_ERROR,
          message: 'ネットワークエラーが発生しました',
          retryable: true
        }
      };
      mockGoogleAuthService.login.mockResolvedValue(mockLoginResult);
      
      render(<App />);
      
      // Wait for login page
      await waitFor(() => {
        expect(screen.getByLabelText('Googleアカウントでログイン')).toBeInTheDocument();
      });
      
      // Click login button
      const loginButton = screen.getByLabelText('Googleアカウントでログイン');
      await user.click(loginButton);
      
      // Should show network error message and retry option
      await waitFor(() => {
        expect(screen.getByText('ネットワークエラーが発生しました。インターネット接続を確認してください。')).toBeInTheDocument();
        expect(screen.getByLabelText('ログインを再試行')).toBeInTheDocument();
      });
      
      // Test retry functionality
      mockGoogleAuthService.login.mockResolvedValue({
        success: true,
        user: mockUser
      });
      
      const retryButton = screen.getByLabelText('ログインを再試行');
      await user.click(retryButton);
      
      // Should transition to memo app after successful retry
      await waitFor(() => {
        expect(screen.getByText('メモがありません')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('要件6.4: 認証トークンが無効な時、再認証を求める', async () => {
      // Mock invalid token scenario
      mockGoogleAuthService.getCurrentUser.mockResolvedValue(null);
      mockGoogleAuthService.isTokenValid.mockResolvedValue(false);
      mockGoogleAuthService.refreshToken.mockResolvedValue(false);
      
      render(<App />);
      
      // Should show login page for re-authentication
      await waitFor(() => {
        expect(screen.getByText('Googleアカウントでログインしてください')).toBeInTheDocument();
      });
      
      expect(mockGoogleAuthService.getCurrentUser).toHaveBeenCalled();
    });

    it('設定エラーが発生した時、適切なエラーメッセージを表示する', async () => {
      const user = userEvent.setup();
      
      // Mock config error
      const mockLoginResult: LoginResult = {
        success: false,
        error: {
          type: AuthErrorType.CONFIG_ERROR,
          message: 'システム設定エラーが発生しました',
          retryable: false
        }
      };
      mockGoogleAuthService.login.mockResolvedValue(mockLoginResult);
      
      render(<App />);
      
      // Wait for login page
      await waitFor(() => {
        expect(screen.getByLabelText('Googleアカウントでログイン')).toBeInTheDocument();
      });
      
      // Click login button
      const loginButton = screen.getByLabelText('Googleアカウントでログイン');
      await user.click(loginButton);
      
      // Should show config error message
      await waitFor(() => {
        expect(screen.getByText('システム設定エラーが発生しました。管理者にお問い合わせください。')).toBeInTheDocument();
      });
      
      // Should not show retry button for non-retryable errors
      expect(screen.queryByLabelText('ログインを再試行')).not.toBeInTheDocument();
    });

    it('初期化エラーが発生した時、適切に処理される', async () => {
      // Mock initialization error
      mockGoogleAuthService.initialize.mockRejectedValue(new Error('初期化に失敗しました'));
      mockGoogleAuthService.getCurrentUser.mockRejectedValue(new Error('初期化に失敗しました'));
      
      render(<App />);
      
      // Should eventually show login page even with initialization error
      await waitFor(() => {
        expect(screen.getByText('Googleアカウントでログインしてください')).toBeInTheDocument();
      });
    });

    it('トークンリフレッシュが失敗した時、ログアウト処理が実行される', async () => {
      // Mock authenticated user with expired token
      mockGoogleAuthService.getCurrentUser.mockResolvedValueOnce(mockUser);
      mockGoogleAuthService.isTokenValid.mockResolvedValue(false);
      mockGoogleAuthService.refreshToken.mockResolvedValue(false);
      
      // After failed refresh, user should be null
      mockGoogleAuthService.getCurrentUser.mockResolvedValue(null);
      
      render(<App />);
      
      // Should eventually show login page after failed token refresh
      await waitFor(() => {
        expect(screen.getByText('Googleアカウントでログインしてください')).toBeInTheDocument();
      });
      
      expect(mockGoogleAuthService.refreshToken).toHaveBeenCalled();
    });

    it('複数のエラーが連続して発生した時、適切に処理される', async () => {
      const user = userEvent.setup();
      
      // First attempt: Network error
      mockGoogleAuthService.login.mockResolvedValueOnce({
        success: false,
        error: {
          type: AuthErrorType.NETWORK_ERROR,
          message: 'ネットワークエラー',
          retryable: true
        }
      });
      
      render(<App />);
      
      // Wait for login page
      await waitFor(() => {
        expect(screen.getByLabelText('Googleアカウントでログイン')).toBeInTheDocument();
      });
      
      // First login attempt
      const loginButton = screen.getByLabelText('Googleアカウントでログイン');
      await user.click(loginButton);
      
      // Should show network error
      await waitFor(() => {
        expect(screen.getByText('ネットワークエラーが発生しました。インターネット接続を確認してください。')).toBeInTheDocument();
      });
      
      // Second attempt: OAuth failure
      mockGoogleAuthService.login.mockResolvedValueOnce({
        success: false,
        error: {
          type: AuthErrorType.OAUTH_FAILED,
          message: 'OAuth失敗',
          retryable: true
        }
      });
      
      const retryButton = screen.getByLabelText('ログインを再試行');
      await user.click(retryButton);
      
      // Should show OAuth error
      await waitFor(() => {
        expect(screen.getByText('Googleログインに失敗しました。もう一度お試しください。')).toBeInTheDocument();
      });
      
      // Third attempt: Success
      mockGoogleAuthService.login.mockResolvedValue({
        success: true,
        user: mockUser
      });
      
      const secondRetryButton = screen.getByLabelText('ログインを再試行');
      await user.click(secondRetryButton);
      
      // Should eventually succeed
      await waitFor(() => {
        expect(screen.getByText('メモがありません')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('エラー回復シナリオ', () => {
    it('一時的なネットワークエラー後の自動回復', async () => {
      // Mock temporary network issue during initialization
      mockGoogleAuthService.getCurrentUser
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue(mockUser);
      
      mockGoogleAuthService.isTokenValid.mockResolvedValue(true);
      
      render(<App />);
      
      // Should eventually recover and show memo app
      await waitFor(() => {
        expect(screen.getByText('メモがありません')).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('設定ファイル読み込みエラー後の回復', async () => {
      // Mock config loading error followed by success
      mockAllowlistService.loadConfig
        .mockRejectedValueOnce(new Error('Config load failed'))
        .mockResolvedValue({
          googleClientId: 'test-client-id',
          allowedEmails: ['test@example.com'],
          version: '1.0.0'
        });
      
      render(<App />);
      
      // Should eventually show login page after config recovery
      await waitFor(() => {
        expect(screen.getByText('Googleアカウントでログインしてください')).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });
});