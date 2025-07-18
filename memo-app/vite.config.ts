/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // 環境変数の設定
  define: {
    // 必要に応じて追加の定数を定義
  },
  
  // 開発サーバーの設定
  server: {
    // 認証コールバック用のプロキシ設定（必要に応じて）
    proxy: {
      // Google OAuth コールバック用（将来的に必要になる可能性）
      // '/auth': {
      //   target: 'http://localhost:3001',
      //   changeOrigin: true
      // }
    }
  },
  
  // ビルド設定
  build: {
    // 本番ビルド時の設定
    rollupOptions: {
      // 外部依存関係の設定（必要に応じて）
    }
  },
  
  // テスト設定
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    // 環境変数のテスト用設定
    env: {
      // テスト用の環境変数（必要に応じて設定）
      VITE_GOOGLE_CLIENT_ID: 'test-client-id',
      VITE_AUTH_CONFIG_URL: '/test-auth-config.json'
    }
  },
})
