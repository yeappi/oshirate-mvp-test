-- ======================================================
-- Phase 4H: MVP stability pack
-- - New user bootstrap for profile/background/tags
-- - Security guard for purchase/admin RPCs
-- - Existing data repair for missing starter background/tags
-- ======================================================

-- ------------------------------------------------------
-- 1. New user bootstrap RPC
-- Called after OAuth callback. Runs as security definer so it can create
-- initial tags/display tags without adding broad client insert policies.
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
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    return jsonb_build_object('ok', false, 'error', 'not_self');
  end if;

  insert into public.profiles (
    id,
    name,
    avatar_url,
    is_admin,
    points,
    charisma,
    selected_background_id
  )
  values (
    p_user_id,
    nullif(trim(coalesce(p_name, '')), ''),
    nullif(trim(coalesce(p_avatar_url, '')), ''),
    false,
    0,
    0,
    'starter'
  )
  on conflict (id) do update set
    name = coalesce(public.profiles.name, excluded.name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    selected_background_id = coalesce(public.profiles.selected_background_id, 'starter'),
    updated_at = now();

  -- Initial owned tags. Only insert tags that exist and are active.
  insert into public.user_tags (user_id, tag_id, acquired_reason)
  select p_user_id, pt.id, 'initial_bootstrap'
  from public.profile_tags pt
  where pt.id in (
    'starter_member',
    'watching_over',
    'supported_type',
    'growing',
    'swamp_entrance',
    'oshi_apprentice'
  )
  and pt.is_active = true
  on conflict (user_id, tag_id) do nothing;

  -- Initial displayed tags. Do not overwrite if the user already chose tags.
  insert into public.profile_display_tags (user_id, tag_id, display_order)
  select p_user_id, t.tag_id, t.display_order
  from (
    values
      ('starter_member', 1),
      ('watching_over', 2),
      ('supported_type', 3)
  ) as t(tag_id, display_order)
  join public.profile_tags pt on pt.id = t.tag_id and pt.is_active = true
  where not exists (
    select 1
    from public.profile_display_tags existing
    where existing.user_id = p_user_id
  )
  on conflict do nothing;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.bootstrap_user_profile(uuid, text, text) to authenticated;

-- ------------------------------------------------------
-- 2. Existing data repair
-- Safe to run repeatedly. Useful for users created before this migration.
-- ------------------------------------------------------
update public.profiles
set selected_background_id = 'starter'
where selected_background_id is null
  and exists (select 1 from public.profile_backgrounds where id = 'starter');

insert into public.user_tags (user_id, tag_id, acquired_reason)
select p.id, pt.id, 'stability_repair'
from public.profiles p
join public.profile_tags pt on pt.id in (
  'starter_member',
  'watching_over',
  'supported_type',
  'growing',
  'swamp_entrance',
  'oshi_apprentice'
)
where pt.is_active = true
on conflict (user_id, tag_id) do nothing;

insert into public.profile_display_tags (user_id, tag_id, display_order)
select p.id, t.tag_id, t.display_order
from public.profiles p
cross join (
  values
    ('starter_member', 1),
    ('watching_over', 2),
    ('supported_type', 3)
) as t(tag_id, display_order)
join public.profile_tags pt on pt.id = t.tag_id and pt.is_active = true
where not exists (
  select 1
  from public.profile_display_tags existing
  where existing.user_id = p.id
)
on conflict do nothing;

-- ------------------------------------------------------
-- 3. Harden purchase RPC
-- Prevent a logged-in user from calling the RPC directly with someone else's
-- buyer id. Existing purchase behavior is preserved.
-- ------------------------------------------------------
create or replace function public.purchase_illustration(
  p_buyer_id      uuid,
  p_target_id     uuid,
  p_illust_id     uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_price              int;
  v_max_per_user       int;
  v_buyer_points       bigint;
  v_owned_qty          int;
  v_reward_tag_id      text;
  v_reward_tag_granted boolean := false;
begin
  if auth.uid() is null or auth.uid() <> p_buyer_id then
    return jsonb_build_object('ok', false, 'error', 'not_self');
  end if;

  if not exists (select 1 from public.profiles where id = p_target_id) then
    return jsonb_build_object('ok', false, 'error', 'target_not_found');
  end if;

  select price, max_per_user, reward_tag_id
  into v_price, v_max_per_user, v_reward_tag_id
  from public.illustrations
  where id = p_illust_id and is_active = true;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'illustration_not_found');
  end if;

  select points into v_buyer_points
  from public.profiles
  where id = p_buyer_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'profile_not_found');
  end if;

  if v_buyer_points < v_price then
    return jsonb_build_object('ok', false, 'error', 'insufficient_points');
  end if;

  if v_max_per_user is not null then
    select coalesce(quantity, 0) into v_owned_qty
    from public.user_illustrations
    where user_id = p_buyer_id and illustration_id = p_illust_id;

    if coalesce(v_owned_qty, 0) >= v_max_per_user then
      return jsonb_build_object('ok', false, 'error', 'purchase_limit_reached');
    end if;
  end if;

  update public.profiles
  set points = points - v_price
  where id = p_buyer_id;

  update public.profiles
  set charisma = charisma + v_price
  where id = p_target_id;

  insert into public.user_illustrations (user_id, illustration_id, quantity)
  values (p_buyer_id, p_illust_id, 1)
  on conflict (user_id, illustration_id)
  do update set quantity = user_illustrations.quantity + 1,
                updated_at = now();

  insert into public.illustration_purchases (buyer_user_id, target_user_id, illustration_id, point)
  values (p_buyer_id, p_target_id, p_illust_id, v_price);

  insert into public.point_logs (user_id, delta, reason, meta)
  values (p_buyer_id, -v_price, 'illust_purchase',
          jsonb_build_object('illustration_id', p_illust_id));

  if v_reward_tag_id is not null then
    insert into public.user_tags (user_id, tag_id, acquired_reason)
    values (p_buyer_id, v_reward_tag_id, 'illustration_purchase')
    on conflict (user_id, tag_id) do nothing;

    get diagnostics v_owned_qty = row_count;
    v_reward_tag_granted := v_owned_qty > 0;
  end if;

  return jsonb_build_object(
    'ok', true,
    'price', v_price,
    'reward_tag_id', v_reward_tag_id,
    'reward_tag_granted', v_reward_tag_granted
  );
end;
$$;

grant execute on function public.purchase_illustration(uuid, uuid, uuid) to authenticated;

-- ------------------------------------------------------
-- 4. Harden admin points RPC
-- The API already checks admin, but the RPC now also requires the caller to be
-- the same admin id passed in.
-- ------------------------------------------------------
create or replace function public.admin_adjust_points(
  p_admin_id    uuid,
  p_target_id   uuid,
  p_amount      bigint,
  p_reason      text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin       boolean;
  v_current_points bigint;
  v_new_points     bigint;
begin
  if auth.uid() is null or auth.uid() <> p_admin_id then
    return jsonb_build_object('ok', false, 'error', 'not_self');
  end if;

  select is_admin into v_is_admin from public.profiles where id = p_admin_id;
  if not coalesce(v_is_admin, false) then
    return jsonb_build_object('ok', false, 'error', 'not_admin');
  end if;

  select points into v_current_points from public.profiles where id = p_target_id for update;
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

grant execute on function public.admin_adjust_points(uuid, uuid, bigint, text) to authenticated;
