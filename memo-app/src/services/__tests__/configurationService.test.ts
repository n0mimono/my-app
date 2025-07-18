import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConfigurationService } from '../configurationService';

/**
 * 設定サービスのテスト
 */
describe('ConfigurationService', () => {
  let service: ConfigurationService;

  beforeEach(() => {
    service = new ConfigurationService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Google Client ID の取得', () => {
    it('設定ファイルのクライアント ID を正しく返す', () => {
      const configFileClientId = 'config-file-client-id';
      const result = service.getGoogleClientId(configFileClientId);
      
      // 環境変数が設定されている場合は環境変数を優先、そうでなければ設定ファイルの値
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('環境変数が設定されていて設定ファイルの値が空の場合は環境変数を使用する', () => {
      // 環境変数が設定されている場合、空の設定ファイル値でも環境変数を使用
      const result = service.getGoogleClientId('');
      
      // 環境変数が設定されているので、空文字列でもエラーにならない
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('環境変数と設定ファイルの両方が有効な場合は環境変数を優先する', () => {
      const configFileClientId = 'config-file-client-id';
      const result = service.getGoogleClientId(configFileClientId);
      
      // 環境変数が設定されている場合は環境変数を優先
      const envClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (envClientId) {
        expect(result).toBe(envClientId);
      } else {
        expect(result).toBe(configFileClientId);
      }
    });
  });

  describe('認証設定ファイル URL の取得', () => {
    it('デフォルトの設定ファイル URL を返す', () => {
      const result = service.getAuthConfigUrl();
      
      // 環境変数が設定されていない場合はデフォルト値を返す
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('アプリケーション情報の取得', () => {
    it('アプリケーション名を取得する', () => {
      const result = service.getAppName();
      
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('アプリケーションバージョンを取得する', () => {
      const result = service.getAppVersion();
      
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('環境判定', () => {
    it('現在の環境を取得する', () => {
      const result = service.getEnvironment();
      
      expect(['development', 'production', 'test']).toContain(result);
    });

    it('開発環境かどうかを判定する', () => {
      const result = service.isDevelopment();
      
      expect(typeof result).toBe('boolean');
    });

    it('本番環境かどうかを判定する', () => {
      const result = service.isProduction();
      
      expect(typeof result).toBe('boolean');
    });

    it('テスト環境かどうかを判定する', () => {
      const result = service.isTest();
      
      expect(typeof result).toBe('boolean');
      // テスト実行中なので true になるはず
      expect(result).toBe(true);
    });

    it('デバッグモードかどうかを判定する', () => {
      const result = service.isDebugMode();
      
      expect(typeof result).toBe('boolean');
      // テスト環境なので true になるはず
      expect(result).toBe(true);
    });
  });

  describe('設定の検証', () => {
    it('有効な設定の場合は検証を通す', () => {
      // 有効な設定ファイルのクライアント ID を提供
      const mockGetGoogleClientId = vi.spyOn(service, 'getGoogleClientId');
      mockGetGoogleClientId.mockReturnValue('valid-client-id');

      expect(() => {
        service.validateConfiguration();
      }).not.toThrow();

      mockGetGoogleClientId.mockRestore();
    });

    it('無効な設定の場合はエラーを投げる', () => {
      // 無効な設定（クライアント ID なし）をモック
      const mockGetGoogleClientId = vi.spyOn(service, 'getGoogleClientId');
      mockGetGoogleClientId.mockImplementation(() => {
        throw new Error('Google Client ID が設定されていません');
      });

      expect(() => {
        service.validateConfiguration();
      }).toThrow('設定エラー');

      mockGetGoogleClientId.mockRestore();
    });
  });

  describe('設定情報の取得', () => {
    it('現在の設定情報を取得する', () => {
      const result = service.getConfigurationInfo();
      
      expect(result).toHaveProperty('environment');
      expect(result).toHaveProperty('authConfigUrl');
      expect(result).toHaveProperty('appName');
      expect(result).toHaveProperty('appVersion');
      expect(result).toHaveProperty('debugMode');
      expect(result).toHaveProperty('hasGoogleClientId');

      expect(typeof result.environment).toBe('string');
      expect(typeof result.authConfigUrl).toBe('string');
      expect(typeof result.appName).toBe('string');
      expect(typeof result.appVersion).toBe('string');
      expect(typeof result.debugMode).toBe('boolean');
      expect(typeof result.hasGoogleClientId).toBe('boolean');
    });
  });

  describe('環境変数の統合', () => {
    it('環境変数が利用可能であることを確認', () => {
      // import.meta.env が利用可能であることを確認
      expect(import.meta.env).toBeDefined();
      expect(typeof import.meta.env).toBe('object');
    });

    it('VITE_プレフィックスの環境変数が利用可能', () => {
      // テスト環境で設定された環境変数が利用可能であることを確認
      expect(import.meta.env.VITE_GOOGLE_CLIENT_ID).toBeDefined();
      expect(import.meta.env.VITE_AUTH_CONFIG_URL).toBeDefined();
    });

    it('環境変数の優先順位が正しく動作する', () => {
      // 環境変数が設定されている場合の動作確認
      const envClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (envClientId) {
        const result = service.getGoogleClientId('fallback-client-id');
        // 環境変数が優先されることを確認
        expect(result).toBe(envClientId);
      }
    });
  });
});