import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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

describe('認証フロー全体の統合テスト', () => {
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

  describe('要件1.1-1.5: 完全な認証フロー', () => {
    it('未認証ユーザーがアプリにアクセスした時、ログイン画面が表示される', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('メモ帳')).toBeInTheDocument();
        expect(screen.getByText('Googleアカウントでログインしてください')).toBeInTheDocument();
        expect(screen.getByLabelText('Googleアカウントでログイン')).toBeInTheDocument();
      });
    });

    it('ログイン成功後、メモアプリ画面に遷移する', async () => {
      const user = userEvent.setup();
      
      // Mock successful login
      const mockLoginResult: LoginResult = {
        success: true,
        user: mockUser
      };
      mockGoogleAuthService.login.mockResolvedValue(mockLoginResult);
      
      render(<App />);
      
      // Wait for login page to load
      await waitFor(() => {
        expect(screen.getByLabelText('Googleアカウントでログイン')).toBeInTheDocument();
      });
      
      // Click login button
      const loginButton = screen.getByLabelText('Googleアカウントでログイン');
      await user.click(loginButton);
      
      // Wait for authentication to complete and memo app to load
      await waitFor(() => {
        expect(screen.getByText('メモがありません')).toBeInTheDocument();
      }, { timeout: 3000 });
      
      expect(mockGoogleAuthService.login).toHaveBeenCalledOnce();
    });

    it('認証済みユーザーがアプリにアクセスした時、直接メモアプリ画面が表示される', async () => {
      // Mock authenticated user
      mockGoogleAuthService.getCurrentUser.mockResolvedValue(mockUser);
      mockGoogleAuthService.isTokenValid.mockResolvedValue(true);
      
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('メモがありません')).toBeInTheDocument();
      });
      
      // Login page should not be shown
      expect(screen.queryByText('Googleアカウントでログインしてください')).not.toBeInTheDocument();
    });

    it('ログアウト後、ログイン画面に戻る', async () => {
      const user = userEvent.setup();
      
      // Start with authenticated user
      mockGoogleAuthService.getCurrentUser.mockResolvedValue(mockUser);
      mockGoogleAuthService.isTokenValid.mockResolvedValue(true);
      
      render(<App />);
      
      // Wait for memo app to load
      await waitFor(() => {
        expect(screen.getByText('メモがありません')).toBeInTheDocument();
      });
      
      // Find and click logout button
      const logoutButton = screen.getByRole('button', { name: /ログアウト/i });
      
      // Mock logout process
      mockGoogleAuthService.getCurrentUser.mockResolvedValue(null);
      mockGoogleAuthService.isTokenValid.mockResolvedValue(false);
      
      await user.click(logoutButton);
      
      // Wait for logout to complete and login page to show
      await waitFor(() => {
        expect(screen.getByText('Googleアカウントでログインしてください')).toBeInTheDocument();
      });
      
      expect(mockGoogleAuthService.logout).toHaveBeenCalledOnce();
    });
  });

  describe('要件4.1-4.5: 認証状態の永続化', () => {
    it('有効なトークンがある場合、自動的にログイン状態を復元する', async () => {
      // Mock valid stored authentication
      mockGoogleAuthService.getCurrentUser.mockResolvedValue(mockUser);
      mockGoogleAuthService.isTokenValid.mockResolvedValue(true);
      
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('メモがありません')).toBeInTheDocument();
      });
      
      expect(mockGoogleAuthService.getCurrentUser).toHaveBeenCalled();
    });

    it('無効なトークンがある場合、ログイン画面を表示する', async () => {
      // Mock invalid stored authentication
      mockGoogleAuthService.getCurrentUser.mockResolvedValue(null);
      mockGoogleAuthService.isTokenValid.mockResolvedValue(false);
      
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Googleアカウントでログインしてください')).toBeInTheDocument();
      });
    });

    it('トークンリフレッシュが成功した場合、認証状態を維持する', async () => {
      // Mock token refresh scenario
      mockGoogleAuthService.getCurrentUser.mockResolvedValue(mockUser);
      mockGoogleAuthService.isTokenValid.mockResolvedValue(false);
      mockGoogleAuthService.refreshToken.mockResolvedValue(true);
      
      // After refresh, user should be available
      mockGoogleAuthService.getCurrentUser.mockResolvedValueOnce(null)
        .mockResolvedValue(mockUser);
      
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('メモがありません')).toBeInTheDocument();
      });
      
      expect(mockGoogleAuthService.refreshToken).toHaveBeenCalled();
    });
  });
});