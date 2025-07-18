import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AllowlistService } from '../allowlistService';
import { AuthErrorType } from '../../types/auth';

// グローバルfetchのモック
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('AllowlistService', () => {
  let service: AllowlistService;

  beforeEach(() => {
    service = new AllowlistService('/test-auth-config.json');
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('loadConfig', () => {
    it('正常な設定ファイルを読み込める', async () => {
      const mockConfig = {
        googleClientId: 'test-client-id',
        allowedEmails: ['test@example.com', 'user@example.com'],
        version: '1.0.0'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockConfig)
      });

      const config = await service.loadConfig();

      expect(config).toEqual(mockConfig);
      expect(mockFetch).toHaveBeenCalledWith('/test-auth-config.json');
    });

    it('ネットワークエラー時に適切なエラーを投げる', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      await expect(service.loadConfig()).rejects.toMatchObject({
        type: AuthErrorType.CONFIG_ERROR,
        message: '設定ファイルの読み込みに失敗しました: 404 Not Found',
        retryable: true
      });
    });

    it('JSONパースエラー時に適切なエラーを投げる', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      });

      await expect(service.loadConfig()).rejects.toMatchObject({
        type: AuthErrorType.CONFIG_ERROR,
        message: 'Invalid JSON',
        retryable: true
      });
    });

    it('googleClientIdが無い場合にエラーを投げる', async () => {
      const invalidConfig = {
        allowedEmails: ['test@example.com'],
        version: '1.0.0'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(invalidConfig)
      });

      await expect(service.loadConfig()).rejects.toMatchObject({
        type: AuthErrorType.CONFIG_ERROR,
        message: 'googleClientId が設定されていないか、無効な形式です'
      });
    });

    it('allowedEmailsが配列でない場合にエラーを投げる', async () => {
      const invalidConfig = {
        googleClientId: 'test-client-id',
        allowedEmails: 'not-an-array',
        version: '1.0.0'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(invalidConfig)
      });

      await expect(service.loadConfig()).rejects.toMatchObject({
        type: AuthErrorType.CONFIG_ERROR,
        message: 'allowedEmails が配列ではありません'
      });
    });

    it('versionが無い場合にエラーを投げる', async () => {
      const invalidConfig = {
        googleClientId: 'test-client-id',
        allowedEmails: ['test@example.com']
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(invalidConfig)
      });

      await expect(service.loadConfig()).rejects.toMatchObject({
        type: AuthErrorType.CONFIG_ERROR,
        message: 'version が設定されていないか、無効な形式です'
      });
    });

    it('無効なメールアドレスが含まれている場合にエラーを投げる', async () => {
      const invalidConfig = {
        googleClientId: 'test-client-id',
        allowedEmails: ['test@example.com', 'invalid-email'],
        version: '1.0.0'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(invalidConfig)
      });

      await expect(service.loadConfig()).rejects.toMatchObject({
        type: AuthErrorType.CONFIG_ERROR,
        message: '無効なメールアドレスが含まれています: invalid-email'
      });
    });
  });

  describe('checkEmailAllowed', () => {
    beforeEach(async () => {
      const mockConfig = {
        googleClientId: 'test-client-id',
        allowedEmails: ['allowed@example.com', 'user@test.com'],
        version: '1.0.0'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockConfig)
      });

      await service.loadConfig();
    });

    it('許可リストに含まれるメールアドレスを正しく認識する', async () => {
      const result = await service.checkEmailAllowed('allowed@example.com');

      expect(result).toEqual({
        isAllowed: true,
        email: 'allowed@example.com',
        reason: undefined
      });
    });

    it('許可リストに含まれないメールアドレスを正しく拒否する', async () => {
      const result = await service.checkEmailAllowed('notallowed@example.com');

      expect(result).toEqual({
        isAllowed: false,
        email: 'notallowed@example.com',
        reason: 'このメールアドレスは許可リストに含まれていません'
      });
    });

    it('大文字小文字を区別せずにチェックする', async () => {
      const result = await service.checkEmailAllowed('ALLOWED@EXAMPLE.COM');

      expect(result).toEqual({
        isAllowed: true,
        email: 'ALLOWED@EXAMPLE.COM',
        reason: undefined
      });
    });

    it('無効なメールアドレス形式を拒否する', async () => {
      const result = await service.checkEmailAllowed('invalid-email');

      expect(result).toEqual({
        isAllowed: false,
        email: 'invalid-email',
        reason: 'メールアドレスの形式が無効です'
      });
    });

    it('設定が読み込まれていない場合に自動的に読み込む', async () => {
      const newService = new AllowlistService('/test-auth-config.json');
      
      const mockConfig = {
        googleClientId: 'test-client-id',
        allowedEmails: ['auto@example.com'],
        version: '1.0.0'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockConfig)
      });

      const result = await newService.checkEmailAllowed('auto@example.com');

      expect(result.isAllowed).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/test-auth-config.json');
    });
  });

  describe('getAllowedEmails', () => {
    it('許可されたメールアドレスのリストを返す', async () => {
      const mockConfig = {
        googleClientId: 'test-client-id',
        allowedEmails: ['email1@example.com', 'email2@example.com'],
        version: '1.0.0'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockConfig)
      });

      const emails = await service.getAllowedEmails();

      expect(emails).toEqual(['email1@example.com', 'email2@example.com']);
    });

    it('設定が読み込まれていない場合に空配列を返す', async () => {
      const newService = new AllowlistService('/test-auth-config.json');
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      await expect(newService.getAllowedEmails()).rejects.toMatchObject({
        type: AuthErrorType.CONFIG_ERROR
      });
    });
  });

  describe('getConfig', () => {
    it('設定が読み込まれている場合に設定を返す', async () => {
      const mockConfig = {
        googleClientId: 'test-client-id',
        allowedEmails: ['test@example.com'],
        version: '1.0.0'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockConfig)
      });

      await service.loadConfig();
      const config = service.getConfig();

      expect(config).toEqual(mockConfig);
    });

    it('設定が読み込まれていない場合にnullを返す', () => {
      const newService = new AllowlistService();
      const config = newService.getConfig();

      expect(config).toBeNull();
    });
  });

  describe('reloadConfig', () => {
    it('設定を強制的に再読み込みする', async () => {
      // 最初の設定を読み込み
      const firstConfig = {
        googleClientId: 'first-client-id',
        allowedEmails: ['first@example.com'],
        version: '1.0.0'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(firstConfig)
      });

      await service.loadConfig();
      expect(service.getConfig()).toEqual(firstConfig);

      // 新しい設定で再読み込み
      const secondConfig = {
        googleClientId: 'second-client-id',
        allowedEmails: ['second@example.com'],
        version: '2.0.0'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(secondConfig)
      });

      const reloadedConfig = await service.reloadConfig();

      expect(reloadedConfig).toEqual(secondConfig);
      expect(service.getConfig()).toEqual(secondConfig);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('メールアドレス形式の検証', () => {
    const validEmails = [
      'test@example.com',
      'user.name@domain.co.jp',
      'user+tag@example.org',
      'user123@test-domain.com'
    ];

    const invalidEmails = [
      'invalid-email',
      '@example.com',
      'user@',
      'user@domain',
      'user name@example.com',
      'user@domain..com'
    ];

    validEmails.forEach(email => {
      it(`有効なメールアドレス "${email}" を受け入れる`, async () => {
        const mockConfig = {
          googleClientId: 'test-client-id',
          allowedEmails: [email],
          version: '1.0.0'
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockConfig)
        });

        await expect(service.loadConfig()).resolves.toEqual(mockConfig);
      });
    });

    invalidEmails.forEach(email => {
      it(`無効なメールアドレス "${email}" を拒否する`, async () => {
        const mockConfig = {
          googleClientId: 'test-client-id',
          allowedEmails: [email],
          version: '1.0.0'
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockConfig)
        });

        await expect(service.loadConfig()).rejects.toMatchObject({
          type: AuthErrorType.CONFIG_ERROR,
          message: `無効なメールアドレスが含まれています: ${email}`
        });
      });
    });
  });
});