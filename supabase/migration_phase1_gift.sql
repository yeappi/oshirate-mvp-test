-- ======================================================
-- Phase 1 Migration: gift_slots テーブル再作成
-- Phase 0.5 の gift_slots を DROP して仕様通りに作り直す
-- ======================================================

drop table if exists public.gift_slots;

create table public.gift_slots (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  table_type      text not null check (table_type in ('normal', 'gold')),
  options         int[] not null,           -- [slot_a, slot_b, slot_c]
  selected_index  int,                      -- null=未受取 | 0|1|2
  selected_point  int,                      -- 受取後にセット
  status          text not null default 'pending' check (status in ('pending', 'claimed')),
  available_at    timestamptz not null,     -- 次のプレゼントが受取可能になる時刻
  claimed_at      timestamptz,
  created_at      timestamptz not null default now()
);

alter table public.gift_slots enable row level security;

create policy "gift_slots: self read"
  on public.gift_slots for select
  using (auth.uid() = user_id);

create policy "gift_slots: self insert"
  on public.gift_slots for insert
  with check (auth.uid() = user_id);

create policy "gift_slots: self update"
  on public.gift_slots for update
  using (auth.uid() = user_id);

-- ======================================================
-- increment_points RPC
-- ポイント加算をアトミックに行う
-- ======================================================
create or replace function public.increment_points(
  p_user_id uuid,
  p_delta   bigint
)
returns void
language plpgsql
security definer
as $$
begin
  update public.profiles
  set points = points + p_delta
  where id = p_user_id;

  -- point_logs にも記録
  insert into public.point_logs (user_id, delta, reason)
  values (p_user_id, p_delta, 'gift_30min');
end;
$$;
