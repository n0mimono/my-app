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

describe('許可・拒否シナリオの統合テスト', () => {
  const allowedUser: User = {
    id: 'allowed-user-id',
    email: 'allowed@example.com',
    name: 'Allowed User',
    picture: 'https://example.com/allowed-avatar.jpg'
  };

  const deniedUser: User = {
    id: 'denied-user-id',
    email: 'denied@example.com',
    name: 'Denied User',
    picture: 'https://example.com/denied-avatar.jpg'
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
      allowedEmails: ['allowed@example.com'],
      version: '1.0.0'
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('要件2.1-2.4: 許可リスト管理機能', () => {
    it('要件2.1: 許可リストに含まれるユーザーはアクセスが許可される', async () => {
      const user = userEvent.setup();
      
      // Mock allowed user login
      mockAllowlistService.checkEmailAllowed.mockResolvedValue({
        isAllowed: true,
        reason: null
      });
      
      const mockLoginResult: LoginResult = {
        success: true,
        user: allowedUser
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
      
      // Should successfully access memo app
      await waitFor(() => {
        expect(screen.getByText('メモがありません')).toBeInTheDocument();
      }, { timeout: 3000 });
      
      expect(mockAllowlistService.checkEmailAllowed).toHaveBeenCalledWith('allowed@example.com');
    });

    it('要件2.2: 許可リストに含まれないユーザーはアクセスが拒否される', async () => {
      const user = userEvent.setup();
      
      // Mock denied user login
      mockAllowlistService.checkEmailAllowed.mockResolvedValue({
        isAllowed: false,
        reason: 'メールアドレスが許可リストに登録されていません'
      });
      
      const mockLoginResult: LoginResult = {
        success: false,
        error: {
          type: AuthErrorType.ACCESS_DENIED,
          message: 'メールアドレスが許可リストに登録されていません',
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
      
      // Should show access denied page
      await waitFor(() => {
        expect(screen.getByText('アクセスが拒否されました')).toBeInTheDocument();
        expect(screen.getByText('このアプリケーションへのアクセス権限がありません')).toBeInTheDocument();
      });
      
      expect(mockAllowlistService.checkEmailAllowed).toHaveBeenCalledWith('denied@example.com');
    });

    it('要件2.3: 許可リスト設定が更新された時、適切に反映される', async () => {
      // Start with user not in allowlist
      mockAllowlistService.checkEmailAllowed.mockResolvedValue({
        isAllowed: false,
        reason: 'メールアドレスが許可リストに登録されていません'
      });
      
      mockGoogleAuthService.getCurrentUser.mockResolvedValue(deniedUser);
      
      render(<App />);
      
      // Should show access denied initially
      await waitFor(() => {
        expect(screen.getByText('アクセスが拒否されました')).toBeInTheDocument();
      });
      
      // Simulate allowlist update - user is now allowed
      mockAllowlistService.checkEmailAllowed.mockResolvedValue({
        isAllowed: true,
        reason: null
      });
      
      mockAllowlistService.loadConfig.mockResolvedValue({
        googleClientId: 'test-client-id',
        allowedEmails: ['allowed@example.com', 'denied@example.com'], // Updated list
        version: '1.1.0'
      });
      
      // Mock user becoming authenticated after allowlist update
      mockGoogleAuthService.getCurrentUser.mockResolvedValue(deniedUser);
      mockGoogleAuthService.isTokenValid.mockResolvedValue(true);
      
      // Simulate re-authentication check (would happen on app refresh or periodic check)
      const { rerender } = render(<App />);
      
      // Should now allow access
      await waitFor(() => {
        expect(screen.getByText('メモがありません')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('要件2.4: 許可リストから削除されたユーザーは次回ログイン時にアクセスが拒否される', async () => {
      // Start with authenticated allowed user
      mockGoogleAuthService.getCurrentUser.mockResolvedValue(allowedUser);
      mockGoogleAuthService.isTokenValid.mockResolvedValue(true);
      mockAllowlistService.checkEmailAllowed.mockResolvedValue({
        isAllowed: true,
        reason: null
      });
      
      render(<App />);
      
      // Should initially have access
      await waitFor(() => {
        expect(screen.getByText('メモがありません')).toBeInTheDocument();
      });
      
      // Simulate user being removed from allowlist
      mockAllowlistService.checkEmailAllowed.mockResolvedValue({
        isAllowed: false,
        reason: 'アクセス権限が取り消されました'
      });
      
      // Simulate next authentication check (periodic or on refresh)
      mockGoogleAuthService.getCurrentUser.mockResolvedValue(null); // User logged out due to access revocation
      
      const { rerender } = render(<App />);
      
      // Should now be denied access
      await waitFor(() => {
        expect(screen.getByText('Googleアカウントでログインしてください')).toBeInTheDocument();
      });
    });
  });

  describe('許可リストの詳細シナリオ', () => {
    it('大文字小文字を区別しないメールアドレスチェック', async () => {
      const user = userEvent.setup();
      
      const userWithUppercaseEmail: User = {
        id: 'test-user-id',
        email: 'ALLOWED@EXAMPLE.COM',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg'
      };
      
      // Mock case-insensitive allowlist check
      mockAllowlistService.checkEmailAllowed.mockResolvedValue({
        isAllowed: true,
        reason: null
      });
      
      const mockLoginResult: LoginResult = {
        success: true,
        user: userWithUppercaseEmail
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
      
      // Should successfully access memo app
      await waitFor(() => {
        expect(screen.getByText('メモがありません')).toBeInTheDocument();
      }, { timeout: 3000 });
      
      expect(mockAllowlistService.checkEmailAllowed).toHaveBeenCalledWith('ALLOWED@EXAMPLE.COM');
    });

    it('複数のドメインを持つ許可リスト', async () => {
      const user = userEvent.setup();
      
      const companyUser: User = {
        id: 'company-user-id',
        email: 'user@company.com',
        name: 'Company User',
        picture: 'https://example.com/company-avatar.jpg'
      };
      
      // Mock allowlist with multiple domains
      mockAllowlistService.loadConfig.mockResolvedValue({
        googleClientId: 'test-client-id',
        allowedEmails: [
          'allowed@example.com',
          'user@company.com',
          'admin@organization.org'
        ],
        version: '1.0.0'
      });
      
      mockAllowlistService.checkEmailAllowed.mockResolvedValue({
        isAllowed: true,
        reason: null
      });
      
      const mockLoginResult: LoginResult = {
        success: true,
        user: companyUser
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
      
      // Should successfully access memo app
      await waitFor(() => {
        expect(screen.getByText('メモがありません')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('許可リスト設定ファイルの読み込みエラー時の処理', async () => {
      // Mock config loading error
      mockAllowlistService.loadConfig.mockRejectedValue(new Error('設定ファイルの読み込みに失敗しました'));
      
      render(<App />);
      
      // Should handle config error gracefully and show login page
      await waitFor(() => {
        expect(screen.getByText('Googleアカウントでログインしてください')).toBeInTheDocument();
      });
    });

    it('空の許可リストの場合、すべてのユーザーがアクセス拒否される', async () => {
      const user = userEvent.setup();
      
      // Mock empty allowlist
      mockAllowlistService.loadConfig.mockResolvedValue({
        googleClientId: 'test-client-id',
        allowedEmails: [],
        version: '1.0.0'
      });
      
      mockAllowlistService.checkEmailAllowed.mockResolvedValue({
        isAllowed: false,
        reason: '許可リストが空です'
      });
      
      const mockLoginResult: LoginResult = {
        success: false,
        error: {
          type: AuthErrorType.ACCESS_DENIED,
          message: '許可リストが空です',
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
      
      // Should show access denied
      await waitFor(() => {
        expect(screen.getByText('アクセスが拒否されました')).toBeInTheDocument();
      });
    });

    it('許可リストチェック中のエラー処理', async () => {
      const user = userEvent.setup();
      
      // Mock allowlist check error
      mockAllowlistService.checkEmailAllowed.mockRejectedValue(new Error('許可リストチェックでエラーが発生しました'));
      
      const mockLoginResult: LoginResult = {
        success: false,
        error: {
          type: AuthErrorType.CONFIG_ERROR,
          message: '許可リストチェックでエラーが発生しました',
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
      
      // Should show config error
      await waitFor(() => {
        expect(screen.getByText('システム設定エラーが発生しました。管理者にお問い合わせください。')).toBeInTheDocument();
      });
    });
  });

  describe('AccessDenied コンポーネントの詳細テスト', () => {
    it('拒否されたユーザーのメールアドレスが表示される', async () => {
      const user = userEvent.setup();
      
      // Mock denied user with specific email
      mockAllowlistService.checkEmailAllowed.mockResolvedValue({
        isAllowed: false,
        reason: 'アクセスが拒否されました'
      });
      
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
      
      // Should show access denied with user email
      await waitFor(() => {
        expect(screen.getByText('アクセスが拒否されました')).toBeInTheDocument();
        expect(screen.getByText('このアプリケーションへのアクセス権限がありません')).toBeInTheDocument();
        expect(screen.getByText('承認されたユーザーのみがアクセスできます')).toBeInTheDocument();
      });
    });

    it('AccessDenied画面から別のアカウントでのログイン試行', async () => {
      const user = userEvent.setup();
      
      // Start with access denied state
      mockGoogleAuthService.getCurrentUser.mockResolvedValue(deniedUser);
      mockAllowlistService.checkEmailAllowed.mockResolvedValue({
        isAllowed: false,
        reason: 'アクセスが拒否されました'
      });
      
      // Mock the auth state to show access denied error
      mockGoogleAuthService.login.mockResolvedValue({
        success: false,
        error: {
          type: AuthErrorType.ACCESS_DENIED,
          message: 'アクセスが拒否されました',
          retryable: false
        }
      });
      
      render(<App />);
      
      // Should show access denied page
      await waitFor(() => {
        expect(screen.getByText('アクセスが拒否されました')).toBeInTheDocument();
      });
      
      // Should have retry button
      const retryButton = screen.getByText('別のアカウントでログイン');
      expect(retryButton).toBeInTheDocument();
      
      // Mock successful login with allowed account
      mockGoogleAuthService.login.mockResolvedValue({
        success: true,
        user: allowedUser
      });
      
      mockAllowlistService.checkEmailAllowed.mockResolvedValue({
        isAllowed: true,
        reason: null
      });
      
      await user.click(retryButton);
      
      // Should transition to memo app
      await waitFor(() => {
        expect(screen.getByText('メモがありません')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });
});