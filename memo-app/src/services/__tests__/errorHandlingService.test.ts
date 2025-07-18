import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorHandlingService } from '../errorHandlingService';
import { AuthErrorType } from '../../types/auth';
import type { AuthError } from '../../types/auth';

describe('ErrorHandlingService', () => {
  let errorHandlingService: ErrorHandlingService;

  beforeEach(() => {
    errorHandlingService = new ErrorHandlingService({
      maxRetries: 2,
      retryDelay: 100,
      networkTimeoutMs: 1000,
      enableLogging: false // テスト中はログを無効化
    });
  });

  describe('handleError', () => {
    it('should handle AuthError correctly', () => {
      const authError: AuthError = {
        type: AuthErrorType.OAUTH_FAILED,
        message: 'OAuth failed',
        retryable: true
      };

      const result = errorHandlingService.handleError(authError, 'test');
      
      expect(result).toEqual(authError);
    });

    it('should convert network errors to AuthError', () => {
      const networkError = new Error('Network request failed');
      networkError.name = 'NetworkError';

      const result = errorHandlingService.handleError(networkError, 'test');
      
      expect(result.type).toBe(AuthErrorType.NETWORK_ERROR);
      expect(result.retryable).toBe(true);
      expect(result.message).toBe('Network request failed');
    });

    it('should convert generic errors to AuthError', () => {
      const genericError = new Error('Something went wrong');

      const result = errorHandlingService.handleError(genericError, 'test');
      
      expect(result.type).toBe(AuthErrorType.OAUTH_FAILED);
      expect(result.retryable).toBe(true);
      expect(result.message).toBe('Something went wrong');
    });

    it('should handle token expired errors', () => {
      const tokenError = new Error('Token has expired');

      const result = errorHandlingService.handleError(tokenError, 'test');
      
      expect(result.type).toBe(AuthErrorType.TOKEN_EXPIRED);
      expect(result.retryable).toBe(true);
    });

    it('should handle access denied errors', () => {
      const accessError = new Error('Access denied by server');

      const result = errorHandlingService.handleError(accessError, 'test');
      
      expect(result.type).toBe(AuthErrorType.ACCESS_DENIED);
      expect(result.retryable).toBe(false);
    });

    it('should handle config errors', () => {
      const configError = new Error('Invalid client_id provided');

      const result = errorHandlingService.handleError(configError, 'test');
      
      expect(result.type).toBe(AuthErrorType.CONFIG_ERROR);
      expect(result.retryable).toBe(false);
    });

    it('should handle unknown errors', () => {
      const unknownError = 'Unknown error string';

      const result = errorHandlingService.handleError(unknownError, 'test');
      
      expect(result.type).toBe(AuthErrorType.OAUTH_FAILED);
      expect(result.retryable).toBe(true);
      expect(result.message).toBe('Unknown error string');
    });
  });

  describe('executeWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success');

      const result = await errorHandlingService.executeWithRetry(
        mockOperation,
        { maxRetries: 2 },
        'test'
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.retryCount).toBe(0);
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');

      const result = await errorHandlingService.executeWithRetry(
        mockOperation,
        { maxRetries: 2, delay: 10 },
        'test'
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.retryCount).toBe(1);
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable errors', async () => {
      const accessError = new Error('Access denied by server');
      const mockOperation = vi.fn().mockRejectedValue(accessError);

      const result = await errorHandlingService.executeWithRetry(
        mockOperation,
        { maxRetries: 2 },
        'test'
      );

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(AuthErrorType.ACCESS_DENIED);
      expect(result.retryCount).toBe(0);
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should exhaust retries and return error', async () => {
      const networkError = new Error('Network error');
      const mockOperation = vi.fn().mockRejectedValue(networkError);

      const result = await errorHandlingService.executeWithRetry(
        mockOperation,
        { maxRetries: 2, delay: 10 },
        'test'
      );

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(AuthErrorType.NETWORK_ERROR);
      expect(result.retryCount).toBe(2);
      expect(mockOperation).toHaveBeenCalledTimes(3); // 初回 + 2回の再試行
    });

    it('should apply exponential backoff', async () => {
      const networkError = new Error('Network error');
      const mockOperation = vi.fn().mockRejectedValue(networkError);
      
      const startTime = Date.now();
      
      await errorHandlingService.executeWithRetry(
        mockOperation,
        { maxRetries: 2, delay: 50, backoffMultiplier: 2 },
        'test'
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 最初の遅延50ms + 2回目の遅延100ms = 最低150ms
      expect(duration).toBeGreaterThan(140);
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });
  });

  describe('executeWithTimeout', () => {
    it('should complete operation within timeout', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success');

      const result = await errorHandlingService.executeWithTimeout(
        mockOperation,
        1000
      );

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should timeout long-running operations', async () => {
      const mockOperation = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('success'), 2000))
      );

      await expect(
        errorHandlingService.executeWithTimeout(mockOperation, 100)
      ).rejects.toThrow('操作がタイムアウトしました');
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('should return user-friendly message for OAUTH_FAILED', () => {
      const error: AuthError = {
        type: AuthErrorType.OAUTH_FAILED,
        message: 'OAuth failed',
        retryable: true
      };

      const message = errorHandlingService.getUserFriendlyMessage(error);
      
      expect(message).toBe('Googleログインに失敗しました。もう一度お試しください。');
    });

    it('should return user-friendly message for ACCESS_DENIED', () => {
      const error: AuthError = {
        type: AuthErrorType.ACCESS_DENIED,
        message: 'Access denied',
        retryable: false
      };

      const message = errorHandlingService.getUserFriendlyMessage(error);
      
      expect(message).toBe('アクセスが拒否されました。管理者にお問い合わせください。');
    });

    it('should return user-friendly message for NETWORK_ERROR', () => {
      const error: AuthError = {
        type: AuthErrorType.NETWORK_ERROR,
        message: 'Network error',
        retryable: true
      };

      const message = errorHandlingService.getUserFriendlyMessage(error);
      
      expect(message).toBe('ネットワークエラーが発生しました。インターネット接続を確認してください。');
    });

    it('should return user-friendly message for TOKEN_EXPIRED', () => {
      const error: AuthError = {
        type: AuthErrorType.TOKEN_EXPIRED,
        message: 'Token expired',
        retryable: true
      };

      const message = errorHandlingService.getUserFriendlyMessage(error);
      
      expect(message).toBe('セッションが期限切れです。再度ログインしてください。');
    });

    it('should return user-friendly message for CONFIG_ERROR', () => {
      const error: AuthError = {
        type: AuthErrorType.CONFIG_ERROR,
        message: 'Config error',
        retryable: false
      };

      const message = errorHandlingService.getUserFriendlyMessage(error);
      
      expect(message).toBe('システム設定エラーが発生しました。管理者にお問い合わせください。');
    });

    it('should return original message for unknown error types', () => {
      const error: AuthError = {
        type: 'UNKNOWN_ERROR' as any,
        message: 'Unknown error occurred',
        retryable: true
      };

      const message = errorHandlingService.getUserFriendlyMessage(error);
      
      expect(message).toBe('Unknown error occurred');
    });
  });

  describe('isRetryable', () => {
    it('should return true for retryable errors', () => {
      const error: AuthError = {
        type: AuthErrorType.NETWORK_ERROR,
        message: 'Network error',
        retryable: true
      };

      expect(errorHandlingService.isRetryable(error)).toBe(true);
    });

    it('should return false for non-retryable errors', () => {
      const error: AuthError = {
        type: AuthErrorType.ACCESS_DENIED,
        message: 'Access denied',
        retryable: false
      };

      expect(errorHandlingService.isRetryable(error)).toBe(false);
    });
  });

  describe('getErrorSeverity', () => {
    it('should return critical for CONFIG_ERROR', () => {
      const error: AuthError = {
        type: AuthErrorType.CONFIG_ERROR,
        message: 'Config error',
        retryable: false
      };

      expect(errorHandlingService.getErrorSeverity(error)).toBe('critical');
    });

    it('should return high for ACCESS_DENIED', () => {
      const error: AuthError = {
        type: AuthErrorType.ACCESS_DENIED,
        message: 'Access denied',
        retryable: false
      };

      expect(errorHandlingService.getErrorSeverity(error)).toBe('high');
    });

    it('should return medium for TOKEN_EXPIRED', () => {
      const error: AuthError = {
        type: AuthErrorType.TOKEN_EXPIRED,
        message: 'Token expired',
        retryable: true
      };

      expect(errorHandlingService.getErrorSeverity(error)).toBe('medium');
    });

    it('should return medium for NETWORK_ERROR', () => {
      const error: AuthError = {
        type: AuthErrorType.NETWORK_ERROR,
        message: 'Network error',
        retryable: true
      };

      expect(errorHandlingService.getErrorSeverity(error)).toBe('medium');
    });

    it('should return low for OAUTH_FAILED', () => {
      const error: AuthError = {
        type: AuthErrorType.OAUTH_FAILED,
        message: 'OAuth failed',
        retryable: true
      };

      expect(errorHandlingService.getErrorSeverity(error)).toBe('low');
    });
  });

  describe('network error detection', () => {
    it('should detect network errors by message content', () => {
      const errors = [
        new Error('Network request failed'),
        new Error('Fetch error occurred'),
        new Error('Connection timeout'),
        new Error('Network connection lost')
      ];

      errors.forEach(error => {
        const result = errorHandlingService.handleError(error, 'test');
        expect(result.type).toBe(AuthErrorType.NETWORK_ERROR);
      });
    });

    it('should detect network errors by error name', () => {
      const networkError = new Error('Request failed');
      networkError.name = 'NetworkError';

      const timeoutError = new Error('Request timed out');
      timeoutError.name = 'TimeoutError';

      const networkResult = errorHandlingService.handleError(networkError, 'test');
      const timeoutResult = errorHandlingService.handleError(timeoutError, 'test');

      expect(networkResult.type).toBe(AuthErrorType.NETWORK_ERROR);
      expect(timeoutResult.type).toBe(AuthErrorType.NETWORK_ERROR);
    });
  });
});