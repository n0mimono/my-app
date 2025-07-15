import { useEffect, useState } from 'react';
import './ErrorNotification.css';

export interface ErrorNotificationProps {
  error: string | null;
  type?: 'error' | 'warning' | 'info';
  autoHide?: boolean;
  duration?: number;
  onDismiss?: () => void;
}

const ErrorNotification: React.FC<ErrorNotificationProps> = ({
  error,
  type = 'error',
  autoHide = false,
  duration = 5000,
  onDismiss
}) => {
  const [isVisible, setIsVisible] = useState(false);

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

  if (!error || !isVisible) {
    return null;
  }

  return (
    <div className={`error-notification error-notification--${type}`} role="alert">
      <div className="error-notification__content">
        <div className="error-notification__icon">
          {type === 'error' && '⚠️'}
          {type === 'warning' && '⚠️'}
          {type === 'info' && 'ℹ️'}
        </div>
        <div className="error-notification__message">
          {error}
        </div>
        <button
          className="error-notification__dismiss"
          onClick={handleDismiss}
          aria-label="通知を閉じる"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default ErrorNotification;