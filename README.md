# 推されーと MVP

推し/ユーザーのプロフィールを「シール帳」のように埋めていくMVPです。
Googleログイン、30分プレゼント、イラスト購入、公開プロフィール、フォロー、背景/タグ/枠、もちものアイテム券、admin管理を含みます。

## 現在の主な機能

| 領域 | 内容 | 状態 |
|---|---|---|
| Auth | Googleログイン / プロフィール自動作成 | ✅ |
| Profile | 名前・一言・アバター・背景・タグ・枠 | ✅ |
| Gift | 30分プレゼント / pt付与 | ✅ |
| Illustration | 購入 / 所持 / お気に入り / 限定イラスト | ✅ |
| Public | 公開プロフィール / フォロー / フォロー一覧 | ✅ |
| Level | charisma → Lv / Lv報酬 | ✅ |
| Items | もちもの / イラスト券・背景券・枠券・タグ券 | ✅ |
| Admin | ユーザー確認 / pt調整 / イラスト管理 / アイテム配布 | ✅ |

## セットアップ

```bash
npm install
npm run dev
```

`.env.local` を作成して以下を設定します。

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxx
NEXT_PUBLIC_YAPI_USER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

`NEXT_PUBLIC_YAPI_USER_ID` は、開発者プロフィール導線に使います。初回ログイン後、Supabase Authentication のユーザーUUIDを入れてください。

## Supabase

新規環境では `supabase/schema.sql` の後、`supabase/migration_phase*.sql` を番号順に実行してください。
詳しい順番は `DEPLOY.md` を参照してください。

最新の重要RPCは以下です。

- `purchase_illustration` : 最新定義は `migration_phase4s_hardening.sql`
- `claim_gift_slot` : 30分プレゼント受取のatomic処理
- `use_owned_item` : もちもの使用
- `get_charisma_ranking` : 魅力値ランキング
- `bootstrap_user_profile` : 初回ログイン補助

## ディレクトリ

```text
app/          Next.js App Router pages / API routes
components/   UI components
lib/          Supabase helpers / domain logic
public/       PWA icons / static assets
supabase/     schema, migrations, storage policies, seeds
```

## 注意

- `tsconfig.tsbuildinfo` や `.next/` はコミットしません。
- `rank.ts` は旧装飾解放/通知用の内部ランク、`level.ts` は画面表示用Lvです。
- 画面仕様を変える前に、公開プロフィール・購入・もちもの・adminの動作確認をしてください。
