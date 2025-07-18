# 設定ガイド

このドキュメントでは、メモアプリケーションの設定方法について説明します。

## 環境変数

アプリケーションは以下の環境変数を使用します。すべての環境変数は `VITE_` プレフィックスが必要です。

### 必須設定

#### `VITE_GOOGLE_CLIENT_ID`
- **説明**: Google OAuth 2.0 クライアント ID
- **取得方法**: [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成し、OAuth 2.0 クライアント ID を生成
- **例**: `123456789-abcdefghijklmnop.apps.googleusercontent.com`

### オプション設定

#### `VITE_AUTH_CONFIG_URL`
- **説明**: 認証設定ファイルのパスまたは URL
- **デフォルト**: `/auth-config.json`
- **例**: `/config/auth.json` または `https://cdn.example.com/auth-config.json`

#### `VITE_APP_NAME`
- **説明**: アプリケーション名
- **デフォルト**: `Memo App`

#### `VITE_APP_VERSION`
- **説明**: アプリケーションバージョン
- **デフォルト**: `1.0.0`

## 設定ファイル

### auth-config.json

認証設定は `public/auth-config.json` ファイルで管理されます。

```json
{
  "googleClientId": "YOUR_GOOGLE_CLIENT_ID",
  "allowedEmails": [
    "developer@example.com",
    "user@example.com"
  ],
  "version": "1.0.0"
}
```

#### 設定項目

- **`googleClientId`**: Google OAuth クライアント ID（環境変数で上書き可能）
- **`allowedEmails`**: アクセスを許可するメールアドレスのリスト
- **`version`**: 設定ファイルのバージョン

## 設定の優先順位

設定値は以下の優先順位で決定されます：

1. **環境変数** (最優先)
2. **設定ファイル**
3. **デフォルト値** (最低優先)

例：Google Client ID の場合
1. `VITE_GOOGLE_CLIENT_ID` 環境変数
2. `auth-config.json` の `googleClientId`
3. エラー（必須設定のため）

## 環境別設定

### 開発環境

`.env.local` ファイルを作成：

```bash
# 開発用設定
VITE_GOOGLE_CLIENT_ID=your_dev_client_id_here
VITE_AUTH_CONFIG_URL=/dev-auth-config.json
VITE_APP_NAME=Memo App (Dev)
```

### 本番環境

本番環境では環境変数を直接設定するか、ビルド時に注入します：

```bash
# 本番用設定
export VITE_GOOGLE_CLIENT_ID=your_prod_client_id_here
export VITE_AUTH_CONFIG_URL=/auth-config.json
export VITE_APP_NAME=Memo App
```

## Google OAuth 設定

### Google Cloud Console での設定手順

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを作成または選択
3. 「API とサービス」→「認証情報」に移動
4. 「認証情報を作成」→「OAuth 2.0 クライアント ID」を選択
5. アプリケーションの種類として「ウェブアプリケーション」を選択
6. 承認済みの JavaScript 生成元を追加：
   - 開発環境: `http://localhost:5173`
   - 本番環境: `https://yourdomain.com`
7. 承認済みのリダイレクト URI を追加（必要に応じて）
8. 作成されたクライアント ID をコピー

### 許可リストの管理

許可リストは `auth-config.json` ファイルで管理します：

```json
{
  "allowedEmails": [
    "admin@company.com",
    "user1@company.com",
    "user2@company.com"
  ]
}
```

- メールアドレスは大文字小文字を区別しません
- 無効なメールアドレス形式はエラーになります
- 配列が空の場合、すべてのユーザーがアクセス拒否されます

## トラブルシューティング

### よくある問題

#### 1. 「Google Client ID が設定されていません」エラー

**原因**: 環境変数または設定ファイルでクライアント ID が設定されていない

**解決方法**:
- `.env.local` ファイルに `VITE_GOOGLE_CLIENT_ID` を設定
- または `auth-config.json` の `googleClientId` を設定

#### 2. 「設定ファイルの読み込みに失敗しました」エラー

**原因**: 設定ファイルが見つからないか、形式が無効

**解決方法**:
- `public/auth-config.json` ファイルが存在することを確認
- JSON 形式が正しいことを確認
- 必須フィールドが含まれていることを確認

#### 3. 「このメールアドレスは許可リストに含まれていません」エラー

**原因**: ログインしたユーザーのメールアドレスが許可リストにない

**解決方法**:
- `auth-config.json` の `allowedEmails` にメールアドレスを追加
- メールアドレスのスペルを確認

### デバッグ方法

開発環境では、ブラウザのコンソールで設定情報を確認できます：

```javascript
// 設定サービスの情報を取得
import { configurationService } from './src/services/configurationService';
console.log(configurationService.getConfigurationInfo());
```

## セキュリティ考慮事項

- **クライアント ID**: 公開情報として扱われるため、秘匿性は不要
- **許可リスト**: メールアドレスのみを含み、機密情報は含めない
- **環境変数**: 本番環境では適切に管理し、ソースコードにハードコードしない
- **HTTPS**: 本番環境では必ず HTTPS を使用する

## 参考リンク

- [Google OAuth 2.0 ドキュメント](https://developers.google.com/identity/protocols/oauth2)
- [Vite 環境変数ガイド](https://vitejs.dev/guide/env-and-mode.html)
- [Google Cloud Console](https://console.cloud.google.com/)