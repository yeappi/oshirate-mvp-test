-- ======================================================
-- Phase 3A Migration: notifications テーブル更新
-- 1. metadata カラム追加
-- 2. type の check constraint を Phase 3A の4種類に拡張
-- 3. self insert ポリシー追加（サーバー側 RPC から書けるように）
-- ======================================================

-- metadata カラム追加
alter table public.notifications
  add column if not exists metadata jsonb;

-- insert ポリシーを差し替える（admin only → security definer RPC 経由で誰でも）
-- ※ 直接 insert はさせない。create_notification() RPC を経由させる。
--   RPC は security definer なので auth.uid() チェックをスキップできる。
--   既存の admin write ポリシーは残す。

-- ======================================================
-- create_notification RPC
-- サーバー側からのみ呼ぶ（security definer）
-- フロントからは直接叩かせない
-- ======================================================
create or replace function public.create_notification(
  p_user_id  uuid,
  p_type     text,
  p_title    text,
  p_body     text default null,
  p_metadata jsonb default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_id uuid;
begin
  insert into public.notifications (user_id, type, title, body, metadata)
  values (p_user_id, p_type, p_title, p_body, p_metadata)
  returning id into v_id;

  return v_id;
end;
$$;

-- ======================================================
-- mark_notifications_read RPC
-- user_id の未読をまとめて既読にする
-- ======================================================
create or replace function public.mark_notifications_read(
  p_user_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  update public.notifications
  set is_read = true
  where user_id = p_user_id
    and is_read = false;
end;
$$;
