-- ======================================================
-- Phase 4I: PWA + favorite illustrations
--   - user_favorite_illustrations
--   - 最大3件のお気に入りイラスト
-- ======================================================

create table if not exists public.user_favorite_illustrations (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  illustration_id uuid not null references public.illustrations(id) on delete cascade,
  favorite_order  int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, illustration_id)
);

alter table public.user_favorite_illustrations enable row level security;

drop policy if exists "user_favorite_illustrations: self read" on public.user_favorite_illustrations;
drop policy if exists "user_favorite_illustrations: self insert" on public.user_favorite_illustrations;
drop policy if exists "user_favorite_illustrations: self update" on public.user_favorite_illustrations;
drop policy if exists "user_favorite_illustrations: self delete" on public.user_favorite_illustrations;

create policy "user_favorite_illustrations: self read"
  on public.user_favorite_illustrations
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "user_favorite_illustrations: self insert"
  on public.user_favorite_illustrations
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.user_illustrations ui
      where ui.user_id = auth.uid()
        and ui.illustration_id = user_favorite_illustrations.illustration_id
    )
  );

create policy "user_favorite_illustrations: self update"
  on public.user_favorite_illustrations
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.user_illustrations ui
      where ui.user_id = auth.uid()
        and ui.illustration_id = user_favorite_illustrations.illustration_id
    )
  );

create policy "user_favorite_illustrations: self delete"
  on public.user_favorite_illustrations
  for delete
  to authenticated
  using (auth.uid() = user_id);

drop trigger if exists user_favorite_illustrations_updated_at on public.user_favorite_illustrations;
create trigger user_favorite_illustrations_updated_at
  before update on public.user_favorite_illustrations
  for each row execute function public.handle_updated_at();

create index if not exists user_favorite_illustrations_user_order_idx
  on public.user_favorite_illustrations (user_id, favorite_order asc, created_at asc);
