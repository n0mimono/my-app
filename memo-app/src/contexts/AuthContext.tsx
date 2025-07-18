import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { AuthContextType } from '../types/auth';

/**
 * 認証コンテキスト
 * アプリケーション全体で認証状態を共有するためのコンテキスト
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider のプロパティ
 */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * 認証コンテキストプロバイダー
 * アプリケーション全体に認証状態と認証操作を提供する
 * 
 * 機能:
 * - 認証状態の管理とコンテキスト提供
 * - 初期認証状態の確認
 * - エラーハンドリング機能の統合
 * 
 * 要件: 4.3, 6.4, 6.5
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // useAuth フックを使用して認証機能を取得
  const authHook = useAuth();

  // コンテキストに提供する値を構築
  const contextValue: AuthContextType = {
    authState: authHook.authState,
    login: authHook.login,
    logout: authHook.logout,
    checkAuthStatus: authHook.checkAuthStatus
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * 認証コンテキストを使用するためのカスタムフック
 * AuthProvider の子コンポーネントでのみ使用可能
 * 
 * @returns AuthContextType 認証コンテキストの値
 * @throws Error AuthProvider の外で使用された場合
 */
export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuthContext は AuthProvider の子コンポーネント内で使用する必要があります');
  }
  
  return context;
};

export default AuthProvider;