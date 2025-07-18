import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import App from './App';

// Mock the useAuth hook
const mockUseAuth = vi.fn();
vi.mock('./hooks/useAuth', () => ({
  useAuth: () => mockUseAuth()
}));

// Mock components to avoid complex rendering
vi.mock('./components/LoginPage', () => ({
  default: () => <div data-testid="login-page">Login Page</div>
}));

vi.mock('./components/AccessDenied', () => ({
  default: () => <div data-testid="access-denied">Access Denied</div>
}));

vi.mock('./components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">
      <h1>メモ帳</h1>
      {children}
    </div>
  )
}));

vi.mock('./components/MemoList', () => ({
  default: () => <div data-testid="memo-list">Memo List</div>
}));

describe('App Authentication Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('要件5.3: ログイン成功時にメモ帳画面に遷移する', () => {
    // 認証済み状態をモック
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

    render(<App />);
    
    // メモ帳画面が表示されることを確認
    expect(screen.getByTestId('layout')).toBeInTheDocument();
    expect(screen.getByText('メモ帳')).toBeInTheDocument();
    expect(screen.getByTestId('memo-list')).toBeInTheDocument();
    
    // ログイン画面は表示されない
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
  });

  it('未認証時にログイン画面を表示する', () => {
    // 未認証状態をモック
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

    render(<App />);
    
    // ログイン画面が表示されることを確認
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
    
    // メモ帳画面は表示されない
    expect(screen.queryByTestId('layout')).not.toBeInTheDocument();
  });

  it('認証ローディング中は適切に処理される', () => {
    // ローディング状態をモック
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

    render(<App />);
    
    // ローディング表示を確認
    expect(screen.getByText('認証状態を確認中...')).toBeInTheDocument();
  });

  it('AuthProvider が正しく統合されている', () => {
    // 認証済み状態をモック
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

    // エラーなくレンダリングできることを確認
    expect(() => render(<App />)).not.toThrow();
    
    // AuthProvider が useAuth フックを呼び出していることを確認
    expect(mockUseAuth).toHaveBeenCalled();
  });
});