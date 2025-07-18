import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Layout from './index';
import { AuthProvider } from '../../contexts/AuthContext';
import type { AuthState, User } from '../../types/auth';

// useAuth フックのモック
const mockAuthState: AuthState = {
  isAuthenticated: false,
  user: null,
  isLoading: false,
  error: null
};

const mockLogin = vi.fn();
const mockLogout = vi.fn();
const mockCheckAuthStatus = vi.fn();

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    authState: mockAuthState,
    login: mockLogin,
    logout: mockLogout,
    checkAuthStatus: mockCheckAuthStatus
  })
}));

// テスト用のユーザーデータ
const mockUser: User = {
  id: '123',
  email: 'test@example.com',
  name: 'Test User',
  picture: 'https://example.com/avatar.jpg'
};

// テスト用のラッパーコンポーネント
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('Layout Component', () => {
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

  describe('基本的なレンダリング', () => {
    it('タイトルと子要素が正しく表示される', () => {
      render(
        <TestWrapper>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </TestWrapper>
      );

      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByText('メモ帳')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('新規メモボタンがデフォルトで表示される', () => {
      const mockOnNewMemo = vi.fn();
      
      render(
        <TestWrapper>
          <Layout onNewMemo={mockOnNewMemo}>
            <div>Test Content</div>
          </Layout>
        </TestWrapper>
      );

      const newMemoButton = screen.getByRole('button', { name: '新規メモを作成' });
      expect(newMemoButton).toBeInTheDocument();
      
      fireEvent.click(newMemoButton);
      expect(mockOnNewMemo).toHaveBeenCalledTimes(1);
    });

    it('showNewMemoButton が false の場合、新規メモボタンが表示されない', () => {
      render(
        <TestWrapper>
          <Layout showNewMemoButton={false}>
            <div>Test Content</div>
          </Layout>
        </TestWrapper>
      );

      expect(screen.queryByRole('button', { name: '新規メモを作成' })).not.toBeInTheDocument();
    });
  });

  describe('認証状態による表示制御', () => {
    it('未認証時はユーザー情報が表示されない', () => {
      render(
        <TestWrapper>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </TestWrapper>
      );

      expect(screen.queryByText('Test User')).not.toBeInTheDocument();
      expect(screen.queryByText('test@example.com')).not.toBeInTheDocument();
      expect(screen.queryByRole('img', { name: /プロフィール画像/ })).not.toBeInTheDocument();
    });

    it('認証済み時はユーザー情報が表示される', () => {
      // 認証済み状態に設定
      Object.assign(mockAuthState, {
        isAuthenticated: true,
        user: mockUser
      });

      render(
        <TestWrapper>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </TestWrapper>
      );

      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.getByRole('img', { name: 'Test Userのプロフィール画像' })).toBeInTheDocument();
    });

    it('プロフィール画像がない場合でもユーザー情報が表示される', () => {
      const userWithoutPicture: User = {
        ...mockUser,
        picture: undefined
      };

      Object.assign(mockAuthState, {
        isAuthenticated: true,
        user: userWithoutPicture
      });

      render(
        <TestWrapper>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </TestWrapper>
      );

      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.queryByRole('img', { name: /プロフィール画像/ })).not.toBeInTheDocument();
    });
  });

  describe('ログアウトボタンの統合', () => {
    it('認証済み時はログアウトボタンが表示される', () => {
      Object.assign(mockAuthState, {
        isAuthenticated: true,
        user: mockUser
      });

      render(
        <TestWrapper>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </TestWrapper>
      );

      expect(screen.getByRole('button', { name: 'ログアウト' })).toBeInTheDocument();
    });

    it('未認証時はログアウトボタンが表示されない', () => {
      render(
        <TestWrapper>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </TestWrapper>
      );

      expect(screen.queryByRole('button', { name: 'ログアウト' })).not.toBeInTheDocument();
    });

    it('ログアウトボタンがクリックされた時にログアウト処理が実行される', async () => {
      Object.assign(mockAuthState, {
        isAuthenticated: true,
        user: mockUser
      });

      render(
        <TestWrapper>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </TestWrapper>
      );

      const logoutButton = screen.getByRole('button', { name: 'ログアウト' });
      fireEvent.click(logoutButton);

      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe('アクセシビリティ', () => {
    it('適切なARIAラベルが設定されている', () => {
      render(
        <TestWrapper>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </TestWrapper>
      );

      expect(screen.getByRole('application', { name: 'メモ帳アプリケーション' })).toBeInTheDocument();
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByLabelText('新規メモを作成')).toBeInTheDocument();
    });

    it('プロフィール画像に適切なalt属性が設定されている', () => {
      Object.assign(mockAuthState, {
        isAuthenticated: true,
        user: mockUser
      });

      render(
        <TestWrapper>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </TestWrapper>
      );

      const avatar = screen.getByRole('img', { name: 'Test Userのプロフィール画像' });
      expect(avatar).toHaveAttribute('src', mockUser.picture);
      expect(avatar).toHaveAttribute('alt', 'Test Userのプロフィール画像');
    });
  });

  describe('レスポンシブデザイン', () => {
    it('適切なCSSクラスが適用されている', () => {
      Object.assign(mockAuthState, {
        isAuthenticated: true,
        user: mockUser
      });

      render(
        <TestWrapper>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </TestWrapper>
      );

      // ヘッダーの構造をチェック
      expect(document.querySelector('.layout-header-left')).toBeInTheDocument();
      expect(document.querySelector('.layout-header-center')).toBeInTheDocument();
      expect(document.querySelector('.layout-header-right')).toBeInTheDocument();
      
      // ユーザー情報の構造をチェック
      expect(document.querySelector('.user-info')).toBeInTheDocument();
      expect(document.querySelector('.user-avatar')).toBeInTheDocument();
      expect(document.querySelector('.user-details')).toBeInTheDocument();
      expect(document.querySelector('.user-name')).toBeInTheDocument();
      expect(document.querySelector('.user-email')).toBeInTheDocument();
    });

    it('ログアウトボタンに適切なクラスが適用されている', () => {
      Object.assign(mockAuthState, {
        isAuthenticated: true,
        user: mockUser
      });

      render(
        <TestWrapper>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </TestWrapper>
      );

      const logoutButton = screen.getByRole('button', { name: 'ログアウト' });
      expect(logoutButton).toHaveClass('layout-logout-button');
    });
  });
});