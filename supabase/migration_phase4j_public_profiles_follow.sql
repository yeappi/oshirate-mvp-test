-- ======================================================
-- Phase 4J: public profiles + follows
--   - follow / unfollow
--   - discover/following screens
--   - public profile display support
-- ======================================================

create table if not exists public.user_follows (
  id           uuid primary key default uuid_generate_v4(),
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  followed_id  uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (follower_id, followed_id),
  check (follower_id <> followed_id)
);

alter table public.user_follows enable row level security;

drop policy if exists "user_follows: self read" on public.user_follows;
drop policy if exists "user_follows: self insert" on public.user_follows;
drop policy if exists "user_follows: self delete" on public.user_follows;

create policy "user_follows: self read"
on public.user_follows
for select
to authenticated
using (auth.uid() = follower_id);

create policy "user_follows: self insert"
on public.user_follows
for insert
to authenticated
with check (auth.uid() = follower_id and follower_id <> followed_id);

create policy "user_follows: self delete"
on public.user_follows
for delete
to authenticated
using (auth.uid() = follower_id);

create index if not exists user_follows_follower_created_idx
  on public.user_follows (follower_id, created_at desc);

create index if not exists user_follows_followed_idx
  on public.user_follows (followed_id);

-- 公開プロフィールでは、選択中タグだけは他ユーザーからも見えるようにする。
-- user_tags 全体は公開しない。
drop policy if exists "profile_display_tags_select_public" on public.profile_display_tags;
create policy "profile_display_tags_select_public"
on public.profile_display_tags
for select
to authenticated
using (true);
