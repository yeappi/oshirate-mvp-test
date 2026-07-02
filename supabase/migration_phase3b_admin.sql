-- ======================================================
-- Phase 3B Migration
-- 1. announcements に title カラム追加
-- 2. admin_point_logs テーブル新規作成
-- 3. admin_adjust_points RPC（ポイント手動調整）
-- ======================================================

-- announcements: title 追加
alter table public.announcements
  add column if not exists title text not null default '';

-- ===== admin_point_logs =====
create table public.admin_point_logs (
  id              uuid primary key default uuid_generate_v4(),
  admin_user_id   uuid not null references public.profiles(id) on delete cascade,
  target_user_id  uuid not null references public.profiles(id) on delete cascade,
  amount          bigint not null,   -- 正: 付与, 負: 減算
  reason          text not null,
  created_at      timestamptz not null default now()
);

alter table public.admin_point_logs enable row level security;

create policy "admin_point_logs: admin all"
  on public.admin_point_logs for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- ===== admin_adjust_points RPC =====
create or replace function public.admin_adjust_points(
  p_admin_id    uuid,
  p_target_id   uuid,
  p_amount      bigint,
  p_reason      text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_is_admin       boolean;
  v_current_points bigint;
  v_new_points     bigint;
begin
  select is_admin into v_is_admin from public.profiles where id = p_admin_id;
  if not coalesce(v_is_admin, false) then
    return jsonb_build_object('ok', false, 'error', 'not_admin');
  end if;

  select points into v_current_points from public.profiles where id = p_target_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'user_not_found');
  end if;

  v_new_points := greatest(v_current_points + p_amount, 0);

  update public.profiles set points = v_new_points where id = p_target_id;

  insert into public.admin_point_logs (admin_user_id, target_user_id, amount, reason)
  values (p_admin_id, p_target_id, p_amount, p_reason);

  insert into public.point_logs (user_id, delta, reason, meta)
  values (p_target_id, p_amount, 'admin_grant',
          jsonb_build_object('admin_id', p_admin_id, 'reason', p_reason));

  return jsonb_build_object(
    'ok', true,
    'previousPoints', v_current_points,
    'newPoints', v_new_points,
    'delta', p_amount
  );
end;
$$;

-- ===== admin_get_users RPC =====
-- profiles + auth.users を結合してユーザー一覧を返す
-- security definer で RLS をバイパスする（管理者確認は呼び出し元で行う）
create or replace function public.admin_get_users()
returns table (
  id          uuid,
  name        text,
  email       text,
  points      bigint,
  charisma    bigint,
  is_admin    boolean,
  created_at  timestamptz,
  updated_at  timestamptz
)
language plpgsql
security definer
as $$
begin
  -- 呼び出し元が管理者か確認
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  ) then
    raise exception 'not_admin';
  end if;

  return query
  select
    p.id,
    p.name,
    u.email,
    p.points,
    p.charisma,
    p.is_admin,
    p.created_at,
    p.updated_at
  from public.profiles p
  join auth.users u on u.id = p.id
  order by p.created_at desc;
end;
$$;
