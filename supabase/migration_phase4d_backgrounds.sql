-- ======================================================
-- Phase 4D: Lv解放プロフィール背景
-- CSS仮背景でMVP体験を作り、後から image_url で素材差し替え可能にする
-- ======================================================

create table if not exists public.profile_backgrounds (
  id              text primary key,
  name            text not null,
  description     text,
  css_key         text not null unique,
  image_url        text,
  required_level  int not null default 1 check (required_level between 1 and 20),
  sort_order      int not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.profile_backgrounds enable row level security;

drop policy if exists "profile_backgrounds: authenticated read" on public.profile_backgrounds;
create policy "profile_backgrounds: authenticated read"
  on public.profile_backgrounds
  for select
  to authenticated
  using (is_active = true);

alter table public.profiles
  add column if not exists selected_background_id text references public.profile_backgrounds(id);

drop trigger if exists profile_backgrounds_updated_at on public.profile_backgrounds;
create trigger profile_backgrounds_updated_at
  before update on public.profile_backgrounds
  for each row execute function public.handle_updated_at();

insert into public.profile_backgrounds
  (id, name, description, css_key, image_url, required_level, sort_order, is_active)
values
  ('starter',     'はじまり',       '最初から使える標準背景',                     'starter',     null,  1, 10, true),
  ('mint_glow',   'ミントグロー',   'Lv3で解放される淡いミントの光',             'mint_glow',   null,  3, 20, true),
  ('neon_night',  'ネオンナイト',   'Lv5で解放される夜っぽいネオン背景',         'neon_night',  null,  5, 30, true),
  ('gold_stage',  'ゴールドステージ','Lv10で解放されるステージ風の金色背景',      'gold_stage',  null, 10, 40, true),
  ('aurora',      'オーロラ',       'Lv15で解放されるオーロラ風の特別背景',      'aurora',      null, 15, 50, true),
  ('legend',      '殿堂',           'Lv20で解放される最高Lv用の限定背景',        'legend',      null, 20, 60, true)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  css_key = excluded.css_key,
  image_url = excluded.image_url,
  required_level = excluded.required_level,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = now();

update public.profiles
set selected_background_id = 'starter'
where selected_background_id is null;
