-- ======================================================
-- Phase 4L: Lv reward realization
-- - Lv reward list now matches actual unlocks
-- - Lv reward tags are granted automatically based on charisma
-- - Background unlocks remain level-based via profile_backgrounds.required_level
-- - Avatar frames remain spent-point rewards, not Lv rewards
-- ======================================================

-- ------------------------------------------------------
-- 1. Seed actual Lv reward tags
-- ------------------------------------------------------
insert into public.profile_tags (id, label, variant, description, sort_order, is_active)
values
  ('level_05_kirameki',  'きらめき', 'high', 'Lv5到達で解放される、プロフィールが光り始めた証。', 110, true),
  ('level_10_attention', '注目株',   'rare', 'Lv10到達で解放される、見られる理由が増えてきた証。', 120, true),
  ('level_15_oshi_star', '推され星', 'rare', 'Lv15到達で解放される、推される存在感が強まった証。', 130, true),
  ('level_20_legend',    '殿堂入り', 'rare', 'Lv20到達で解放される、MVP内最高Lvの記念タグ。', 140, true)
on conflict (id) do update set
  label = excluded.label,
  variant = excluded.variant,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

-- ------------------------------------------------------
-- 2. Function: grant Lv reward tags based on current charisma
-- Safe to call repeatedly. Returns only newly granted tag ids.
-- ------------------------------------------------------
create or replace function public.sync_level_reward_tags(
  p_user_id uuid
)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_charisma bigint;
  v_newly_granted text[] := array[]::text[];
begin
  select coalesce(charisma, 0)::bigint
  into v_charisma
  from public.profiles
  where id = p_user_id;

  if not found then
    return v_newly_granted;
  end if;

  with rewards(tag_id, required_charisma) as (
    values
      ('watching_over',        10::bigint),   -- Lv2
      ('level_05_kirameki',   100::bigint),   -- Lv5
      ('level_10_attention',  600::bigint),   -- Lv10
      ('level_15_oshi_star', 1900::bigint),   -- Lv15
      ('level_20_legend',    4500::bigint)    -- Lv20
  ), inserted as (
    insert into public.user_tags (user_id, tag_id, acquired_reason)
    select p_user_id, r.tag_id, 'level_reward'
    from rewards r
    join public.profile_tags pt on pt.id = r.tag_id and pt.is_active = true
    where v_charisma >= r.required_charisma
    on conflict (user_id, tag_id) do nothing
    returning tag_id
  )
  select coalesce(array_agg(tag_id), array[]::text[])
  into v_newly_granted
  from inserted;

  return v_newly_granted;
end;
$$;

grant execute on function public.sync_level_reward_tags(uuid) to authenticated;

-- ------------------------------------------------------
-- 3. Existing users: grant Lv reward tags if already eligible
-- ------------------------------------------------------
select public.sync_level_reward_tags(id)
from public.profiles;

-- ------------------------------------------------------
-- 4. Update bootstrap RPC so future users get correct initial tags,
--    black frame, starter background, and eligible Lv tags.
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

  -- Initial owned tags. Keep these as MVP starting tags.
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

  perform public.sync_level_reward_tags(p_user_id);

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.bootstrap_user_profile(uuid, text, text) to authenticated;

-- ------------------------------------------------------
-- 5. Update purchase RPC:
--    - buyer total_spent_points increments
--    - target charisma increments
--    - target receives newly eligible Lv reward tags
--    - return level_reward_tag_ids for notification creation
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
  v_price                int;
  v_max_per_user         int;
  v_buyer_points         bigint;
  v_owned_qty            int;
  v_reward_tag_id        text;
  v_reward_tag_granted   boolean := false;
  v_level_reward_tag_ids text[] := array[]::text[];
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
  set points = points - v_price,
      total_spent_points = coalesce(total_spent_points, 0) + v_price
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

  v_level_reward_tag_ids := public.sync_level_reward_tags(p_target_id);

  return jsonb_build_object(
    'ok', true,
    'price', v_price,
    'reward_tag_id', v_reward_tag_id,
    'reward_tag_granted', v_reward_tag_granted,
    'level_reward_tag_ids', v_level_reward_tag_ids
  );
end;
$$;

grant execute on function public.purchase_illustration(uuid, uuid, uuid) to authenticated;
