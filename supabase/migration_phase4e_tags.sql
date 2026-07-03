-- Phase 4E: Profile tags foundation
-- 所持タグを確認し、最大3個をプロフィールに貼るための最小構成。

create table if not exists public.profile_tags (
  id text primary key,
  label text not null,
  variant text not null default 'mid' check (variant in ('rare', 'high', 'mid', 'low')),
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.user_tags (
  user_id uuid not null references public.profiles(id) on delete cascade,
  tag_id text not null references public.profile_tags(id) on delete cascade,
  acquired_reason text,
  created_at timestamptz not null default now(),
  primary key (user_id, tag_id)
);

create table if not exists public.profile_display_tags (
  user_id uuid not null references public.profiles(id) on delete cascade,
  tag_id text not null references public.profile_tags(id) on delete cascade,
  display_order integer not null check (display_order between 1 and 3),
  created_at timestamptz not null default now(),
  primary key (user_id, tag_id),
  unique (user_id, display_order)
);

alter table public.profile_tags enable row level security;
alter table public.user_tags enable row level security;
alter table public.profile_display_tags enable row level security;

-- 何度でも実行できるように policy を作り直す
drop policy if exists "profile_tags_select_active" on public.profile_tags;
drop policy if exists "user_tags_select_own" on public.user_tags;
drop policy if exists "profile_display_tags_select_own" on public.profile_display_tags;
drop policy if exists "profile_display_tags_insert_own" on public.profile_display_tags;
drop policy if exists "profile_display_tags_delete_own" on public.profile_display_tags;

create policy "profile_tags_select_active"
on public.profile_tags
for select
to authenticated
using (is_active = true);

create policy "user_tags_select_own"
on public.user_tags
for select
to authenticated
using (auth.uid() = user_id);

create policy "profile_display_tags_select_own"
on public.profile_display_tags
for select
to authenticated
using (auth.uid() = user_id);

create policy "profile_display_tags_insert_own"
on public.profile_display_tags
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.user_tags ut
    where ut.user_id = auth.uid()
      and ut.tag_id = profile_display_tags.tag_id
  )
);

create policy "profile_display_tags_delete_own"
on public.profile_display_tags
for delete
to authenticated
using (auth.uid() = user_id);

insert into public.profile_tags (id, label, variant, description, sort_order, is_active)
values
  ('starter_member', '初期勢', 'rare', '推されーとの初期実験に参加した証。', 10, true),
  ('watching_over', '見守られ中', 'mid', '応援の芽を見守ってもらっているタグ。', 20, true),
  ('supported_type', '応援され体質', 'high', 'なぜか応援したくなる人のタグ。', 30, true),
  ('growing', '伸びしろ', 'mid', 'ここから育っていく余白のタグ。', 40, true),
  ('swamp_entrance', '沼の入口', 'high', '気づいたら見に来てしまう入口。', 50, true),
  ('oshi_apprentice', '推され見習い', 'low', '推されーとの世界に入りたてのタグ。', 60, true)
on conflict (id) do update set
  label = excluded.label,
  variant = excluded.variant,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

-- 既存ユーザーに初期タグを付与。今後の自動付与は別Phaseで実装予定。
insert into public.user_tags (user_id, tag_id, acquired_reason)
select p.id, t.tag_id, 'initial_seed'
from public.profiles p
cross join (
  values
    ('starter_member'),
    ('watching_over'),
    ('supported_type'),
    ('growing'),
    ('swamp_entrance'),
    ('oshi_apprentice')
) as t(tag_id)
on conflict (user_id, tag_id) do nothing;

-- 既存ユーザーの表示タグを初期セット。既に設定済みなら触らない。
insert into public.profile_display_tags (user_id, tag_id, display_order)
select p.id, t.tag_id, t.display_order
from public.profiles p
cross join (
  values
    ('starter_member', 1),
    ('watching_over', 2),
    ('supported_type', 3)
) as t(tag_id, display_order)
on conflict do nothing;
