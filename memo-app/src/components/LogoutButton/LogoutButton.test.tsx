import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LogoutButton } from './index';
import { useAuthContext } from '../../contexts/AuthContext';
import type { AuthContextType, AuthState } from '../../types/auth';

// AuthContext をモック
vi.mock('../../contexts/AuthContext');

const mockUseAuthContext = vi.mocked(useAuthContext);

describe('LogoutButton', () => {
  const mockLogout = vi.fn();
  const mockOnLogoutComplete = vi.fn();

  const createMockAuthContext = (authState: Partial<AuthState>): AuthContextType => ({
    authState: {
      isAuthenticated: false,
      user: null,
      isLoading: false,
      error: null,
      ...authState
    },
    login: vi.fn(),
    logout: mockLogout,
    checkAuthStatus: vi.fn()
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('表示制御', () => {
    it('認証されていない場合は何も表示しない', () => {
      mockUseAuthContext.mockReturnValue(
        createMockAuthContext({ isAuthenticated: false })
      );

      const { container } = render(<LogoutButton />);
      expect(container.firstChild).toBeNull();
    });

    it('認証されている場合はボタンを表示する', () => {
      mockUseAuthContext.mockReturnValue(
        createMockAuthContext({ 
          isAuthenticated: true,
          user: { id: '1', email: 'test@example.com', name: 'Test User' }
        })
      );

      render(<LogoutButton />);
      expect(screen.getByRole('button', { name: 'ログアウト' })).toBeInTheDocument();
    });
  });

  describe('ログアウト機能', () => {
    beforeEach(() => {
      mockUseAuthContext.mockReturnValue(
        createMockAuthContext({ 
          isAuthenticated: true,
          user: { id: '1', email: 'test@example.com', name: 'Test User' }
        })
      );
    });

    it('ボタンクリック時にlogout関数が呼ばれる', async () => {
      mockLogout.mockResolvedValue(undefined);

      render(<LogoutButton />);
      
      const button = screen.getByRole('button', { name: 'ログアウト' });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalledTimes(1);
      });
    });

    it('ログアウト完了時にonLogoutCompleteコールバックが呼ばれる', async () => {
      mockLogout.mockResolvedValue(undefined);

      render(<LogoutButton onLogoutComplete={mockOnLogoutComplete} />);
      
      const button = screen.getByRole('button', { name: 'ログアウト' });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockOnLogoutComplete).toHaveBeenCalledTimes(1);
      });
    });

    it('ログアウトエラー時でもonLogoutCompleteコールバックが呼ばれる', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockLogout.mockRejectedValue(new Error('ログアウトエラー'));

      render(<LogoutButton onLogoutComplete={mockOnLogoutComplete} />);
      
      const button = screen.getByRole('button', { name: 'ログアウト' });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockOnLogoutComplete).toHaveBeenCalledTimes(1);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'ログアウト処理でエラーが発生しました:',
          expect.any(Error)
        );
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('ローディング状態', () => {
    it('ローディング中はボタンが無効化される', () => {
      mockUseAuthContext.mockReturnValue(
        createMockAuthContext({ 
          isAuthenticated: true,
          isLoading: true,
          user: { id: '1', email: 'test@example.com', name: 'Test User' }
        })
      );

      render(<LogoutButton />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('ローディング中はスピナーとローディングテキストを表示する', () => {
      mockUseAuthContext.mockReturnValue(
        createMockAuthContext({ 
          isAuthenticated: true,
          isLoading: true,
          user: { id: '1', email: 'test@example.com', name: 'Test User' }
        })
      );

      render(<LogoutButton />);
      
      expect(screen.getByText('ログアウト中...')).toBeInTheDocument();
      expect(document.querySelector('.logout-button__spinner')).toBeInTheDocument();
    });

    it('ローディング中でない場合は通常のテキストを表示する', () => {
      mockUseAuthContext.mockReturnValue(
        createMockAuthContext({ 
          isAuthenticated: true,
          isLoading: false,
          user: { id: '1', email: 'test@example.com', name: 'Test User' }
        })
      );

      render(<LogoutButton />);
      
      expect(screen.getByText('ログアウト')).toBeInTheDocument();
      expect(document.querySelector('.logout-button__spinner')).not.toBeInTheDocument();
    });
  });

  describe('プロパティ', () => {
    beforeEach(() => {
      mockUseAuthContext.mockReturnValue(
        createMockAuthContext({ 
          isAuthenticated: true,
          user: { id: '1', email: 'test@example.com', name: 'Test User' }
        })
      );
    });

    it('カスタムテキストを表示できる', () => {
      render(<LogoutButton>サインアウト</LogoutButton>);
      expect(screen.getByText('サインアウト')).toBeInTheDocument();
    });

    it('variantプロパティに応じたCSSクラスが適用される', () => {
      const { rerender } = render(<LogoutButton variant="primary" />);
      expect(document.querySelector('.logout-button--primary')).toBeInTheDocument();

      rerender(<LogoutButton variant="secondary" />);
      expect(document.querySelector('.logout-button--secondary')).toBeInTheDocument();

      rerender(<LogoutButton variant="text" />);
      expect(document.querySelector('.logout-button--text')).toBeInTheDocument();
    });

    it('sizeプロパティに応じたCSSクラスが適用される', () => {
      const { rerender } = render(<LogoutButton size="small" />);
      expect(document.querySelector('.logout-button--small')).toBeInTheDocument();

      rerender(<LogoutButton size="medium" />);
      expect(document.querySelector('.logout-button--medium')).toBeInTheDocument();

      rerender(<LogoutButton size="large" />);
      expect(document.querySelector('.logout-button--large')).toBeInTheDocument();
    });

    it('カスタムクラス名が適用される', () => {
      render(<LogoutButton className="custom-class" />);
      expect(document.querySelector('.custom-class')).toBeInTheDocument();
    });

    it('デフォルトプロパティが正しく適用される', () => {
      render(<LogoutButton />);
      
      const button = document.querySelector('.logout-button');
      expect(button).toHaveClass('logout-button--primary');
      expect(button).toHaveClass('logout-button--medium');
      expect(screen.getByText('ログアウト')).toBeInTheDocument();
    });
  });

  describe('アクセシビリティ', () => {
    beforeEach(() => {
      mockUseAuthContext.mockReturnValue(
        createMockAuthContext({ 
          isAuthenticated: true,
          user: { id: '1', email: 'test@example.com', name: 'Test User' }
        })
      );
    });

    it('適切なaria-labelが設定される', () => {
      render(<LogoutButton />);
      
      const button = screen.getByRole('button', { name: 'ログアウト' });
      expect(button).toHaveAttribute('aria-label', 'ログアウト');
    });

    it('ボタンタイプが正しく設定される', () => {
      render(<LogoutButton />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'button');
    });

    it('スピナーにaria-hiddenが設定される', () => {
      mockUseAuthContext.mockReturnValue(
        createMockAuthContext({ 
          isAuthenticated: true,
          isLoading: true,
          user: { id: '1', email: 'test@example.com', name: 'Test User' }
        })
      );

      render(<LogoutButton />);
      
      const spinner = document.querySelector('.logout-button__spinner');
      expect(spinner).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('CSS クラス', () => {
    beforeEach(() => {
      mockUseAuthContext.mockReturnValue(
        createMockAuthContext({ 
          isAuthenticated: true,
          user: { id: '1', email: 'test@example.com', name: 'Test User' }
        })
      );
    });

    it('基本的なCSSクラスが適用される', () => {
      render(<LogoutButton />);
      
      const button = document.querySelector('.logout-button');
      expect(button).toBeInTheDocument();
    });

    it('ローディング状態のCSSクラスが適用される', () => {
      mockUseAuthContext.mockReturnValue(
        createMockAuthContext({ 
          isAuthenticated: true,
          isLoading: true,
          user: { id: '1', email: 'test@example.com', name: 'Test User' }
        })
      );

      render(<LogoutButton />);
      
      expect(document.querySelector('.logout-button--loading')).toBeInTheDocument();
    });

    it('複数のクラスが正しく結合される', () => {
      render(<LogoutButton variant="secondary" size="large" className="custom" />);
      
      const button = document.querySelector('.logout-button');
      expect(button).toHaveClass('logout-button');
      expect(button).toHaveClass('logout-button--secondary');
      expect(button).toHaveClass('logout-button--large');
      expect(button).toHaveClass('custom');
    });
  });
});