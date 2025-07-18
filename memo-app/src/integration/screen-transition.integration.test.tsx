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

describe('画面遷移の統合テスト', () => {
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

  describe('要件5.1-5.5: 画面遷移ロジック', () => {
    it('要件5.1: 未認証のユーザーがメモ帳画面にアクセスした時、ログイン画面にリダイレクトする', async () => {
      // Mock unauthenticated state
      mockGoogleAuthService.getCurrentUser.mockResolvedValue(null);
      
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Googleアカウントでログインしてください')).toBeInTheDocument();
        expect(screen.getByLabelText('Googleアカウントでログイン')).toBeInTheDocument();
      });
      
      // Memo app should not be visible
      expect(screen.queryByText('メモがありません')).not.toBeInTheDocument();
    });

    it('要件5.2: 認証済みのユーザーがログイン画面にアクセスした時、メモ帳画面にリダイレクトする', async () => {
      // Mock authenticated state
      mockGoogleAuthService.getCurrentUser.mockResolvedValue(mockUser);
      mockGoogleAuthService.isTokenValid.mockResolvedValue(true);
      
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('メモがありません')).toBeInTheDocument();
      });
      
      // Login page should not be visible
      expect(screen.queryByText('Googleアカウントでログインしてください')).not.toBeInTheDocument();
    });

    it('要件5.3: ユーザーがログインに成功した時、メモ帳画面に遷移する', async () => {
      const user = userEvent.setup();
      
      // Start with unauthenticated state
      mockGoogleAuthService.getCurrentUser.mockResolvedValue(null);
      
      const mockLoginResult: LoginResult = {
        success: true,
        user: mockUser
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
      
      // Wait for transition to memo app
      await waitFor(() => {
        expect(screen.getByText('メモがありません')).toBeInTheDocument();
      }, { timeout: 3000 });
      
      // Login page should no longer be visible
      expect(screen.queryByText('Googleアカウントでログインしてください')).not.toBeInTheDocument();
    });

    it('要件5.4: メモ帳画面にログアウトボタンが表示される', async () => {
      // Mock authenticated state
      mockGoogleAuthService.getCurrentUser.mockResolvedValue(mockUser);
      mockGoogleAuthService.isTokenValid.mockResolvedValue(true);
      
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('メモがありません')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /ログアウト/i })).toBeInTheDocument();
      });
    });

    it('要件5.5: ユーザーがログアウトボタンをクリックした時、ログイン画面に遷移する', async () => {
      const user = userEvent.setup();
      
      // Start with authenticated state
      mockGoogleAuthService.getCurrentUser.mockResolvedValue(mockUser);
      mockGoogleAuthService.isTokenValid.mockResolvedValue(true);
      
      render(<App />);
      
      // Wait for memo app to load
      await waitFor(() => {
        expect(screen.getByText('メモがありません')).toBeInTheDocument();
      });
      
      // Find logout button
      const logoutButton = screen.getByRole('button', { name: /ログアウト/i });
      
      // Mock logout process - user becomes unauthenticated
      mockGoogleAuthService.getCurrentUser.mockResolvedValue(null);
      mockGoogleAuthService.isTokenValid.mockResolvedValue(false);
      
      await user.click(logoutButton);
      
      // Wait for transition to login page
      await waitFor(() => {
        expect(screen.getByText('Googleアカウントでログインしてください')).toBeInTheDocument();
      });
      
      // Memo app should no longer be visible
      expect(screen.queryByText('メモがありません')).not.toBeInTheDocument();
      expect(mockGoogleAuthService.logout).toHaveBeenCalledOnce();
    });

    it('認証ローディング中は適切なローディング表示がされる', async () => {
      // Mock loading state by delaying the getCurrentUser call
      mockGoogleAuthService.getCurrentUser.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(null), 100))
      );
      
      render(<App />);
      
      // Should show loading state initially
      expect(screen.getByText('認証状態を確認中...')).toBeInTheDocument();
      
      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByText('Googleアカウントでログインしてください')).toBeInTheDocument();
      });
      
      // Loading should no longer be visible
      expect(screen.queryByText('認証状態を確認中...')).not.toBeInTheDocument();
    });

    it('認証状態の変更時に適切に画面が更新される', async () => {
      const user = userEvent.setup();
      
      // Start unauthenticated
      mockGoogleAuthService.getCurrentUser.mockResolvedValue(null);
      
      const { rerender } = render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Googleアカウントでログインしてください')).toBeInTheDocument();
      });
      
      // Simulate authentication state change
      mockGoogleAuthService.getCurrentUser.mockResolvedValue(mockUser);
      mockGoogleAuthService.isTokenValid.mockResolvedValue(true);
      
      // Mock successful login
      const mockLoginResult: LoginResult = {
        success: true,
        user: mockUser
      };
      mockGoogleAuthService.login.mockResolvedValue(mockLoginResult);
      
      // Click login
      const loginButton = screen.getByLabelText('Googleアカウントでログイン');
      await user.click(loginButton);
      
      // Should transition to memo app
      await waitFor(() => {
        expect(screen.getByText('メモがありません')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('アクセス拒否時の画面遷移', () => {
    it('アクセス拒否エラー時にAccessDenied画面が表示される', async () => {
      const user = userEvent.setup();
      
      // Mock access denied scenario
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
      
      // Should show access denied page
      await waitFor(() => {
        expect(screen.getByText('アクセスが拒否されました')).toBeInTheDocument();
        expect(screen.getByText('このアプリケーションへのアクセス権限がありません')).toBeInTheDocument();
      });
    });

    it('AccessDenied画面から別のアカウントでログインできる', async () => {
      const user = userEvent.setup();
      
      // Start with access denied state
      mockGoogleAuthService.getCurrentUser.mockResolvedValue({
        ...mockUser,
        email: 'unauthorized@example.com'
      });
      
      // Mock access denied error in auth state
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
      const retryButton = screen.getByRole('button', { name: /別のアカウントでログイン/i });
      expect(retryButton).toBeInTheDocument();
      
      // Mock successful login with different account
      mockGoogleAuthService.login.mockResolvedValue({
        success: true,
        user: mockUser
      });
      
      await user.click(retryButton);
      
      // Should transition to memo app
      await waitFor(() => {
        expect(screen.getByText('メモがありません')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });
});