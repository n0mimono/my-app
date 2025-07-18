import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AccessDenied from './index';

describe('AccessDenied', () => {
  it('renders access denied message', () => {
    render(<AccessDenied />);
    
    expect(screen.getByText('アクセスが拒否されました')).toBeInTheDocument();
    expect(screen.getByText('申し訳ございませんが、このアプリケーションへのアクセス権限がありません。')).toBeInTheDocument();
  });

  it('displays user email when provided', () => {
    const userEmail = 'test@example.com';
    render(<AccessDenied userEmail={userEmail} />);
    
    expect(screen.getByText('ログインしたアカウント:')).toBeInTheDocument();
    expect(screen.getByText(userEmail)).toBeInTheDocument();
  });

  it('does not display user email section when not provided', () => {
    render(<AccessDenied />);
    
    expect(screen.queryByText('ログインしたアカウント:')).not.toBeInTheDocument();
  });

  it('displays explanation about allowlist restrictions', () => {
    render(<AccessDenied />);
    
    expect(screen.getByText('なぜアクセスできないのですか？')).toBeInTheDocument();
    expect(screen.getByText('このアプリケーションは承認されたユーザーのみがアクセスできます')).toBeInTheDocument();
    expect(screen.getByText('あなたのメールアドレスが許可リストに登録されていません')).toBeInTheDocument();
    expect(screen.getByText('アクセス権限が必要な場合は、管理者にお問い合わせください')).toBeInTheDocument();
  });

  it('displays retry button when onRetry callback is provided', () => {
    const mockOnRetry = vi.fn();
    render(<AccessDenied onRetry={mockOnRetry} />);
    
    const retryButton = screen.getByRole('button', { name: '別のアカウントでログイン' });
    expect(retryButton).toBeInTheDocument();
  });

  it('does not display retry button when onRetry callback is not provided', () => {
    render(<AccessDenied />);
    
    expect(screen.queryByRole('button', { name: '別のアカウントでログイン' })).not.toBeInTheDocument();
  });

  it('calls onRetry callback when retry button is clicked', () => {
    const mockOnRetry = vi.fn();
    render(<AccessDenied onRetry={mockOnRetry} />);
    
    const retryButton = screen.getByRole('button', { name: '別のアカウントでログイン' });
    fireEvent.click(retryButton);
    
    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it('displays contact information', () => {
    render(<AccessDenied />);
    
    expect(screen.getByText('アクセス権限が必要な場合は、システム管理者にお問い合わせください。')).toBeInTheDocument();
  });

  it('renders with both userEmail and onRetry props', () => {
    const userEmail = 'denied@example.com';
    const mockOnRetry = vi.fn();
    
    render(<AccessDenied userEmail={userEmail} onRetry={mockOnRetry} />);
    
    // Check that both email and retry button are displayed
    expect(screen.getByText(userEmail)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '別のアカウントでログイン' })).toBeInTheDocument();
    
    // Test retry functionality
    const retryButton = screen.getByRole('button', { name: '別のアカウントでログイン' });
    fireEvent.click(retryButton);
    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it('has proper accessibility attributes', () => {
    render(<AccessDenied />);
    
    const title = screen.getByRole('heading', { level: 1 });
    expect(title).toHaveTextContent('アクセスが拒否されました');
    
    const subtitle = screen.getByRole('heading', { level: 2 });
    expect(subtitle).toHaveTextContent('なぜアクセスできないのですか？');
  });

  it('renders error icon', () => {
    const { container } = render(<AccessDenied />);
    
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('width', '64');
    expect(icon).toHaveAttribute('height', '64');
  });

  it('applies correct CSS classes', () => {
    const { container } = render(<AccessDenied />);
    
    expect(container.querySelector('.access-denied')).toBeInTheDocument();
    expect(container.querySelector('.access-denied-container')).toBeInTheDocument();
    expect(container.querySelector('.access-denied-icon')).toBeInTheDocument();
    expect(container.querySelector('.access-denied-title')).toBeInTheDocument();
    expect(container.querySelector('.access-denied-message')).toBeInTheDocument();
    expect(container.querySelector('.access-denied-explanation')).toBeInTheDocument();
    expect(container.querySelector('.access-denied-actions')).toBeInTheDocument();
  });

  it('handles long email addresses properly', () => {
    const longEmail = 'very.long.email.address.that.might.cause.layout.issues@verylongdomainname.com';
    render(<AccessDenied userEmail={longEmail} />);
    
    expect(screen.getByText(longEmail)).toBeInTheDocument();
  });

  it('maintains proper structure without props', () => {
    const { container } = render(<AccessDenied />);
    
    // Should still render main structure even without props
    expect(container.querySelector('.access-denied')).toBeInTheDocument();
    expect(screen.getByText('アクセスが拒否されました')).toBeInTheDocument();
    expect(screen.getByText('なぜアクセスできないのですか？')).toBeInTheDocument();
  });
});