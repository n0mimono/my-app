import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest';
import App from './App'

// Mock the useAuth hook
const mockUseAuth = vi.fn();
vi.mock('./hooks/useAuth', () => ({
  useAuth: () => mockUseAuth()
}));

// Mock the ProtectedRoute component to pass through children when authenticated
vi.mock('./components/ProtectedRoute', () => ({
  default: ({ children }: { children: React.ReactNode }) => {
    const { authState } = mockUseAuth();
    // Only render children if authenticated (for testing purposes)
    return authState?.isAuthenticated ? <>{children}</> : <div data-testid="login-required">Login Required</div>;
  }
}));

// Mock the AuthProvider component
vi.mock('./contexts/AuthContext', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default to authenticated state for most tests
    mockUseAuth.mockReturnValue({
      authState: {
        isAuthenticated: true,
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
        isLoading: false,
        error: null
      },
      login: vi.fn(),
      logout: vi.fn(),
      checkAuthStatus: vi.fn()
    });
  });

  describe('認証統合テスト', () => {
    it('認証済み時にメモアプリを表示する', () => {
      render(<App />)
      
      // Check if the app title is rendered
      expect(screen.getByText('メモ帳')).toBeInTheDocument()
      
      // Check if new memo button is rendered
      expect(screen.getByText('新規メモ')).toBeInTheDocument()
      
      // Login required message should not be shown
      expect(screen.queryByTestId('login-required')).not.toBeInTheDocument()
    })

    it('未認証時にログイン要求を表示する', () => {
      // Set to unauthenticated state
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

      render(<App />)
      
      // Should show login required message
      expect(screen.getByTestId('login-required')).toBeInTheDocument()
      
      // Memo app content should not be shown
      expect(screen.queryByText('メモ帳')).not.toBeInTheDocument()
      expect(screen.queryByText('新規メモ')).not.toBeInTheDocument()
    })

    it('認証ローディング中は適切に処理される', () => {
      // Set to loading state
      mockUseAuth.mockReturnValue({
        authState: {
          isAuthenticated: false,
          user: null,
          isLoading: true,
          error: null
        },
        login: vi.fn(),
        logout: vi.fn(),
        checkAuthStatus: vi.fn()
      });

      render(<App />)
      
      // Should show login required (ProtectedRoute handles loading)
      expect(screen.getByTestId('login-required')).toBeInTheDocument()
    })
  });

  describe('基本機能テスト', () => {
    it('renders memo app with header and empty state', () => {
      render(<App />)
      
      // Check if the app title is rendered
      expect(screen.getByText('メモ帳')).toBeInTheDocument()
      
      // Check if new memo button is rendered
      expect(screen.getByText('新規メモ')).toBeInTheDocument()
      
      // Check if empty state is shown when no memos exist
      expect(screen.getByText('メモがありません')).toBeInTheDocument()
      expect(screen.getByText('「新規メモ」ボタンをクリックして、最初のメモを作成しましょう。')).toBeInTheDocument()
    })

    it('switches to editor view when new memo button is clicked', async () => {
      render(<App />)
      
      // Click new memo button
      const newMemoButton = screen.getByText('新規メモ')
      fireEvent.click(newMemoButton)
      
      // Should switch to editor view
      await waitFor(() => {
        expect(screen.getByPlaceholderText('メモを入力してください...')).toBeInTheDocument()
      })
      
      // New memo button should be hidden in editor view
      expect(screen.queryByText('新規メモ')).not.toBeInTheDocument()
      
      // Back button should be visible
      expect(screen.getByText('← 戻る')).toBeInTheDocument()
    })

    it('switches back to list view when back button is clicked', async () => {
      render(<App />)
      
      // Go to editor view
      const newMemoButton = screen.getByText('新規メモ')
      fireEvent.click(newMemoButton)
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('メモを入力してください...')).toBeInTheDocument()
      })
      
      // Click back button
      const backButton = screen.getByText('← 戻る')
      fireEvent.click(backButton)
      
      // Should switch back to list view
      await waitFor(() => {
        expect(screen.getByText('新規メモ')).toBeInTheDocument()
      })
      
      // Editor should be hidden
      expect(screen.queryByPlaceholderText('メモを入力してください...')).not.toBeInTheDocument()
    })
  });

  describe('画面遷移要件の検証', () => {
    it('要件5.1: 未認証のユーザーがメモ帳画面にアクセスした時、ログイン画面にリダイレクトする', () => {
      // Set to unauthenticated state
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

      render(<App />)
      
      // メモ帳画面は表示されない
      expect(screen.queryByText('メモ帳')).not.toBeInTheDocument()
      expect(screen.queryByText('新規メモ')).not.toBeInTheDocument()
      
      // ログイン要求が表示される
      expect(screen.getByTestId('login-required')).toBeInTheDocument()
    })

    it('要件5.2: 認証済みのユーザーがアクセスした時、メモ帳画面を表示する', () => {
      render(<App />)
      
      // メモ帳画面が表示される
      expect(screen.getByText('メモ帳')).toBeInTheDocument()
      expect(screen.getByText('新規メモ')).toBeInTheDocument()
      
      // ログイン要求は表示されない
      expect(screen.queryByTestId('login-required')).not.toBeInTheDocument()
    })

    it('要件5.3: ログイン成功時にメモ帳画面に遷移する', () => {
      // 最初は未認証状態
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

      const { rerender } = render(<App />)
      
      // ログイン要求が表示される
      expect(screen.getByTestId('login-required')).toBeInTheDocument()
      
      // 認証成功後の状態に更新
      mockUseAuth.mockReturnValue({
        authState: {
          isAuthenticated: true,
          user: { id: '1', email: 'test@example.com', name: 'Test User' },
          isLoading: false,
          error: null
        },
        login: vi.fn(),
        logout: vi.fn(),
        checkAuthStatus: vi.fn()
      });

      rerender(<App />)
      
      // メモ帳画面が表示される
      expect(screen.getByText('メモ帳')).toBeInTheDocument()
      expect(screen.getByText('新規メモ')).toBeInTheDocument()
      expect(screen.queryByTestId('login-required')).not.toBeInTheDocument()
    })

    it('要件5.5: ユーザーがログアウトした時、ログイン画面に遷移する', () => {
      // 最初は認証済み状態
      const { rerender } = render(<App />)
      
      // メモ帳画面が表示される
      expect(screen.getByText('メモ帳')).toBeInTheDocument()
      
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

      rerender(<App />)
      
      // ログイン要求が表示される
      expect(screen.getByTestId('login-required')).toBeInTheDocument()
      expect(screen.queryByText('メモ帳')).not.toBeInTheDocument()
    })
  });
})