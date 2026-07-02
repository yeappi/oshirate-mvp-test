-- ======================================================
-- Phase 2.5 Migration
-- profile_decorations    装飾素材マスター
-- user_profile_decorations   ユーザーの装飾選択状態
-- ======================================================

-- ===== profile_decorations =====
create table public.profile_decorations (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  description   text,
  slot          text not null check (slot in (
                  'profile_background',
                  'avatar_around',
                  'avatar_frame',
                  'above_name',
                  'comment_decoration'
                )),
  asset_url     text,                     -- null = SVG未制作（仮データ）
  asset_type    text not null default 'svg' check (asset_type in ('svg', 'png', 'webp')),
  required_rank int  not null default 1,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.profile_decorations enable row level security;

-- 全ユーザーがアクティブ素材を閲覧可能
create policy "profile_decorations: public read"
  on public.profile_decorations for select
  using (is_active = true);

-- 管理者のみ追加・編集
create policy "profile_decorations: admin write"
  on public.profile_decorations for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

create trigger profile_decorations_updated_at
  before update on public.profile_decorations
  for each row execute function public.handle_updated_at();

-- ===== user_profile_decorations =====
-- ユーザーが現在どのスロットにどの装飾を設定しているか
-- slot ごとに 1 行（unique constraint）
create table public.user_profile_decorations (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  slot           text not null check (slot in (
                   'profile_background',
                   'avatar_around',
                   'avatar_frame',
                   'above_name',
                   'comment_decoration'
                 )),
  decoration_id  uuid not null references public.profile_decorations(id) on delete cascade,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, slot)
);

alter table public.user_profile_decorations enable row level security;

-- 自分の設定は自分だけ読める
create policy "user_profile_decorations: self read"
  on public.user_profile_decorations for select
  using (auth.uid() = user_id);

-- 管理者は全閲覧
create policy "user_profile_decorations: admin read"
  on public.user_profile_decorations for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

create policy "user_profile_decorations: self insert"
  on public.user_profile_decorations for insert
  with check (auth.uid() = user_id);

create policy "user_profile_decorations: self update"
  on public.user_profile_decorations for update
  using (auth.uid() = user_id);

create policy "user_profile_decorations: self delete"
  on public.user_profile_decorations for delete
  using (auth.uid() = user_id);

create trigger user_profile_decorations_updated_at
  before update on public.user_profile_decorations
  for each row execute function public.handle_updated_at();

-- ===== seed: 仮装飾素材（各スロット×ランク1〜3）=====
-- asset_url = null → フロントでプレースホルダー表示
-- 後からSVG素材URLを update で差し込む
insert into public.profile_decorations
  (name, description, slot, asset_url, asset_type, required_rank)
values
  -- profile_background
  ('背景 シンプル',     '落ち着いたグラデーション背景',   'profile_background', null, 'svg', 1),
  ('背景 ミント',       'ミントカラーの光沢背景',         'profile_background', null, 'svg', 2),
  ('背景 プレミアム',   '高級感のある暗色背景',           'profile_background', null, 'svg', 3),
  -- avatar_around
  ('アイコン周り 基本', 'シンプルなリング装飾',           'avatar_around',      null, 'svg', 1),
  ('アイコン周り 輝き', '光のエフェクト付きリング',       'avatar_around',      null, 'svg', 2),
  ('アイコン周り 星',   'スター散りばめリング',           'avatar_around',      null, 'svg', 3),
  -- avatar_frame
  ('フレーム 細線',     'ミニマルな細線フレーム',         'avatar_frame',       null, 'svg', 1),
  ('フレーム 二重線',   '二重リングフレーム',             'avatar_frame',       null, 'svg', 2),
  ('フレーム 装飾',     '装飾的なゴールドフレーム',       'avatar_frame',       null, 'svg', 3),
  -- above_name
  ('名前上 ライン',     'シンプルな区切りライン',         'above_name',         null, 'svg', 1),
  ('名前上 タイトル',   '称号風テキストデコレーション',   'above_name',         null, 'svg', 2),
  ('名前上 エンブレム', 'エンブレム型デコレーション',     'above_name',         null, 'svg', 3),
  -- comment_decoration
  ('コメント 引用符',   'クラシックな引用符装飾',         'comment_decoration', null, 'svg', 1),
  ('コメント 枠線',     '繊細な枠線装飾',                 'comment_decoration', null, 'svg', 2),
  ('コメント 光',       '光のオーラ装飾',                 'comment_decoration', null, 'svg', 3);
