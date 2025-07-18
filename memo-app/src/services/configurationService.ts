/**
 * 設定管理サービス
 * 環境変数と設定ファイルの統合管理を提供
 */
export class ConfigurationService {
  /**
   * Google Client ID を取得する
   * 環境変数が設定されている場合は環境変数を優先し、
   * そうでなければ設定ファイルから取得する
   * @param configFileClientId 設定ファイルから取得したクライアント ID
   * @returns string Google Client ID
   */
  getGoogleClientId(configFileClientId?: string): string {
    // 環境変数を最優先
    const envClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (envClientId && envClientId.trim() !== '') {
      return envClientId.trim();
    }

    // 設定ファイルの値を使用
    if (configFileClientId && configFileClientId.trim() !== '') {
      return configFileClientId.trim();
    }

    // どちらも設定されていない場合はエラー
    throw new Error('Google Client ID が設定されていません。環境変数 VITE_GOOGLE_CLIENT_ID または設定ファイルで設定してください。');
  }

  /**
   * 認証設定ファイルの URL を取得する
   * @returns string 設定ファイルの URL
   */
  getAuthConfigUrl(): string {
    const envConfigUrl = import.meta.env.VITE_AUTH_CONFIG_URL;
    if (envConfigUrl && envConfigUrl.trim() !== '') {
      return envConfigUrl.trim();
    }

    // デフォルト値
    return '/auth-config.json';
  }

  /**
   * アプリケーション名を取得する
   * @returns string アプリケーション名
   */
  getAppName(): string {
    const envAppName = import.meta.env.VITE_APP_NAME;
    if (envAppName && envAppName.trim() !== '') {
      return envAppName.trim();
    }

    return 'Memo App';
  }

  /**
   * アプリケーションバージョンを取得する
   * @returns string アプリケーションバージョン
   */
  getAppVersion(): string {
    const envAppVersion = import.meta.env.VITE_APP_VERSION;
    if (envAppVersion && envAppVersion.trim() !== '') {
      return envAppVersion.trim();
    }

    return '1.0.0';
  }

  /**
   * 現在の環境を取得する
   * @returns 'development' | 'production' | 'test'
   */
  getEnvironment(): 'development' | 'production' | 'test' {
    const mode = import.meta.env.MODE;
    
    if (mode === 'test') {
      return 'test';
    }
    
    if (import.meta.env.PROD) {
      return 'production';
    }
    
    return 'development';
  }

  /**
   * 開発環境かどうかを判定する
   * @returns boolean 開発環境の場合 true
   */
  isDevelopment(): boolean {
    return this.getEnvironment() === 'development';
  }

  /**
   * 本番環境かどうかを判定する
   * @returns boolean 本番環境の場合 true
   */
  isProduction(): boolean {
    return this.getEnvironment() === 'production';
  }

  /**
   * テスト環境かどうかを判定する
   * @returns boolean テスト環境の場合 true
   */
  isTest(): boolean {
    return this.getEnvironment() === 'test';
  }

  /**
   * デバッグモードが有効かどうかを判定する
   * @returns boolean デバッグモードの場合 true
   */
  isDebugMode(): boolean {
    // 開発環境またはテスト環境の場合はデバッグモード
    return this.isDevelopment() || this.isTest();
  }

  /**
   * 設定の検証を行う
   * @throws Error 必須設定が不足している場合
   */
  validateConfiguration(): void {
    const errors: string[] = [];

    // Google Client ID の検証
    try {
      this.getGoogleClientId();
    } catch (error) {
      errors.push('Google Client ID が設定されていません');
    }

    // 設定ファイル URL の検証
    const configUrl = this.getAuthConfigUrl();
    if (!configUrl || configUrl.trim() === '') {
      errors.push('認証設定ファイルの URL が設定されていません');
    }

    if (errors.length > 0) {
      throw new Error(`設定エラー: ${errors.join(', ')}`);
    }
  }

  /**
   * 現在の設定情報を取得する（デバッグ用）
   * @returns object 設定情報
   */
  getConfigurationInfo(): {
    environment: string;
    authConfigUrl: string;
    appName: string;
    appVersion: string;
    debugMode: boolean;
    hasGoogleClientId: boolean;
  } {
    return {
      environment: this.getEnvironment(),
      authConfigUrl: this.getAuthConfigUrl(),
      appName: this.getAppName(),
      appVersion: this.getAppVersion(),
      debugMode: this.isDebugMode(),
      hasGoogleClientId: !!import.meta.env.VITE_GOOGLE_CLIENT_ID
    };
  }
}

// デフォルトのサービスインスタンス
export const configurationService = new ConfigurationService();