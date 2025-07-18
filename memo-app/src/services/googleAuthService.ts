import type { 
  User, 
  GoogleTokenInfo, 
  GoogleJWTPayload, 
  AuthError, 
  LoginResult
} from '../types/auth';
import { AuthErrorType } from '../types/auth';
import { allowlistService } from './allowlistService';
import { errorHandlingService } from './errorHandlingService';

/**
 * Google OAuth 認証サービス
 * Google OAuth 2.0 を使用した認証機能を提供
 */
export class GoogleAuthService {
  private clientId: string | null = null;
  private isInitialized = false;
  // private _currentTokens: GoogleTokenInfo | null = null;
  // private _tokenExpiryTime: number | null = null;
  private loginResolve: ((result: LoginResult) => void) | null = null;

  // ローカルストレージのキー
  private readonly STORAGE_KEYS = {
    ACCESS_TOKEN: 'google_access_token',
    ID_TOKEN: 'google_id_token',
    REFRESH_TOKEN: 'google_refresh_token',
    EXPIRY_TIME: 'google_token_expiry',
    USER_INFO: 'google_user_info'
  };

  /**
   * Google OAuth サービスを初期化する
   * @returns Promise<void>
   * @throws AuthError 初期化に失敗した場合
   */
  async initialize(): Promise<void> {
    const result = await errorHandlingService.executeWithRetry(
      async () => {
        // 設定を読み込む
        const config = await allowlistService.loadConfig();
        this.clientId = config.googleClientId;

        // Google API スクリプトを動的に読み込む
        await this.loadGoogleAPI();

        // Google OAuth を初期化
        await this.initializeGoogleAuth();

        this.isInitialized = true;
      },
      { maxRetries: 2, delay: 1000 },
      'GoogleAuthService.initialize'
    );

    if (!result.success) {
      throw result.error;
    }
  }

  /**
   * Google API スクリプトを動的に読み込む
   * @returns Promise<void>
   */
  private loadGoogleAPI(): Promise<void> {
    return new Promise((resolve, reject) => {
      // 既に読み込まれている場合はスキップ
      if (window.google && window.google.accounts) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        // Google API が利用可能になるまで少し待つ
        setTimeout(() => {
          if (window.google && window.google.accounts) {
            resolve();
          } else {
            reject(new Error('Google API の読み込みに失敗しました'));
          }
        }, 100);
      };
      
      script.onerror = () => {
        reject(new Error('Google API スクリプトの読み込みに失敗しました'));
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Google OAuth を初期化する
   * @returns Promise<void>
   */
  private initializeGoogleAuth(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.clientId) {
        reject(new Error('Google Client ID が設定されていません'));
        return;
      }

      try {
        // Google OAuth の初期化
        window.google.accounts.id.initialize({
          client_id: this.clientId,
          callback: (response: any) => {
            // コールバックを非同期で処理
            this.handleCredentialResponse(response).then(result => {
              if (this.loginResolve) {
                this.loginResolve(result);
                this.loginResolve = null;
              }
            }).catch(error => {
              if (this.loginResolve) {
                this.loginResolve({
                  success: false,
                  error: {
                    type: AuthErrorType.OAUTH_FAILED,
                    message: error.message || '認証処理に失敗しました',
                    retryable: true
                  }
                });
                this.loginResolve = null;
              }
            });
          },
          auto_select: false,
          cancel_on_tap_outside: true
        });

        resolve();
      } catch (error) {
        reject(new Error('Google OAuth の初期化に失敗しました'));
      }
    });
  }

  /**
   * Google OAuth の認証レスポンスを処理する
   * @param response Google OAuth のレスポンス
   */
  private async handleCredentialResponse(response: any): Promise<LoginResult> {
    try {
      if (!response.credential) {
        throw new Error('認証情報が取得できませんでした');
      }

      // JWT トークンをデコード
      const userInfo = this.decodeJWT(response.credential);
      
      // 許可リストチェック
      const allowlistResult = await allowlistService.checkEmailAllowed(userInfo.email);
      
      if (!allowlistResult.isAllowed) {
        const error: AuthError = {
          type: AuthErrorType.ACCESS_DENIED,
          message: allowlistResult.reason || 'アクセスが拒否されました',
          retryable: false
        };
        return {
          success: false,
          error
        };
      }

      // トークン情報を保存
      const tokenInfo: GoogleTokenInfo = {
        access_token: '', // Google Identity Services では access_token は直接提供されない
        id_token: response.credential,
        expires_in: 3600, // デフォルト1時間
        token_type: 'Bearer',
        scope: 'openid email profile'
      };

      await this.saveTokens(tokenInfo);
      await this.saveUserInfo(userInfo);

      // Token info stored in localStorage

      // ユーザー情報を返す
      const user: User = {
        id: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture
      };

      return {
        success: true,
        user
      };

    } catch (error) {
      const authError = errorHandlingService.handleError(error, 'GoogleAuthService.handleCredentialResponse');
      return {
        success: false,
        error: authError
      };
    }
  }

  /**
   * JWT トークンをデコードする
   * @param token JWT トークン
   * @returns GoogleJWTPayload
   */
  private decodeJWT(token: string): GoogleJWTPayload {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('無効な JWT トークンです');
      }

      const payload = parts[1];
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded);
    } catch (error) {
      throw new Error('JWT トークンのデコードに失敗しました');
    }
  }

  /**
   * ログイン処理を実行する
   * @returns Promise<LoginResult>
   */
  async login(): Promise<LoginResult> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      return new Promise((resolve) => {
        // コールバック用のresolverを設定
        this.loginResolve = resolve;

        // Google One Tap を表示
        window.google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            // One Tap が表示されない場合は、ポップアップでログインを試行
            this.showLoginPopup()
              .then(result => {
                if (this.loginResolve) {
                  this.loginResolve(result);
                  this.loginResolve = null;
                }
              })
              .catch(error => {
                if (this.loginResolve) {
                  const authError = errorHandlingService.handleError(error, 'GoogleAuthService.showLoginPopup');
                  this.loginResolve({
                    success: false,
                    error: authError
                  });
                  this.loginResolve = null;
                }
              });
          }
        });

        // タイムアウト処理
        setTimeout(() => {
          if (this.loginResolve) {
            this.loginResolve({
              success: false,
              error: {
                type: AuthErrorType.OAUTH_FAILED,
                message: 'ログインがタイムアウトしました',
                retryable: true
              }
            });
            this.loginResolve = null;
          }
        }, 30000); // 30秒でタイムアウト
      });

    } catch (error) {
      const authError = errorHandlingService.handleError(error, 'GoogleAuthService.login');
      return {
        success: false,
        error: authError
      };
    }
  }

  /**
   * ログインポップアップを表示する
   * @returns Promise<LoginResult>
   */
  private showLoginPopup(): Promise<LoginResult> {
    return new Promise((_resolve, reject) => {
      if (!this.clientId) {
        reject({
          success: false,
          error: {
            type: AuthErrorType.CONFIG_ERROR,
            message: 'Google Client ID が設定されていません',
            retryable: false
          }
        });
        return;
      }

      // ポップアップでのログインを実装
      // 注意: 実際の実装では、Google OAuth 2.0 の認可コードフローを使用する必要があります
      const authUrl = this.buildAuthUrl();
      const popup = window.open(
        authUrl,
        'google-login',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        reject({
          success: false,
          error: {
            type: AuthErrorType.OAUTH_FAILED,
            message: 'ポップアップがブロックされました',
            retryable: true
          }
        });
        return;
      }

      // ポップアップの監視
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          reject({
            success: false,
            error: {
              type: AuthErrorType.OAUTH_FAILED,
              message: 'ログインがキャンセルされました',
              retryable: true
            }
          });
        }
      }, 1000);
    });
  }

  /**
   * Google OAuth の認証URLを構築する
   * @returns string
   */
  private buildAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId!,
      redirect_uri: `${window.location.origin}/auth/callback`,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * ログアウト処理を実行する
   * @returns Promise<void>
   */
  async logout(): Promise<void> {
    try {
      // Google セッションを取り消す
      if (window.google && window.google.accounts) {
        window.google.accounts.id.disableAutoSelect();
      }

      // ローカルストレージをクリア
      await this.clearTokens();
      await this.clearUserInfo();

      // メモリ上の情報をクリア
      // Token info cleared from localStorage

    } catch (error) {
      console.error('ログアウト処理でエラーが発生しました:', error);
      // ログアウトは失敗してもローカル状態はクリアする
      await this.clearTokens();
      await this.clearUserInfo();
      // Token info cleared from localStorage
    }
  }

  /**
   * 現在の認証状態をチェックする
   * @returns Promise<User | null>
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      // トークンの有効性をチェック
      if (!await this.isTokenValid()) {
        return null;
      }

      // ユーザー情報を取得
      const userInfo = await this.getUserInfo();
      if (!userInfo) {
        return null;
      }

      // 許可リストチェック
      const allowlistResult = await allowlistService.checkEmailAllowed(userInfo.email);
      if (!allowlistResult.isAllowed) {
        // 許可リストから除外された場合はログアウト
        await this.logout();
        return null;
      }

      return userInfo;

    } catch (error) {
      console.error('ユーザー情報の取得に失敗しました:', error);
      return null;
    }
  }

  /**
   * トークンが有効かチェックする
   * @returns Promise<boolean>
   */
  async isTokenValid(): Promise<boolean> {
    try {
      const tokens = await this.getTokens();
      if (!tokens || !tokens.id_token) {
        return false;
      }

      // トークンの有効期限をチェック
      const expiryTime = await this.getTokenExpiryTime();
      if (expiryTime && Date.now() >= expiryTime) {
        return false;
      }

      // JWT トークンの有効性をチェック
      const payload = this.decodeJWT(tokens.id_token);
      if (payload.exp * 1000 <= Date.now()) {
        return false;
      }

      return true;

    } catch (error) {
      console.error('トークンの検証に失敗しました:', error);
      return false;
    }
  }

  /**
   * トークンをリフレッシュする
   * @returns Promise<boolean>
   */
  async refreshToken(): Promise<boolean> {
    const result = await errorHandlingService.executeWithRetry(
      async () => {
        const tokens = await this.getTokens();
        if (!tokens || !tokens.refresh_token) {
          throw new Error('リフレッシュトークンが見つかりません');
        }

        // リフレッシュトークンを使用して新しいトークンを取得
        const response = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: this.clientId!,
            refresh_token: tokens.refresh_token,
            grant_type: 'refresh_token'
          })
        });

        if (!response.ok) {
          throw new Error(`トークンのリフレッシュに失敗しました: ${response.status}`);
        }

        const newTokens = await response.json();
        
        // 新しいトークンを保存
        const updatedTokens: GoogleTokenInfo = {
          ...tokens,
          access_token: newTokens.access_token,
          id_token: newTokens.id_token || tokens.id_token,
          expires_in: newTokens.expires_in || 3600
        };

        await this.saveTokens(updatedTokens);
        return true;
      },
      { maxRetries: 2, delay: 1000 },
      'GoogleAuthService.refreshToken'
    );

    return result.success;
  }

  /**
   * トークンを保存する
   * @param tokens トークン情報
   */
  private async saveTokens(tokens: GoogleTokenInfo): Promise<void> {
    try {
      localStorage.setItem(this.STORAGE_KEYS.ACCESS_TOKEN, tokens.access_token);
      localStorage.setItem(this.STORAGE_KEYS.ID_TOKEN, tokens.id_token);
      localStorage.setItem(this.STORAGE_KEYS.EXPIRY_TIME, (Date.now() + (tokens.expires_in * 1000)).toString());
      
      if (tokens.refresh_token) {
        localStorage.setItem(this.STORAGE_KEYS.REFRESH_TOKEN, tokens.refresh_token);
      }
    } catch (error) {
      console.error('トークンの保存に失敗しました:', error);
      throw new Error('トークンの保存に失敗しました');
    }
  }

  /**
   * トークンを取得する
   * @returns Promise<GoogleTokenInfo | null>
   */
  private async getTokens(): Promise<GoogleTokenInfo | null> {
    try {
      const accessToken = localStorage.getItem(this.STORAGE_KEYS.ACCESS_TOKEN);
      const idToken = localStorage.getItem(this.STORAGE_KEYS.ID_TOKEN);
      const refreshToken = localStorage.getItem(this.STORAGE_KEYS.REFRESH_TOKEN);

      if (!idToken) {
        return null;
      }

      return {
        access_token: accessToken || '',
        id_token: idToken,
        refresh_token: refreshToken || undefined,
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'openid email profile'
      };
    } catch (error) {
      console.error('トークンの取得に失敗しました:', error);
      return null;
    }
  }

  /**
   * トークンの有効期限を取得する
   * @returns Promise<number | null>
   */
  private async getTokenExpiryTime(): Promise<number | null> {
    try {
      const expiryTime = localStorage.getItem(this.STORAGE_KEYS.EXPIRY_TIME);
      return expiryTime ? parseInt(expiryTime, 10) : null;
    } catch (error) {
      console.error('トークン有効期限の取得に失敗しました:', error);
      return null;
    }
  }

  /**
   * トークンをクリアする
   * @returns Promise<void>
   */
  private async clearTokens(): Promise<void> {
    try {
      localStorage.removeItem(this.STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(this.STORAGE_KEYS.ID_TOKEN);
      localStorage.removeItem(this.STORAGE_KEYS.REFRESH_TOKEN);
      localStorage.removeItem(this.STORAGE_KEYS.EXPIRY_TIME);
    } catch (error) {
      console.error('トークンのクリアに失敗しました:', error);
    }
  }

  /**
   * ユーザー情報を保存する
   * @param userInfo ユーザー情報
   */
  private async saveUserInfo(userInfo: GoogleJWTPayload): Promise<void> {
    try {
      const user: User = {
        id: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture
      };
      localStorage.setItem(this.STORAGE_KEYS.USER_INFO, JSON.stringify(user));
    } catch (error) {
      console.error('ユーザー情報の保存に失敗しました:', error);
      throw new Error('ユーザー情報の保存に失敗しました');
    }
  }

  /**
   * ユーザー情報を取得する
   * @returns Promise<User | null>
   */
  private async getUserInfo(): Promise<User | null> {
    try {
      const userInfoStr = localStorage.getItem(this.STORAGE_KEYS.USER_INFO);
      return userInfoStr ? JSON.parse(userInfoStr) : null;
    } catch (error) {
      console.error('ユーザー情報の取得に失敗しました:', error);
      return null;
    }
  }

  /**
   * ユーザー情報をクリアする
   * @returns Promise<void>
   */
  private async clearUserInfo(): Promise<void> {
    try {
      localStorage.removeItem(this.STORAGE_KEYS.USER_INFO);
    } catch (error) {
      console.error('ユーザー情報のクリアに失敗しました:', error);
    }
  }
}

// デフォルトのサービスインスタンス
export const googleAuthService = new GoogleAuthService();

// Google API の型定義を拡張
declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: (callback?: (notification: any) => void) => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}