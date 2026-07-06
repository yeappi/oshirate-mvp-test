-- ======================================================
-- Phase 4ZD: 初期体験 & 報酬土台
-- - 新規ユーザー初期500pt
-- - 初期タグ: 見習い / 先駆者
-- - 初期イラスト直接付与枠: 歴史の目撃者
-- - 初期限定イラスト券付与枠: はじまりの地
-- - 既存ユーザー向けbackfill RPC
-- - タグ表示上限 3 -> 6
-- ======================================================

-- ------------------------------------------------------
-- 1. Tags: MVP starter tags
-- ------------------------------------------------------
insert into public.profile_tags (id, label, variant, description, sort_order, is_active)
values
  ('apprentice', '見習い', 'low', '推されーとを始めたばかりの証。', 5, true),
  ('pioneer', '先駆者', 'rare', '推されーとの初期から参加している証。', 6, true)
on conflict (id) do update set
  label = excluded.label,
  variant = excluded.variant,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

-- ------------------------------------------------------
-- 2. Display tag limit: 3 -> 6
-- ------------------------------------------------------
alter table public.profile_display_tags
  drop constraint if exists profile_display_tags_display_order_check;

alter table public.profile_display_tags
  add constraint profile_display_tags_display_order_check
  check (display_order between 1 and 6);

-- ------------------------------------------------------
-- 3. Starter rewards RPC
-- Safe to run repeatedly. Missing illustrations/items are skipped.
-- ------------------------------------------------------
create or replace function public.grant_starter_rewards(
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_is_admin boolean := false;
  v_witness_illustration_id uuid;
  v_origin_illustration_id uuid;
  v_origin_item_id uuid;
  v_origin_price int;
  v_points_granted boolean := false;
  v_witness_granted boolean := false;
  v_origin_ticket_granted boolean := false;
begin
  if v_actor is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  select coalesce(p.is_admin, false)
  into v_is_admin
  from public.profiles p
  where p.id = v_actor;

  if v_actor <> p_user_id and v_is_admin is not true then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    return jsonb_build_object('ok', false, 'error', 'profile_not_found');
  end if;

  -- 500pt starter bonus. Idempotent via point_logs.
  if not exists (
    select 1
    from public.point_logs pl
    where pl.user_id = p_user_id
      and pl.reason = 'starter_bonus'
      and coalesce(pl.meta->>'key', '') = 'starter_500'
  ) then
    update public.profiles
    set points = points + 500
    where id = p_user_id;

    insert into public.point_logs (user_id, delta, reason, meta)
    values (p_user_id, 500, 'starter_bonus', jsonb_build_object('key', 'starter_500'));

    v_points_granted := true;
  end if;

  -- Starter tags.
  insert into public.user_tags (user_id, tag_id, acquired_reason)
  select p_user_id, pt.id, 'starter_reward'
  from public.profile_tags pt
  where pt.id in ('apprentice', 'pioneer')
    and pt.is_active = true
  on conflict (user_id, tag_id) do nothing;

  -- Default displayed tags for new/empty profiles only.
  insert into public.profile_display_tags (user_id, tag_id, display_order)
  select p_user_id, t.tag_id, t.display_order
  from (
    values
      ('apprentice', 1),
      ('pioneer', 2)
  ) as t(tag_id, display_order)
  join public.profile_tags pt on pt.id = t.tag_id and pt.is_active = true
  where not exists (
    select 1
    from public.profile_display_tags existing
    where existing.user_id = p_user_id
  )
  on conflict do nothing;

  -- Direct starter illustration: 歴史の目撃者.
  select i.id
  into v_witness_illustration_id
  from public.illustrations i
  where i.title = '歴史の目撃者'
    and i.is_active = true
  order by i.sort_order asc, i.created_at asc
  limit 1;

  if v_witness_illustration_id is not null then
    insert into public.user_illustrations (user_id, illustration_id, quantity)
    values (p_user_id, v_witness_illustration_id, 1)
    on conflict (user_id, illustration_id) do nothing;

    get diagnostics v_witness_granted = row_count;
  end if;

  -- Starter ticket: はじまりの地.
  -- If the illustration exists, auto-create/reuse a ticket item and grant one.
  select i.id, i.price
  into v_origin_illustration_id, v_origin_price
  from public.illustrations i
  where i.title = 'はじまりの地'
    and i.is_active = true
  order by i.sort_order asc, i.created_at asc
  limit 1;

  if v_origin_illustration_id is not null then
    select it.id
    into v_origin_item_id
    from public.items it
    where it.item_type = 'ILLUST_TICKET'
      and it.target_illustration_id = v_origin_illustration_id
      and it.name = 'はじまりの地チケット'
    limit 1;

    if v_origin_item_id is null then
      insert into public.items (
        name,
        description,
        item_type,
        target_illustration_id,
        charisma_value,
        is_active,
        sort_order
      )
      values (
        'はじまりの地チケット',
        '初期ユーザー向けの限定イラスト券。自分にもフォロー中の相手にも使えます。',
        'ILLUST_TICKET',
        v_origin_illustration_id,
        greatest(coalesce(v_origin_price, 0), 0),
        true,
        -100
      )
      returning id into v_origin_item_id;

      update public.illustrations
      set is_special = true,
          requires_item_ticket = true,
          special_label = coalesce(special_label, 'STARTER LIMITED')
      where id = v_origin_illustration_id;
    end if;

    if v_origin_item_id is not null and not exists (
      select 1
      from public.user_items ui
      where ui.user_id = p_user_id
        and ui.item_id = v_origin_item_id
    ) then
      insert into public.user_items (user_id, item_id)
      values (p_user_id, v_origin_item_id);

      v_origin_ticket_granted := true;
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'points_granted', v_points_granted,
    'witness_granted', v_witness_granted,
    'origin_ticket_granted', v_origin_ticket_granted
  );
end;
$$;

grant execute on function public.grant_starter_rewards(uuid) to authenticated;

-- ------------------------------------------------------
-- 4. Bootstrap new users with starter rewards
-- ------------------------------------------------------
create or replace function public.bootstrap_user_profile(
  p_user_id uuid,
  p_name text default null,
  p_avatar_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rewards jsonb;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    return jsonb_build_object('ok', false, 'error', 'not_self');
  end if;

  insert into public.profiles (
    id,
    name,
    avatar_url,
    points,
    charisma,
    is_admin,
    selected_background_id,
    selected_avatar_frame_id,
    total_spent_points
  )
  values (
    p_user_id,
    coalesce(nullif(trim(coalesce(p_name, '')), ''), '名無し'),
    nullif(trim(coalesce(p_avatar_url, '')), ''),
    0,
    0,
    false,
    'starter',
    'black',
    0
  )
  on conflict (id) do update set
    name = coalesce(public.profiles.name, excluded.name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    selected_background_id = coalesce(public.profiles.selected_background_id, 'starter'),
    selected_avatar_frame_id = coalesce(public.profiles.selected_avatar_frame_id, 'black'),
    total_spent_points = coalesce(public.profiles.total_spent_points, 0),
    updated_at = now();

  perform public.sync_level_reward_tags(p_user_id);
  v_rewards := public.grant_starter_rewards(p_user_id);

  return jsonb_build_object('ok', true, 'starter_rewards', v_rewards);
end;
$$;

grant execute on function public.bootstrap_user_profile(uuid, text, text) to authenticated;

-- ------------------------------------------------------
-- 5. Admin backfill for existing users / after assets are registered
-- ------------------------------------------------------
create or replace function public.admin_backfill_starter_rewards()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_count int := 0;
  v_profile record;
begin
  if v_actor is null or not exists (
    select 1
    from public.profiles p
    where p.id = v_actor
      and p.is_admin = true
  ) then
    return jsonb_build_object('ok', false, 'error', 'admin_only');
  end if;

  for v_profile in select id from public.profiles loop
    perform public.grant_starter_rewards(v_profile.id);
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('ok', true, 'processed', v_count);
end;
$$;

grant execute on function public.admin_backfill_starter_rewards() to authenticated;
