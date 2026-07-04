-- ======================================================
-- Phase 4N: public profile illustration ownership fix
--   - 公開プロフィールのイラスト表示はプロフィール持ち主基準にする
--   - 購入時、購入者ではなく対象プロフィール側のシール帳を埋める
--   - 他人プロフィール表示用に user_illustrations / favorite を読み取り可能にする
-- ======================================================

-- 公開プロフィールでは、他ユーザーの所持イラスト・お気に入りを表示する必要がある。
-- 個人名やメールは出さず、プロフィールに表示されるコレクション情報だけ読む。
drop policy if exists "user_illustrations: public profile read" on public.user_illustrations;
create policy "user_illustrations: public profile read"
  on public.user_illustrations
  for select
  to authenticated
  using (true);

drop policy if exists "user_favorite_illustrations: public profile read" on public.user_favorite_illustrations;
create policy "user_favorite_illustrations: public profile read"
  on public.user_favorite_illustrations
  for select
  to authenticated
  using (true);

-- 過去の購入ログを対象プロフィール側の所持イラストにも反映する。
-- これにより、これまでの応援購入も公開プロフィールのシール帳に表示される。
insert into public.user_illustrations (user_id, illustration_id, quantity)
select
  p.target_user_id as user_id,
  p.illustration_id,
  count(*)::int as quantity
from public.illustration_purchases p
where p.target_user_id is not null
  and p.illustration_id is not null
  and p.target_user_id <> p.buyer_user_id
  and exists (select 1 from public.profiles pr where pr.id = p.target_user_id)
  and exists (select 1 from public.illustrations i where i.id = p.illustration_id)
group by p.target_user_id, p.illustration_id
on conflict (user_id, illustration_id)
do update set quantity = greatest(public.user_illustrations.quantity, excluded.quantity),
              updated_at = now();

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
  where id = p_target_id;

  -- シール帳/イラスト所持は購入対象プロフィール側に反映する。
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
    'level_reward_tag_ids', v_level_reward_tag_ids
  );
end;
$$;

grant execute on function public.purchase_illustration(uuid, uuid, uuid) to authenticated;
