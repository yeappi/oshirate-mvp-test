-- ======================================================
-- Phase 4S: stability hardening
--   - admin BigInt JSON issue is fixed in API code
--   - gift claim becomes atomic RPC
--   - one pending gift slot per user
--   - purchase RPC returns charisma before/after for exact rank-up detection
--   - ranking is available as one RPC
-- ======================================================

-- ------------------------------------------------------
-- 1. Prevent duplicate pending gift slots per user
-- ------------------------------------------------------
-- 既に二重pendingができていた場合は、最新だけ残して古いpendingを消す。
-- pendingは未受取候補なので、ここで古い重複だけ消してもpt履歴は壊れない。
delete from public.gift_slots g
using (
  select id,
         row_number() over (partition by user_id order by created_at desc) as rn
  from public.gift_slots
  where status = 'pending'
) d
where g.id = d.id
  and d.rn > 1;

create unique index if not exists gift_slots_one_pending_per_user
on public.gift_slots (user_id)
where status = 'pending';

-- ------------------------------------------------------
-- 2. Atomic 30min gift claim
-- ------------------------------------------------------
create or replace function public.claim_gift_slot(
  p_slot_id uuid,
  p_selected_index int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_slot record;
  v_selected_point int;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  if p_selected_index not in (0, 1, 2) then
    return jsonb_build_object('ok', false, 'error', 'invalid_index');
  end if;

  select *
  into v_slot
  from public.gift_slots
  where id = p_slot_id
    and user_id = v_user_id
    and status = 'pending'
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'slot_not_found');
  end if;

  v_selected_point := v_slot.options[p_selected_index + 1];

  if v_selected_point is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_option');
  end if;

  update public.gift_slots
  set selected_index = p_selected_index,
      selected_point = v_selected_point,
      status = 'claimed',
      claimed_at = now()
  where id = p_slot_id;

  update public.profiles
  set points = points + v_selected_point
  where id = v_user_id;

  insert into public.point_logs (user_id, delta, reason, meta)
  values (
    v_user_id,
    v_selected_point,
    'gift_30min',
    jsonb_build_object('slot_id', p_slot_id, 'table_type', v_slot.table_type)
  );

  return jsonb_build_object(
    'ok', true,
    'selectedPoint', v_selected_point,
    'allOptions', v_slot.options,
    'tableType', v_slot.table_type
  );
end;
$$;

grant execute on function public.claim_gift_slot(uuid, int) to authenticated;

-- ------------------------------------------------------
-- 3. Purchase RPC final shape with charisma before/after
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
  v_requires_ticket      boolean;
  v_buyer_points         bigint;
  v_owned_qty            int;
  v_reward_tag_id        text;
  v_reward_tag_granted   boolean := false;
  v_level_reward_tag_ids text[] := array[]::text[];
  v_charm_before         bigint := 0;
  v_charm_after          bigint := 0;
begin
  if auth.uid() is null or auth.uid() <> p_buyer_id then
    return jsonb_build_object('ok', false, 'error', 'not_self');
  end if;

  -- Lock buyer/target deterministically so points and charisma changes are consistent.
  perform 1
  from public.profiles
  where id in (p_buyer_id, p_target_id)
  order by id
  for update;

  select points into v_buyer_points
  from public.profiles
  where id = p_buyer_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'profile_not_found');
  end if;

  select charisma into v_charm_before
  from public.profiles
  where id = p_target_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'target_not_found');
  end if;

  select price, max_per_user, reward_tag_id, coalesce(requires_item_ticket, false)
  into v_price, v_max_per_user, v_reward_tag_id, v_requires_ticket
  from public.illustrations
  where id = p_illust_id and is_active = true;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'illustration_not_found');
  end if;

  if v_requires_ticket then
    return jsonb_build_object('ok', false, 'error', 'requires_item_ticket');
  end if;

  if v_buyer_points < v_price then
    return jsonb_build_object('ok', false, 'error', 'insufficient_points');
  end if;

  -- max_per_user は「対象プロフィールのシール帳内での上限」として扱う。
  if v_max_per_user is not null then
    select coalesce(quantity, 0) into v_owned_qty
    from public.user_illustrations
    where user_id = p_target_id and illustration_id = p_illust_id;

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
  where id = p_target_id
  returning charisma into v_charm_after;

  insert into public.user_illustrations (user_id, illustration_id, quantity)
  values (p_target_id, p_illust_id, 1)
  on conflict (user_id, illustration_id)
  do update set quantity = user_illustrations.quantity + 1,
                updated_at = now();

  insert into public.illustration_purchases (buyer_user_id, target_user_id, illustration_id, point)
  values (p_buyer_id, p_target_id, p_illust_id, v_price);

  insert into public.point_logs (user_id, delta, reason, meta)
  values (p_buyer_id, -v_price, 'illust_purchase',
          jsonb_build_object('illustration_id', p_illust_id, 'target_user_id', p_target_id));

  -- イラスト購入特典タグは、購入者側の特典として付与する。
  if v_reward_tag_id is not null then
    insert into public.user_tags (user_id, tag_id, acquired_reason)
    values (p_buyer_id, v_reward_tag_id, 'illustration_purchase')
    on conflict (user_id, tag_id) do nothing;

    get diagnostics v_owned_qty = row_count;
    v_reward_tag_granted := v_owned_qty > 0;
  end if;

  -- Lv報酬タグは、魅力値が上がる対象プロフィール側に付与する。
  v_level_reward_tag_ids := public.sync_level_reward_tags(p_target_id);

  return jsonb_build_object(
    'ok', true,
    'price', v_price,
    'reward_tag_id', v_reward_tag_id,
    'reward_tag_granted', v_reward_tag_granted,
    'level_reward_tag_ids', v_level_reward_tag_ids,
    'charm_before', v_charm_before,
    'charm_after', v_charm_after
  );
end;
$$;

grant execute on function public.purchase_illustration(uuid, uuid, uuid) to authenticated;

-- ------------------------------------------------------
-- 4. Ranking in one round trip
-- ------------------------------------------------------
create or replace function public.get_charisma_ranking(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_charisma bigint := 0;
  v_higher_count int := 0;
  v_total_count int := 0;
begin
  select coalesce(charisma, 0) into v_charisma
  from public.profiles
  where id = p_user_id;

  if not found then
    return jsonb_build_object('rank', 1, 'total', 0);
  end if;

  select count(*) into v_higher_count
  from public.profiles
  where charisma > v_charisma;

  select count(*) into v_total_count
  from public.profiles;

  return jsonb_build_object(
    'rank', v_higher_count + 1,
    'total', greatest(v_total_count, 1)
  );
end;
$$;

grant execute on function public.get_charisma_ranking(uuid) to authenticated;

-- ------------------------------------------------------
-- 5. Remove legacy unsafe increment_points RPC
-- ------------------------------------------------------
-- 30分プレゼント受取は claim_gift_slot() に統合済み。
-- 旧 increment_points() は auth.uid() チェックなしの security definer だったため、
-- 使われていない状態で残すと直接RPC実行による任意pt付与リスクになる。
drop function if exists public.increment_points(uuid, bigint);

