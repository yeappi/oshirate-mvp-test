# 推されーと MVP

## Phase 状況

| Phase | 内容 | 状態 |
|-------|------|------|
| 0 | プロジェクト骨格 + プロフィール画面（静的） | ✅ |
| 0.5 | Googleログイン + ログアウト + profiles 自動作成 | ✅ |
| 1 | 30分プレゼント | - |
| 2 | イラスト購入フロー | - |
| 3 | 通知 + 管理画面 | - |

---

## セットアップ手順

### 1. クローン & インストール

```bash
git clone https://github.com/YOUR_USERNAME/oshirate.git
cd oshirate
npm install
```

### 2. Supabase プロジェクト作成

1. [supabase.com](https://supabase.com) でプロジェクト作成
2. SQL Editor に `supabase/schema.sql` の内容を貼り付けて実行
3. Authentication > Providers > Google を有効化
   - Google Cloud Console で OAuth クライアントを作成
   - 承認済みリダイレクトURIに `https://<your-project>.supabase.co/auth/v1/callback` を追加

### 3. 環境変数を設定

```bash
cp .env.local.example .env.local
```

`.env.local` を編集：

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 4. 開発サーバー起動

```bash
npm run dev
```

`http://localhost:3000` → ログイン画面 → Googleログイン → プロフィール画面

---

## 管理者ユーザーの設定

自動設定はない。初回ログイン後、Supabase ダッシュボードで手動設定する。

```sql
-- Supabase SQL Editor で実行
update public.profiles
set is_admin = true
where id = 'ここにuserのUUID';
```

対象 UUID は Authentication > Users から確認できる。

---

## アイコン画像の置き方

`public/img/yapi.jpeg` に配置。ファイル名を変える場合は `lib/staticData.ts` の `photoUrl` を合わせる。

---

## ディレクトリ構成

```
oshirate/
├── app/
│   ├── auth/callback/route.ts   # OAuth コールバック + profiles 自動作成
│   ├── login/page.tsx           # ログイン画面
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                 # / → プロフィール画面（要ログイン）
├── components/
│   ├── auth/
│   │   ├── LoginButton.tsx      # Google OAuth 起動
│   │   └── LogoutButton.tsx
│   └── profile/
│       ├── ProfileCard.tsx
│       ├── Avatar.tsx
│       ├── BadgeRow.tsx
│       ├── StatsRow.tsx
│       ├── TopSupporters.tsx
│       └── IllustCollection.tsx
├── lib/
│   ├── auth.ts                  # getUser / getProfile
│   ├── staticData.ts            # Phase 0: 静的データ + 型定義
│   ├── supabase.ts              # ブラウザ用クライアント
│   └── supabase-server.ts       # Server Components 用クライアント
├── middleware.ts                 # 未ログイン → /login リダイレクト
├── supabase/schema.sql
└── public/img/
```

---

## Vercel デプロイ

1. GitHub にプッシュ
2. Vercel でリポジトリをインポート
3. Environment Variables に `.env.local` の値を入力
4. Supabase ダッシュボード > Authentication > URL Configuration に
   `https://your-vercel-app.vercel.app/auth/callback` を追加
5. デプロイ
