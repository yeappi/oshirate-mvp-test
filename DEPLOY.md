# 推されーと Deploy 0.1 手順書

> 読みながらそのまま進められるように書いています。
> 上から順番に進めてください。

---

## 全体の流れ

```
① Supabase プロジェクト作成
② Google OAuth 設定
③ SQL を順番に実行
④ GitHub にコードをプッシュ
⑤ Vercel にデプロイ
⑥ 環境変数を設定
⑦ やぴアカウントでログイン → 管理者設定
⑧ 実機で動作確認
```

---

## ① Supabase プロジェクト作成

1. [supabase.com](https://supabase.com) を開く
2. 「New project」をクリック
3. 以下を入力：
   - **Name**: `oshirate`（任意）
   - **Database Password**: 強いパスワードを設定（メモしておく）
   - **Region**: `Northeast Asia (Tokyo)` を選ぶ
4. 「Create new project」をクリック → 1〜2分待つ

---

## ② Google OAuth 設定

Supabase と Google Cloud の両方で設定が必要です。

### Google Cloud Console 側

1. [console.cloud.google.com](https://console.cloud.google.com) を開く
2. プロジェクトを作成（または既存を選ぶ）
3. 左メニュー →「API とサービス」→「認証情報」
4. 「認証情報を作成」→「OAuth 2.0 クライアント ID」
5. アプリケーションの種類：**ウェブアプリケーション**
6. 「承認済みのリダイレクト URI」に以下を追加：

```
https://あなたのプロジェクトID.supabase.co/auth/v1/callback
```

> プロジェクト ID は Supabase の URL（`xxxx.supabase.co` の `xxxx` 部分）

7. 作成すると「クライアント ID」と「クライアント シークレット」が表示される → **メモしておく**

### Supabase 側

1. Supabase Dashboard を開く
2. 左メニュー →「Authentication」→「Providers」
3. 「Google」をクリックして有効化
4. 「Client ID」と「Client Secret」に Google Cloud で取得した値を入力
5. 「Save」をクリック

---

## ③ SQL を順番に実行

Supabase Dashboard →「SQL Editor」を開き、以下のファイルの内容を **上から順番に** 貼り付けて「Run」します。

**必ず この順番で実行してください。**

| 順番 | ファイル | 内容 |
|------|---------|------|
| 1 | `supabase/schema.sql` | テーブル全体の土台 |
| 2 | `supabase/migration_phase1_gift.sql` | プレゼントスロット更新 |
| 3 | `supabase/migration_phase2_illustrations.sql` | イラスト・購入テーブル |
| 4 | `supabase/migration_phase2.5_decorations.sql` | 装飾テーブル |
| 5 | `supabase/migration_phase3a_notifications.sql` | 通知テーブル更新 |
| 6 | `supabase/migration_phase3b_admin.sql` | 管理画面用テーブル・RPC |
| 7 | `supabase/seed_illustrations.sql` | イラスト初期データ15件 |

### 実行方法

1. SQL Editor を開く
2. ファイルの中身を全選択してコピー
3. エディタに貼り付けて「Run」
4. 「Success」と表示されたら次のファイルへ

> エラーが出た場合は後述の「よくあるエラー」を参照

---

## ④ GitHub にコードをプッシュ

ターミナル（Mac の場合）で以下を実行：

```bash
# プロジェクトフォルダに移動
cd oshirate

# Git 初期化（まだやっていない場合）
git init
git add .
git commit -m "initial commit"

# GitHub にリポジトリを作成してから以下を実行
git remote add origin https://github.com/あなたのユーザー名/oshirate.git
git branch -M main
git push -u origin main
```

> GitHub でリポジトリを作る手順：
> [github.com/new](https://github.com/new) →「Private」で作成 →「…or push an existing repository」の手順を使う

---

## ⑤ Vercel にデプロイ

1. [vercel.com](https://vercel.com) を開く
2. GitHub アカウントでログイン
3. 「Add New Project」をクリック
4. `oshirate` リポジトリを選んで「Import」
5. Framework Preset が「Next.js」になっているか確認
6. まだ「Deploy」は押さない → 先に環境変数を設定する（次の手順）

---

## ⑥ 環境変数を設定

Vercel のプロジェクト設定画面（「Environment Variables」タブ）で以下を入力します。

Supabase の値は Supabase Dashboard →「Project Settings」→「API」から取得できます。

| 変数名 | どこから取得するか |
|--------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → anon public |
| `NEXT_PUBLIC_YAPI_USER_ID` | **後で設定**（ログイン後に取得） |

> `NEXT_PUBLIC_YAPI_USER_ID` は最初は空欄のままデプロイしてOK。ログイン後に値を取得してから追加する。

入力が終わったら「Deploy」をクリック。2〜3分でデプロイ完了。

---

## ⑦ やぴアカウントでログイン → 管理者設定

### Supabase 側に Vercel URL を追加

デプロイ完了後、Vercel に表示されている URL（例: `https://oshirate.vercel.app`）を Supabase に追加します。

1. Supabase Dashboard →「Authentication」→「URL Configuration」
2. 「Redirect URLs」に以下を追加：

```
https://あなたのvercel-url.vercel.app/auth/callback
```

3. 「Save」をクリック

### やぴアカウントでログイン

1. `https://あなたのvercel-url.vercel.app` を開く
2. Google でログイン
3. ホーム画面が表示されることを確認

### やぴを管理者に設定

1. Supabase Dashboard →「Authentication」→「Users」
2. やぴのアカウントを見つけて UUID をコピー
3. SQL Editor を開いて以下を実行：

```sql
update public.profiles
set is_admin = true
where id = 'ここにコピーしたUUID';
```

4. 「Success」が出ればOK

### YAPI_USER_ID を設定

1. 先ほどコピーした UUID を使って Vercel の環境変数を更新
2. Vercel Dashboard →「Settings」→「Environment Variables」
3. `NEXT_PUBLIC_YAPI_USER_ID` に UUID を入力して保存
4. 「Deployments」→「Redeploy」で再デプロイ

---

## ⑧ 実機で動作確認

以下の順番で確認してください。

### ログイン
- [ ] ログイン画面が表示される
- [ ] Google でログインできる
- [ ] ホームのプロフィール画面が表示される

### 30分プレゼント
- [ ] プレゼントの3択が表示される
- [ ] どれかを選ぶと pt が表示される
- [ ] 受け取り後、カウントダウンに切り替わる

### イラスト購入
- [ ] ILLUST COLLECTION のイラストをタップするとポップアップが開く
- [ ] 「購入」ができる（pt が足りない場合は「ポイント不足」と出る）
- [ ] 購入後、所持数が増える

### 通知
- [ ] プレゼント受け取り後、通知ページに通知が届いている
- [ ] イラスト購入後、通知が届いている
- [ ] BottomNav の「通知」バッジに未読数が出る

### 管理画面
- [ ] `/admin` にアクセスするとユーザー一覧が表示される
- [ ] 一般ユーザーアカウントで `/admin` にアクセスすると `/` にリダイレクトされる
- [ ] ポイント付与ができる
- [ ] 告知を保存できる

---

## よくあるエラーと対処

### `Error: supabase URL is undefined`
**原因**: 環境変数が設定されていない、または Vercel が再デプロイされていない
**対処**: Vercel の Environment Variables を確認 → Redeploy

---

### SQL 実行時に `already exists` エラー
**原因**: 同じ SQL を2回実行した
**対処**: そのまま次に進んでOK（既に作成済みなので問題なし）

---

### SQL 実行時に `function handle_updated_at() does not exist`
**原因**: schema.sql より前に migration を実行しようとしている
**対処**: schema.sql を最初に実行する

---

### Google ログイン後に `localhost` にリダイレクトされる
**原因**: Supabase の Redirect URLs に Vercel の URL が登録されていない
**対処**: Authentication → URL Configuration → Redirect URLs に `https://...vercel.app/auth/callback` を追加

---

### ログイン後に真っ白な画面
**原因**: `NEXT_PUBLIC_YAPI_USER_ID` が空のまま
**対処**: やぴの UUID を設定して Redeploy → 空でも crash はしないはずなのでコンソールエラーを確認

---

### `/admin` にアクセスできない（is_admin を設定したのに）
**原因**: Vercel のキャッシュ、またはセッションが古い
**対処**: ブラウザでログアウト → ログインし直す

---

## チェックリスト（完了したらチェック）

```
[ ] Supabase プロジェクト作成
[ ] Google OAuth 設定（Google Cloud + Supabase）
[ ] schema.sql 実行
[ ] migration_phase1_gift.sql 実行
[ ] migration_phase2_illustrations.sql 実行
[ ] migration_phase2.5_decorations.sql 実行
[ ] migration_phase3a_notifications.sql 実行
[ ] migration_phase3b_admin.sql 実行
[ ] seed_illustrations.sql 実行
[ ] GitHub にプッシュ
[ ] Vercel でデプロイ
[ ] 環境変数 2つ設定（SUPABASE_URL、ANON_KEY）
[ ] Vercel URL を Supabase に登録
[ ] やぴアカウントでログイン
[ ] is_admin = true に設定
[ ] NEXT_PUBLIC_YAPI_USER_ID を設定して再デプロイ
[ ] 全フロー確認
```

---

## デプロイ後に詰まったら

以下の情報を教えてもらえれば対処できます：

- どの手順で詰まったか
- エラーメッセージ（スクリーンショットでOK）
- Vercel のデプロイログ（Vercel Dashboard → Deployments → 該当デプロイ → Build Logs）
