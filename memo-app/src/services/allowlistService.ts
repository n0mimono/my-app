import { AuthErrorType } from '../types/auth';
import type { GoogleOAuthConfig, AuthError, AllowlistCheckResult } from '../types/auth';
import { configurationService } from './configurationService';

/**
 * 許可リスト管理サービス
 * 設定ファイルの読み込みとメールアドレス検証を提供
 */
export class AllowlistService {
  private config: GoogleOAuthConfig | null = null;
  private configUrl: string;

  constructor(configUrl?: string) {
    this.configUrl = configUrl || configurationService.getAuthConfigUrl();
  }

  /**
   * 設定ファイルを読み込む
   * @returns Promise<GoogleOAuthConfig>
   * @throws AuthError 設定ファイルの読み込みに失敗した場合
   */
  async loadConfig(): Promise<GoogleOAuthConfig> {
    try {
      const response = await fetch(this.configUrl);
      
      if (!response.ok) {
        throw new Error(`設定ファイルの読み込みに失敗しました: ${response.status} ${response.statusText}`);
      }

      const config = await response.json();
      
      // 設定ファイルの検証
      this.validateConfig(config);
      
      this.config = config;
      return config;
    } catch (error) {
      const authError: AuthError = {
        type: AuthErrorType.CONFIG_ERROR,
        message: error instanceof Error ? error.message : '設定ファイルの読み込みに失敗しました',
        retryable: true
      };
      throw authError;
    }
  }

  /**
   * 設定ファイルの形式を検証する
   * @param config 検証する設定オブジェクト
   * @throws Error 設定が無効な場合
   */
  private validateConfig(config: any): void {
    if (!config || typeof config !== 'object') {
      throw new Error('設定ファイルの形式が無効です');
    }

    if (!config.googleClientId || typeof config.googleClientId !== 'string') {
      throw new Error('googleClientId が設定されていないか、無効な形式です');
    }

    if (!Array.isArray(config.allowedEmails)) {
      throw new Error('allowedEmails が配列ではありません');
    }

    if (!config.version || typeof config.version !== 'string') {
      throw new Error('version が設定されていないか、無効な形式です');
    }

    // メールアドレスの形式チェック
    for (const email of config.allowedEmails) {
      if (typeof email !== 'string' || !this.isValidEmail(email)) {
        throw new Error(`無効なメールアドレスが含まれています: ${email}`);
      }
    }
  }

  /**
   * メールアドレスの形式を検証する
   * @param email 検証するメールアドレス
   * @returns boolean 有効な場合true
   */
  private isValidEmail(email: string): boolean {
    // 基本的な形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return false;
    }

    // 連続するドットをチェック
    if (email.includes('..')) {
      return false;
    }

    // ドメイン部分の先頭・末尾のドットをチェック
    const [, domain] = email.split('@');
    if (domain.startsWith('.') || domain.endsWith('.')) {
      return false;
    }

    return true;
  }

  /**
   * メールアドレスが許可リストに含まれているかチェックする
   * @param email チェックするメールアドレス
   * @returns Promise<AllowlistCheckResult>
   */
  async checkEmailAllowed(email: string): Promise<AllowlistCheckResult> {
    // 設定が読み込まれていない場合は読み込む
    if (!this.config) {
      await this.loadConfig();
    }

    if (!this.config) {
      return {
        isAllowed: false,
        email,
        reason: '設定ファイルが読み込まれていません'
      };
    }

    // メールアドレスの形式チェック
    if (!this.isValidEmail(email)) {
      return {
        isAllowed: false,
        email,
        reason: 'メールアドレスの形式が無効です'
      };
    }

    // 許可リストとの照合（大文字小文字を区別しない）
    const normalizedEmail = email.toLowerCase();
    const isAllowed = this.config.allowedEmails.some(
      allowedEmail => allowedEmail.toLowerCase() === normalizedEmail
    );

    return {
      isAllowed,
      email,
      reason: isAllowed ? undefined : 'このメールアドレスは許可リストに含まれていません'
    };
  }

  /**
   * 現在の設定を取得する
   * @returns GoogleOAuthConfig | null
   */
  getConfig(): GoogleOAuthConfig | null {
    return this.config;
  }

  /**
   * 許可されたメールアドレスのリストを取得する
   * @returns Promise<string[]>
   */
  async getAllowedEmails(): Promise<string[]> {
    if (!this.config) {
      await this.loadConfig();
    }
    return this.config?.allowedEmails || [];
  }

  /**
   * 設定を強制的に再読み込みする
   * @returns Promise<GoogleOAuthConfig>
   */
  async reloadConfig(): Promise<GoogleOAuthConfig> {
    this.config = null;
    return this.loadConfig();
  }
}

// デフォルトのサービスインスタンス
export const allowlistService = new AllowlistService();