import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ErrorNotification from './index';
import { AuthErrorType } from '../../types/auth';
import type { AuthError } from '../../types/auth';

describe('ErrorNotification', () => {
  it('renders error message when string error is provided', () => {
    render(<ErrorNotification error="Test error message" />);
    
    expect(screen.getByText('Test error message')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders user-friendly message when AuthError is provided', () => {
    const authError: AuthError = {
      type: AuthErrorType.OAUTH_FAILED,
      message: 'OAuth failed',
      retryable: true
    };

    render(<ErrorNotification error={authError} />);
    
    expect(screen.getByText('Googleログインに失敗しました。もう一度お試しください。')).toBeInTheDocument();
  });

  it('does not render when error is null', () => {
    render(<ErrorNotification error={null} />);
    
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders with correct type classes based on error severity', () => {
    const criticalError: AuthError = {
      type: AuthErrorType.CONFIG_ERROR,
      message: 'Config error',
      retryable: false
    };

    const { rerender } = render(<ErrorNotification error={criticalError} />);
    expect(screen.getByRole('alert')).toHaveClass('error-notification--error');

    const mediumError: AuthError = {
      type: AuthErrorType.NETWORK_ERROR,
      message: 'Network error',
      retryable: true
    };

    rerender(<ErrorNotification error={mediumError} />);
    expect(screen.getByRole('alert')).toHaveClass('error-notification--warning');

    const lowError: AuthError = {
      type: AuthErrorType.OAUTH_FAILED,
      message: 'OAuth failed',
      retryable: true
    };

    rerender(<ErrorNotification error={lowError} />);
    expect(screen.getByRole('alert')).toHaveClass('error-notification--info');
  });

  it('respects explicit type override', () => {
    const authError: AuthError = {
      type: AuthErrorType.CONFIG_ERROR,
      message: 'Config error',
      retryable: false
    };

    render(<ErrorNotification error={authError} type="info" />);
    expect(screen.getByRole('alert')).toHaveClass('error-notification--info');
  });

  it('calls onDismiss when dismiss button is clicked', () => {
    const mockOnDismiss = vi.fn();
    render(<ErrorNotification error="Test error" onDismiss={mockOnDismiss} />);
    
    const dismissButton = screen.getByLabelText('通知を閉じる');
    fireEvent.click(dismissButton);
    
    expect(mockOnDismiss).toHaveBeenCalledOnce();
  });

  it('shows retry button for retryable errors', () => {
    const retryableError: AuthError = {
      type: AuthErrorType.NETWORK_ERROR,
      message: 'Network error',
      retryable: true
    };

    const mockOnRetry = vi.fn();
    render(<ErrorNotification error={retryableError} onRetry={mockOnRetry} />);
    
    expect(screen.getByLabelText('再試行')).toBeInTheDocument();
  });

  it('does not show retry button for non-retryable errors', () => {
    const nonRetryableError: AuthError = {
      type: AuthErrorType.ACCESS_DENIED,
      message: 'Access denied',
      retryable: false
    };

    const mockOnRetry = vi.fn();
    render(<ErrorNotification error={nonRetryableError} onRetry={mockOnRetry} />);
    
    expect(screen.queryByLabelText('再試行')).not.toBeInTheDocument();
  });

  it('shows retry button when showRetry is explicitly true', () => {
    const mockOnRetry = vi.fn();
    render(<ErrorNotification error="Test error" showRetry={true} onRetry={mockOnRetry} />);
    
    expect(screen.getByLabelText('再試行')).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', async () => {
    const retryableError: AuthError = {
      type: AuthErrorType.NETWORK_ERROR,
      message: 'Network error',
      retryable: true
    };

    const mockOnRetry = vi.fn().mockResolvedValue(undefined);
    render(<ErrorNotification error={retryableError} onRetry={mockOnRetry} />);
    
    const retryButton = screen.getByLabelText('再試行');
    fireEvent.click(retryButton);
    
    expect(mockOnRetry).toHaveBeenCalledOnce();
  });

  it('shows loading state during retry', async () => {
    const retryableError: AuthError = {
      type: AuthErrorType.NETWORK_ERROR,
      message: 'Network error',
      retryable: true
    };

    const mockOnRetry = vi.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );
    
    render(<ErrorNotification error={retryableError} onRetry={mockOnRetry} />);
    
    const retryButton = screen.getByLabelText('再試行');
    fireEvent.click(retryButton);
    
    expect(screen.getByText('再試行中...')).toBeInTheDocument();
    expect(retryButton).toBeDisabled();
    
    await waitFor(() => {
      expect(screen.getByText('再試行')).toBeInTheDocument();
      expect(retryButton).not.toBeDisabled();
    });
  });

  it('auto-hides after specified duration', async () => {
    const mockOnDismiss = vi.fn();
    render(
      <ErrorNotification 
        error="Test error" 
        autoHide={true} 
        duration={100} 
        onDismiss={mockOnDismiss} 
      />
    );
    
    expect(screen.getByRole('alert')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(mockOnDismiss).toHaveBeenCalledOnce();
    }, { timeout: 200 });
  });

  it('does not auto-hide when autoHide is false', async () => {
    const mockOnDismiss = vi.fn();
    render(
      <ErrorNotification 
        error="Test error" 
        autoHide={false} 
        duration={100} 
        onDismiss={mockOnDismiss} 
      />
    );
    
    expect(screen.getByRole('alert')).toBeInTheDocument();
    
    // Wait longer than duration to ensure it doesn't auto-hide
    await new Promise(resolve => setTimeout(resolve, 150));
    
    expect(mockOnDismiss).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders correct icons for different types', () => {
    const { rerender } = render(<ErrorNotification error="Error" type="error" />);
    expect(screen.getByText('⚠️')).toBeInTheDocument();

    rerender(<ErrorNotification error="Warning" type="warning" />);
    expect(screen.getByText('⚠️')).toBeInTheDocument();

    rerender(<ErrorNotification error="Info" type="info" />);
    expect(screen.getByText('ℹ️')).toBeInTheDocument();
  });

  it('handles different AuthError types correctly', () => {
    const errors = [
      {
        error: { type: AuthErrorType.OAUTH_FAILED, message: 'OAuth failed', retryable: true },
        expectedMessage: 'Googleログインに失敗しました。もう一度お試しください。'
      },
      {
        error: { type: AuthErrorType.ACCESS_DENIED, message: 'Access denied', retryable: false },
        expectedMessage: 'アクセスが拒否されました。管理者にお問い合わせください。'
      },
      {
        error: { type: AuthErrorType.NETWORK_ERROR, message: 'Network error', retryable: true },
        expectedMessage: 'ネットワークエラーが発生しました。インターネット接続を確認してください。'
      },
      {
        error: { type: AuthErrorType.TOKEN_EXPIRED, message: 'Token expired', retryable: true },
        expectedMessage: 'セッションが期限切れです。再度ログインしてください。'
      },
      {
        error: { type: AuthErrorType.CONFIG_ERROR, message: 'Config error', retryable: false },
        expectedMessage: 'システム設定エラーが発生しました。管理者にお問い合わせください。'
      }
    ];

    errors.forEach(({ error, expectedMessage }) => {
      const { unmount } = render(<ErrorNotification error={error} />);
      expect(screen.getByText(expectedMessage)).toBeInTheDocument();
      unmount();
    });
  });

  it('has proper accessibility attributes', () => {
    render(<ErrorNotification error="Test error" />);
    
    const notification = screen.getByRole('alert');
    expect(notification).toBeInTheDocument();
    
    const dismissButton = screen.getByLabelText('通知を閉じる');
    expect(dismissButton).toBeInTheDocument();
  });

  it('applies correct CSS classes based on type', () => {
    // Test explicit type override
    const { rerender } = render(
      <ErrorNotification error="Test error" type="error" />
    );
    
    expect(screen.getByRole('alert')).toHaveClass('error-notification--error');
    
    rerender(<ErrorNotification error="Test warning" type="warning" />);
    expect(screen.getByRole('alert')).toHaveClass('error-notification--warning');
    
    rerender(<ErrorNotification error="Test info" type="info" />);
    expect(screen.getByRole('alert')).toHaveClass('error-notification--info');
  });
});