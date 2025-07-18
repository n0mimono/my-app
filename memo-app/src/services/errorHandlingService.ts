import type { AuthError } from '../types/auth';
import { AuthErrorType } from '../types/auth';

/**
 * エラーハンドリング設定
 */
export interface ErrorHandlingConfig {
  maxRetries: number;
  retryDelay: number;
  networkTimeoutMs: number;
  enableLogging: boolean;
}

/**
 * 再試行設定
 */
export interface RetryConfig {
  maxRetries: number;
  delay: number;
  backoffMultiplier: number;
  maxDelay: number;
}

/**
 * エラーハンドリング結果
 */
export interface ErrorHandlingResult<T = any> {
  success: boolean;
  data?: T;
  error?: AuthError;
  retryCount: number;
}

/**
 * 統一エラーハンドリングサービス
 * 認証エラーの統一的な処理、再試行機能、ネットワークエラー処理を提供
 * 
 * 要件: 6.1, 6.2, 6.3, 6.4, 6.5
 */
export class ErrorHandlingService {
  private config: ErrorHandlingConfig;
  private defaultRetryConfig: RetryConfig;

  constructor(config?: Partial<ErrorHandlingConfig>) {
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      networkTimeoutMs: 10000,
      enableLogging: true,
      ...config
    };

    this.defaultRetryConfig = {
      maxRetries: this.config.maxRetries,
      delay: this.config.retryDelay,
      backoffMultiplier: 2,
      maxDelay: 10000
    };
  }

  /**
   * 統一エラーハンドリング
   * エラーを分析し、適切な処理を実行する
   * 
   * @param error 発生したエラー
   * @param context エラーが発生したコンテキスト
   * @returns 処理されたAuthError
   */
  handleError(error: unknown, context: string = 'unknown'): AuthError {
    let authError: AuthError;

    if (this.isAuthError(error)) {
      authError = error;
    } else if (this.isNetworkError(error)) {
      authError = this.createNetworkError(error);
    } else if (error instanceof Error) {
      authError = this.createGenericError(error);
    } else {
      authError = this.createUnknownError(error);
    }

    // エラーログ記録
    if (this.config.enableLogging) {
      this.logError(authError, context);
    }

    return authError;
  }

  /**
   * 再試行機能付きの非同期操作実行
   * 
   * @param operation 実行する非同期操作
   * @param retryConfig 再試行設定（オプション）
   * @param context 操作のコンテキスト
   * @returns ErrorHandlingResult
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    retryConfig?: Partial<RetryConfig>,
    context: string = 'operation'
  ): Promise<ErrorHandlingResult<T>> {
    const config = { ...this.defaultRetryConfig, ...retryConfig };
    let lastError: AuthError | null = null;
    let retryCount = 0;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        const data = await this.executeWithTimeout(operation, this.config.networkTimeoutMs);
        
        return {
          success: true,
          data,
          retryCount: attempt
        };
      } catch (error) {
        lastError = this.handleError(error, context);

        // 再試行不可能なエラーの場合は即座に終了
        if (!lastError.retryable || attempt === config.maxRetries) {
          retryCount = attempt;
          break;
        }

        // 再試行前の待機
        const delay = Math.min(
          config.delay * Math.pow(config.backoffMultiplier, attempt),
          config.maxDelay
        );
        
        if (this.config.enableLogging) {
          console.warn(`${context}: 再試行 ${attempt + 1}/${config.maxRetries} (${delay}ms後)`);
        }

        await this.sleep(delay);
        retryCount = attempt + 1;
      }
    }

    return {
      success: false,
      error: lastError || this.createUnknownError('操作が失敗しました'),
      retryCount
    };
  }

  /**
   * ネットワークエラーの検出と処理
   * 
   * @param operation 実行する非同期操作
   * @param timeoutMs タイムアウト時間（ミリ秒）
   * @returns Promise<T>
   */
  async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number = this.config.networkTimeoutMs
  ): Promise<T> {
    return Promise.race([
      operation(),
      this.createTimeoutPromise<T>(timeoutMs)
    ]);
  }

  /**
   * エラーメッセージの生成
   * ユーザーフレンドリーなエラーメッセージを生成する
   * 
   * @param error AuthError
   * @returns ユーザー向けメッセージ
   */
  getUserFriendlyMessage(error: AuthError): string {
    switch (error.type) {
      case AuthErrorType.OAUTH_FAILED:
        return 'Googleログインに失敗しました。もう一度お試しください。';
      
      case AuthErrorType.ACCESS_DENIED:
        return 'アクセスが拒否されました。管理者にお問い合わせください。';
      
      case AuthErrorType.NETWORK_ERROR:
        return 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
      
      case AuthErrorType.TOKEN_EXPIRED:
        return 'セッションが期限切れです。再度ログインしてください。';
      
      case AuthErrorType.CONFIG_ERROR:
        return 'システム設定エラーが発生しました。管理者にお問い合わせください。';
      
      default:
        return error.message || '予期しないエラーが発生しました。';
    }
  }

  /**
   * エラーの再試行可能性を判定
   * 
   * @param error AuthError
   * @returns 再試行可能かどうか
   */
  isRetryable(error: AuthError): boolean {
    return error.retryable;
  }

  /**
   * エラーの重要度を判定
   * 
   * @param error AuthError
   * @returns エラーの重要度 ('low' | 'medium' | 'high' | 'critical')
   */
  getErrorSeverity(error: AuthError): 'low' | 'medium' | 'high' | 'critical' {
    switch (error.type) {
      case AuthErrorType.CONFIG_ERROR:
        return 'critical';
      
      case AuthErrorType.ACCESS_DENIED:
        return 'high';
      
      case AuthErrorType.TOKEN_EXPIRED:
        return 'medium';
      
      case AuthErrorType.NETWORK_ERROR:
        return 'medium';
      
      case AuthErrorType.OAUTH_FAILED:
        return 'low';
      
      default:
        return 'medium';
    }
  }

  // プライベートメソッド

  /**
   * AuthErrorかどうかを判定
   */
  private isAuthError(error: unknown): error is AuthError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'type' in error &&
      'message' in error &&
      'retryable' in error
    );
  }

  /**
   * ネットワークエラーかどうかを判定
   */
  private isNetworkError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('network') ||
        message.includes('fetch') ||
        message.includes('timeout') ||
        message.includes('connection') ||
        error.name === 'NetworkError' ||
        error.name === 'TimeoutError'
      );
    }
    return false;
  }

  /**
   * ネットワークエラーを作成
   */
  private createNetworkError(error: unknown): AuthError {
    const message = error instanceof Error ? error.message : 'ネットワークエラーが発生しました';
    
    return {
      type: AuthErrorType.NETWORK_ERROR,
      message,
      retryable: true
    };
  }

  /**
   * 一般的なエラーを作成
   */
  private createGenericError(error: Error): AuthError {
    // エラーメッセージからエラータイプを推測
    const message = error.message.toLowerCase();
    
    if (message.includes('token') && message.includes('expired')) {
      return {
        type: AuthErrorType.TOKEN_EXPIRED,
        message: error.message,
        retryable: true
      };
    }
    
    if (message.includes('access') && message.includes('denied')) {
      return {
        type: AuthErrorType.ACCESS_DENIED,
        message: error.message,
        retryable: false
      };
    }
    
    if (message.includes('config') || message.includes('client_id')) {
      return {
        type: AuthErrorType.CONFIG_ERROR,
        message: error.message,
        retryable: false
      };
    }
    
    return {
      type: AuthErrorType.OAUTH_FAILED,
      message: error.message,
      retryable: true
    };
  }

  /**
   * 不明なエラーを作成
   */
  private createUnknownError(error: unknown): AuthError {
    return {
      type: AuthErrorType.OAUTH_FAILED,
      message: typeof error === 'string' ? error : '予期しないエラーが発生しました',
      retryable: true
    };
  }

  /**
   * タイムアウトPromiseを作成
   */
  private createTimeoutPromise<T>(timeoutMs: number): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`操作がタイムアウトしました (${timeoutMs}ms)`));
      }, timeoutMs);
    });
  }

  /**
   * 指定時間待機
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * エラーログを記録
   */
  private logError(error: AuthError, context: string): void {
    const severity = this.getErrorSeverity(error);
    const logMethod = severity === 'critical' ? 'error' : 
                     severity === 'high' ? 'error' : 
                     severity === 'medium' ? 'warn' : 'info';
    
    console[logMethod](`[${context}] ${error.type}: ${error.message}`, {
      type: error.type,
      retryable: error.retryable,
      severity,
      timestamp: new Date().toISOString()
    });
  }
}

// デフォルトのエラーハンドリングサービスインスタンス
export const errorHandlingService = new ErrorHandlingService();