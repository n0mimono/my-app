import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GoogleAuthService, googleAuthService } from '../googleAuthService';
import { allowlistService } from '../allowlistService';
import { AuthErrorType } from '../../types/auth';
import type { GoogleOAuthConfig, AllowlistCheckResult } from '../../types/auth';

// モック設定
vi.mock('../allowlistService');

// Google API のモック
const mockGoogleAPI = {
  accounts: {
    id: {
      initialize: vi.fn(),
      prompt: vi.fn(),
      disableAutoSelect: vi.fn()
    }
  }
};

// LocalStorage のモック
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

// Window オブジェクトのモック
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

Object.defineProperty(window, 'google', {
  value: mockGoogleAPI,
  writable: true
});

// Fetch のモック
global.fetch = vi.fn();

// atob のモック
global.atob = vi.fn();

// btoa のモック
global.btoa = vi.fn();

describe('GoogleAuthService', () => {
  let service: GoogleAuthService;
  const mockConfig: GoogleOAuthConfig = {
    googleClientId: 'test-client-id',
    allowedEmails: ['test@example.com'],
    version: '1.0.0'
  };

  beforeEach(() => {
    service = new GoogleAuthService();
    vi.clearAllMocks();
    
    // デフォルトのモック設定
    vi.mocked(allowlistService.loadConfig).mockResolvedValue(mockConfig);
    vi.mocked(allowlistService.checkEmailAllowed).mockResolvedValue({
      isAllowed: true,
      email: 'test@example.com'
    });

    // Google API を常に利用可能にする
    (window as any).google = mockGoogleAPI;

    // Google API スクリプトの読み込みをモック
    const mockScript = {
      onload: null as any,
      onerror: null as any,
      src: '',
      async: false,
      defer: false
    };
    
    vi.spyOn(document, 'createElement').mockReturnValue(mockScript as any);
    vi.spyOn(document.head, 'appendChild').mockImplementation((script: any) => {
      // スクリプトが追加されたら即座に onload を呼ぶ
      setTimeout(() => {
        if (script.onload) {
          script.onload();
        }
      }, 0);
      return script;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialize', () => {
    it('正常に初期化できる', async () => {
      await expect(service.initialize()).resolves.not.toThrow();
      
      expect(allowlistService.loadConfig).toHaveBeenCalled();
      expect(mockGoogleAPI.accounts.id.initialize).toHaveBeenCalledWith({
        client_id: mockConfig.googleClientId,
        callback: expect.any(Function),
        auto_select: false,
        cancel_on_tap_outside: true
      });
    });

    it('設定の読み込みに失敗した場合、エラーを投げる', async () => {
      const configError = {
        type: AuthErrorType.CONFIG_ERROR,
        message: '設定ファイルが見つかりません',
        retryable: true
      };
      vi.mocked(allowlistService.loadConfig).mockRejectedValue(configError);

      await expect(service.initialize()).rejects.toMatchObject({
        type: AuthErrorType.CONFIG_ERROR,
        retryable: true
      });
    });

    it('Google API の読み込みに失敗した場合、エラーを投げる', async () => {
      // Google API が利用できない状態をシミュレート
      (window as any).google = undefined;
      
      vi.spyOn(document.head, 'appendChild').mockImplementation((script: any) => {
        // onerror を即座に呼ぶ
        setTimeout(() => {
          if (script.onerror) {
            script.onerror();
          }
        }, 0);
        return script;
      });

      await expect(service.initialize()).rejects.toMatchObject({
        type: AuthErrorType.CONFIG_ERROR,
        retryable: true
      });
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('Google One Tap プロンプトを表示する', async () => {
      const mockPromptCallback = vi.fn();
      mockGoogleAPI.accounts.id.prompt.mockImplementation((callback) => {
        // プロンプトが表示されない場合をシミュレート
        const notification = {
          isNotDisplayed: () => true,
          isSkippedMoment: () => false
        };
        callback(notification);
      });

      // ポップアップのモック
      const mockPopup = {
        closed: false,
        close: vi.fn()
      };
      vi.spyOn(window, 'open').mockReturnValue(mockPopup as any);

      // login メソッドを呼び出すが、ポップアップの処理は完了を待たない
      const loginPromise = service.login();
      
      // プロンプトが呼ばれることを確認
      expect(mockGoogleAPI.accounts.id.prompt).toHaveBeenCalled();

      // ポップアップが開かれることを確認
      expect(window.open).toHaveBeenCalledWith(
        expect.stringContaining('accounts.google.com/o/oauth2/v2/auth'),
        'google-login',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      // ポップアップを閉じてキャンセルをシミュレート
      mockPopup.closed = true;
      
      // 結果を待つ（タイムアウトまたはキャンセル）
      await expect(loginPromise).rejects.toMatchObject({
        success: false,
        error: {
          type: AuthErrorType.OAUTH_FAILED,
          retryable: true
        }
      });
    });

    it('初期化されていない場合、自動的に初期化する', async () => {
      const uninitializedService = new GoogleAuthService();
      
      // ログインを試行（初期化されていない状態）
      const loginPromise = uninitializedService.login();
      
      // 短時間待ってから初期化が呼ばれることを確認
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(allowlistService.loadConfig).toHaveBeenCalled();
      
      // プロミスを解決するためにタイムアウトを発生させる
      await expect(loginPromise).rejects.toMatchObject({
        success: false,
        error: {
          type: AuthErrorType.OAUTH_FAILED,
          retryable: true
        }
      });
    }, 35000); // タイムアウトを35秒に設定（30秒のタイムアウト + 余裕）
  });

  describe('logout', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('正常にログアウトできる', async () => {
      // ローカルストレージにデータを設定
      mockLocalStorage.getItem.mockReturnValue('test-token');

      await service.logout();

      expect(mockGoogleAPI.accounts.id.disableAutoSelect).toHaveBeenCalled();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('google_access_token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('google_id_token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('google_refresh_token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('google_token_expiry');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('google_user_info');
    });

    it('Google API が利用できない場合でもローカル状態をクリアする', async () => {
      // Google API を無効にする
      (window as any).google = undefined;

      await service.logout();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('google_access_token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('google_id_token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('google_refresh_token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('google_token_expiry');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('google_user_info');
    });
  });

  describe('getCurrentUser', () => {
    const mockJWTPayload = {
      sub: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/avatar.jpg',
      exp: Math.floor(Date.now() / 1000) + 3600, // 1時間後に期限切れ
      iat: Math.floor(Date.now() / 1000),
      iss: 'accounts.google.com',
      aud: 'test-client-id',
      email_verified: true
    };

    beforeEach(() => {
      // JWT デコードのモック
      vi.mocked(global.atob).mockReturnValue(JSON.stringify(mockJWTPayload));
      
      // ローカルストレージのモック
      mockLocalStorage.getItem.mockImplementation((key) => {
        switch (key) {
          case 'google_id_token':
            return 'header.payload.signature';
          case 'google_token_expiry':
            return (Date.now() + 3600000).toString(); // 1時間後
          case 'google_user_info':
            return JSON.stringify({
              id: 'user-123',
              email: 'test@example.com',
              name: 'Test User',
              picture: 'https://example.com/avatar.jpg'
            });
          default:
            return null;
        }
      });
    });

    it('有効なトークンがある場合、ユーザー情報を返す', async () => {
      const user = await service.getCurrentUser();

      expect(user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg'
      });
      expect(allowlistService.checkEmailAllowed).toHaveBeenCalledWith('test@example.com');
    });

    it('トークンがない場合、null を返す', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const user = await service.getCurrentUser();

      expect(user).toBeNull();
    });

    it('トークンが期限切れの場合、null を返す', async () => {
      // 期限切れのトークン
      const expiredPayload = {
        ...mockJWTPayload,
        exp: Math.floor(Date.now() / 1000) - 3600 // 1時間前に期限切れ
      };
      vi.mocked(global.atob).mockReturnValue(JSON.stringify(expiredPayload));

      const user = await service.getCurrentUser();

      expect(user).toBeNull();
    });

    it('許可リストにない場合、ログアウトして null を返す', async () => {
      const deniedResult: AllowlistCheckResult = {
        isAllowed: false,
        email: 'test@example.com',
        reason: '許可リストにありません'
      };
      vi.mocked(allowlistService.checkEmailAllowed).mockResolvedValue(deniedResult);

      const user = await service.getCurrentUser();

      expect(user).toBeNull();
      expect(mockLocalStorage.removeItem).toHaveBeenCalled();
    });
  });

  describe('isTokenValid', () => {
    const mockJWTPayload = {
      sub: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      exp: Math.floor(Date.now() / 1000) + 3600, // 1時間後に期限切れ
      iat: Math.floor(Date.now() / 1000),
      iss: 'accounts.google.com',
      aud: 'test-client-id',
      email_verified: true
    };

    it('有効なトークンの場合、true を返す', async () => {
      vi.mocked(global.atob).mockReturnValue(JSON.stringify(mockJWTPayload));
      mockLocalStorage.getItem.mockImplementation((key) => {
        switch (key) {
          case 'google_id_token':
            return 'header.payload.signature';
          case 'google_token_expiry':
            return (Date.now() + 3600000).toString();
          default:
            return null;
        }
      });

      const isValid = await service.isTokenValid();

      expect(isValid).toBe(true);
    });

    it('トークンがない場合、false を返す', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const isValid = await service.isTokenValid();

      expect(isValid).toBe(false);
    });

    it('期限切れのトークンの場合、false を返す', async () => {
      const expiredPayload = {
        ...mockJWTPayload,
        exp: Math.floor(Date.now() / 1000) - 3600 // 1時間前に期限切れ
      };
      vi.mocked(global.atob).mockReturnValue(JSON.stringify(expiredPayload));
      mockLocalStorage.getItem.mockImplementation((key) => {
        switch (key) {
          case 'google_id_token':
            return 'header.payload.signature';
          case 'google_token_expiry':
            return (Date.now() - 3600000).toString(); // 1時間前
          default:
            return null;
        }
      });

      const isValid = await service.isTokenValid();

      expect(isValid).toBe(false);
    });
  });

  describe('refreshToken', () => {
    beforeEach(() => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        switch (key) {
          case 'google_id_token':
            return 'old-id-token';
          case 'google_access_token':
            return 'old-access-token';
          case 'google_refresh_token':
            return 'refresh-token';
          default:
            return null;
        }
      });
    });

    it('リフレッシュトークンがある場合、新しいトークンを取得する', async () => {
      const mockResponse = {
        access_token: 'new-access-token',
        id_token: 'new-id-token',
        expires_in: 3600
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as Response);

      const result = await service.refreshToken();

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: expect.any(URLSearchParams)
      });
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('google_access_token', 'new-access-token');
    });

    it('リフレッシュトークンがない場合、false を返す', async () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'google_refresh_token') return null;
        return 'some-token';
      });

      const result = await service.refreshToken();

      expect(result).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('リフレッシュに失敗した場合、false を返す', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 400
      } as Response);

      const result = await service.refreshToken();

      expect(result).toBe(false);
    });
  });

  describe('JWT デコード', () => {
    it('有効な JWT をデコードできる', async () => {
      const payload = { sub: 'user-123', email: 'test@example.com' };
      const encodedPayload = btoa(JSON.stringify(payload));
      const jwt = `header.${encodedPayload}.signature`;

      vi.mocked(global.atob).mockReturnValue(JSON.stringify(payload));

      // プライベートメソッドをテストするため、リフレクションを使用
      const service = new GoogleAuthService();
      const decodeMethod = (service as any).decodeJWT;
      
      const result = decodeMethod.call(service, jwt);

      expect(result).toEqual(payload);
    });

    it('無効な JWT の場合、エラーを投げる', async () => {
      const invalidJWT = 'invalid.jwt';

      const service = new GoogleAuthService();
      const decodeMethod = (service as any).decodeJWT;

      expect(() => decodeMethod.call(service, invalidJWT)).toThrow('JWT トークンのデコードに失敗しました');
    });
  });

  describe('エラーハンドリング', () => {
    it('ネットワークエラーの場合、適切なエラーを返す', async () => {
      vi.mocked(allowlistService.loadConfig).mockRejectedValue(new Error('Network error'));

      await expect(service.initialize()).rejects.toMatchObject({
        type: AuthErrorType.CONFIG_ERROR,
        message: 'Network error',
        retryable: true
      });
    });

    it('許可リストチェックでエラーが発生した場合、null を返す', async () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        switch (key) {
          case 'google_id_token':
            return 'header.payload.signature';
          case 'google_user_info':
            return JSON.stringify({ id: '123', email: 'test@example.com', name: 'Test' });
          default:
            return null;
        }
      });

      vi.mocked(allowlistService.checkEmailAllowed).mockRejectedValue(new Error('Allowlist error'));

      const user = await service.getCurrentUser();

      expect(user).toBeNull();
    });
  });
});

describe('googleAuthService (singleton)', () => {
  it('シングルトンインスタンスが提供される', () => {
    expect(googleAuthService).toBeInstanceOf(GoogleAuthService);
  });
});