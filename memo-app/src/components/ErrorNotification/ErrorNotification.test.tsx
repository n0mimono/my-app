import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ErrorNotification from './index';

describe('ErrorNotification', () => {
  it('renders error notification with correct message and type', () => {
    render(
      <ErrorNotification 
        error="Test error message" 
        type="error"
      />
    );
    
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
    expect(screen.getByText('⚠️')).toBeInTheDocument();
  });

  it('renders warning notification with correct icon', () => {
    render(
      <ErrorNotification 
        error="Test warning message" 
        type="warning"
      />
    );
    
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Test warning message')).toBeInTheDocument();
    expect(screen.getByText('⚠️')).toBeInTheDocument();
  });

  it('renders info notification with correct icon', () => {
    render(
      <ErrorNotification 
        error="Test info message" 
        type="info"
      />
    );
    
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Test info message')).toBeInTheDocument();
    expect(screen.getByText('ℹ️')).toBeInTheDocument();
  });

  it('does not render when error is null', () => {
    render(<ErrorNotification error={null} />);
    
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button is clicked', () => {
    const onDismiss = vi.fn();
    
    render(
      <ErrorNotification 
        error="Test error" 
        onDismiss={onDismiss}
      />
    );
    
    const dismissButton = screen.getByLabelText('通知を閉じる');
    fireEvent.click(dismissButton);
    
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('auto-hides after specified duration', async () => {
    const onDismiss = vi.fn();
    
    render(
      <ErrorNotification 
        error="Test error" 
        autoHide={true}
        duration={100}
        onDismiss={onDismiss}
      />
    );
    
    expect(screen.getByRole('alert')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(onDismiss).toHaveBeenCalledOnce();
    }, { timeout: 200 });
  });

  it('has proper accessibility attributes', () => {
    render(<ErrorNotification error="Test error" />);
    
    const notification = screen.getByRole('alert');
    expect(notification).toBeInTheDocument();
    
    const dismissButton = screen.getByLabelText('通知を閉じる');
    expect(dismissButton).toBeInTheDocument();
  });

  it('applies correct CSS classes based on type', () => {
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