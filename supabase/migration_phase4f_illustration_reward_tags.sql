-- Phase 4F: Illustration purchase reward tags
-- イラスト購入時に、設定された特典タグを購入者へ付与する。

-- illustrations に購入特典タグを追加
alter table public.illustrations
  add column if not exists reward_tag_id text references public.profile_tags(id) on delete set null;

-- 特典用タグを追加。初期配布には含めない。
insert into public.profile_tags (id, label, variant, description, sort_order, is_active)
values
  ('first_support_memory', '初応援記念', 'rare', 'イラスト購入で応援した記念タグ。', 110, true),
  ('sparkle_collector', 'きらめき所持者', 'high', 'きらめき系イラストを手に入れた証。', 120, true),
  ('deep_swamp', '沼の住人', 'high', 'さらに深く推されーとに踏み込んだタグ。', 130, true),
  ('rare_frame', 'レア枠', 'rare', '特別なコレクションを持つ人のタグ。', 140, true),
  ('top_collector', '最高位コレクター', 'rare', '最高位コレクションを手にした証。', 150, true)
on conflict (id) do update set
  label = excluded.label,
  variant = excluded.variant,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

-- 既存イラストに仮の特典タグを設定。
-- sort_order基準なので、タイトルを変えても大きく崩れにくい。
update public.illustrations set reward_tag_id = 'first_support_memory'
where sort_order in (1, 2, 3) and reward_tag_id is null;

update public.illustrations set reward_tag_id = 'sparkle_collector'
where sort_order in (4, 5, 6) and reward_tag_id is null;

update public.illustrations set reward_tag_id = 'deep_swamp'
where sort_order in (7, 8, 9) and reward_tag_id is null;

update public.illustrations set reward_tag_id = 'rare_frame'
where sort_order in (10, 11, 12, 13) and reward_tag_id is null;

update public.illustrations set reward_tag_id = 'top_collector'
where sort_order in (14, 15) and reward_tag_id is null;

-- purchase_illustration RPC を更新。
-- 既存の購入処理は維持し、購入成功時に reward_tag_id があれば user_tags に付与する。
create or replace function public.purchase_illustration(
  p_buyer_id      uuid,
  p_target_id     uuid,
  p_illust_id     uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_price              int;
  v_max_per_user       int;
  v_buyer_points       bigint;
  v_owned_qty          int;
  v_reward_tag_id      text;
  v_reward_tag_granted boolean := false;
begin
  -- イラスト情報取得
  select price, max_per_user, reward_tag_id
  into v_price, v_max_per_user, v_reward_tag_id
  from public.illustrations
  where id = p_illust_id and is_active = true;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'illustration_not_found');
  end if;

  -- 所持pt確認
  select points into v_buyer_points
  from public.profiles
  where id = p_buyer_id;

  if v_buyer_points < v_price then
    return jsonb_build_object('ok', false, 'error', 'insufficient_points');
  end if;

  -- 購入上限確認
  if v_max_per_user is not null then
    select coalesce(quantity, 0) into v_owned_qty
    from public.user_illustrations
    where user_id = p_buyer_id and illustration_id = p_illust_id;

    if coalesce(v_owned_qty, 0) >= v_max_per_user then
      return jsonb_build_object('ok', false, 'error', 'purchase_limit_reached');
    end if;
  end if;

  -- pt 減算
  update public.profiles
  set points = points - v_price
  where id = p_buyer_id;

  -- 魅力度加算（target = やぴ）
  update public.profiles
  set charisma = charisma + v_price
  where id = p_target_id;

  -- 所持数 upsert
  insert into public.user_illustrations (user_id, illustration_id, quantity)
  values (p_buyer_id, p_illust_id, 1)
  on conflict (user_id, illustration_id)
  do update set quantity = user_illustrations.quantity + 1,
                updated_at = now();

  -- 購入ログ
  insert into public.illustration_purchases (buyer_user_id, target_user_id, illustration_id, point)
  values (p_buyer_id, p_target_id, p_illust_id, v_price);

  -- ポイントログ
  insert into public.point_logs (user_id, delta, reason, meta)
  values (p_buyer_id, -v_price, 'illust_purchase',
          jsonb_build_object('illustration_id', p_illust_id));

  -- 特典タグ付与。既に持っている場合は何もしない。
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
