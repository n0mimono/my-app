// ユーザー情報
export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

// 認証状態
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  error: AuthError | null;
}

// Google OAuth レスポンス
export interface GoogleAuthResponse {
  access_token: string;
  id_token: string;
  expires_in: number;
  refresh_token?: string;
}

// 許可リスト設定
export interface AllowlistConfig {
  allowedEmails: string[];
  version: string;
}

// Google OAuth 設定
export interface GoogleOAuthConfig {
  googleClientId: string;
  allowedEmails: string[];
  version: string;
}

// 認証エラータイプ
export const AuthErrorType = {
  OAUTH_FAILED: 'OAUTH_FAILED',
  ACCESS_DENIED: 'ACCESS_DENIED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  CONFIG_ERROR: 'CONFIG_ERROR'
} as const;

export type AuthErrorType = typeof AuthErrorType[keyof typeof AuthErrorType];

// 認証エラー
export interface AuthError {
  type: AuthErrorType;
  message: string;
  retryable: boolean;
}

// Google OAuth トークン情報
export interface GoogleTokenInfo {
  access_token: string;
  id_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
}

// JWT ペイロード（Google ID Token）
export interface GoogleJWTPayload {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}

// 認証コンテキストの型
export interface AuthContextType {
  authState: AuthState;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}

// ログイン結果の型
export interface LoginResult {
  success: boolean;
  user?: User;
  error?: AuthError;
}

// 許可リストチェック結果の型
export interface AllowlistCheckResult {
  isAllowed: boolean;
  email: string;
  reason?: string;
}