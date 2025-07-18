import { useEffect, useState } from 'react';
import type { AuthError } from '../../types/auth';
import { errorHandlingService } from '../../services/errorHandlingService';
import './ErrorNotification.css';

export interface ErrorNotificationProps {
  error: string | AuthError | null;
  type?: 'error' | 'warning' | 'info';
  autoHide?: boolean;
  duration?: number;
  showRetry?: boolean;
  onDismiss?: () => void;
  onRetry?: () => void;
}

const ErrorNotification: React.FC<ErrorNotificationProps> = ({
  error,
  type,
  autoHide = false,
  duration = 5000,
  showRetry = false,
  onDismiss,
  onRetry
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  // エラーがAuthErrorかどうかを判定
  const isAuthError = (err: string | AuthError | null): err is AuthError => {
    return typeof err === 'object' && err !== null && 'type' in err;
  };

  // エラーメッセージを取得
  const getErrorMessage = (): string => {
    if (!error) return '';
    
    if (isAuthError(error)) {
      return errorHandlingService.getUserFriendlyMessage(error);
    }
    
    return typeof error === 'string' ? error : '予期しないエラーが発生しました';
  };

  // 再試行可能かどうかを判定
  const isRetryable = (): boolean => {
    if (!isAuthError(error)) return false;
    return errorHandlingService.isRetryable(error);
  };

  // エラーの重要度を取得
  const getErrorSeverity = (): 'low' | 'medium' | 'high' | 'critical' => {
    if (!isAuthError(error)) return 'medium';
    return errorHandlingService.getErrorSeverity(error);
  };

  // 重要度に基づいてタイプを決定
  const getNotificationType = (): 'error' | 'warning' | 'info' => {
    // 明示的にタイプが指定された場合はそれを使用
    if (type) return type;
    
    // タイプが指定されていない場合、エラーの重要度に基づいて決定
    const severity = getErrorSeverity();
    switch (severity) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'error';
    }
  };

  useEffect(() => {
    if (error) {
      setIsVisible(true);
      
      if (autoHide) {
        const timer = setTimeout(() => {
          setIsVisible(false);
          onDismiss?.();
        }, duration);
        
        return () => clearTimeout(timer);
      }
    } else {
      setIsVisible(false);
    }
  }, [error, autoHide, duration, onDismiss]);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  const handleRetry = async () => {
    if (!onRetry || isRetrying) return;
    
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  if (!error || !isVisible) {
    return null;
  }

  const notificationType = getNotificationType();
  const errorMessage = getErrorMessage();
  const canRetry = (showRetry || isRetryable()) && onRetry;

  return (
    <div className={`error-notification error-notification--${notificationType}`} role="alert">
      <div className="error-notification__content">
        <div className="error-notification__icon">
          {notificationType === 'error' && '⚠️'}
          {notificationType === 'warning' && '⚠️'}
          {notificationType === 'info' && 'ℹ️'}
        </div>
        <div className="error-notification__message">
          {errorMessage}
        </div>
        <div className="error-notification__actions">
          {canRetry && (
            <button
              className="error-notification__retry"
              onClick={handleRetry}
              disabled={isRetrying}
              aria-label="再試行"
            >
              {isRetrying ? '再試行中...' : '再試行'}
            </button>
          )}
          <button
            className="error-notification__dismiss"
            onClick={handleDismiss}
            aria-label="通知を閉じる"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorNotification;