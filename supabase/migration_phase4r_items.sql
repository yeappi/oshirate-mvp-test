-- ======================================================
-- Phase 4R: もちもの & MVPアイテム券
--   - 限定イラスト券 / 背景券 / 枠券 / タグ券
--   - admin配布 / 全員配布 / 期限 / 使用済み管理
--   - 時限装備・自由譲渡・数量スタックは入れない
-- ======================================================

-- ------------------------------------------------------
-- 1. illustrations: special display flags
-- ------------------------------------------------------
alter table public.illustrations
  add column if not exists is_special boolean not null default false,
  add column if not exists requires_item_ticket boolean not null default false,
  add column if not exists special_label text;

-- ------------------------------------------------------
-- 2. user-specific unlocks for permanent background/frame tickets
-- ------------------------------------------------------
create table if not exists public.user_unlocked_backgrounds (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  background_id text not null references public.profile_backgrounds(id) on delete cascade,
  acquired_reason text not null default 'item_ticket',
  created_at timestamptz not null default now(),
  unique (user_id, background_id)
);

create table if not exists public.user_unlocked_avatar_frames (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  frame_id text not null references public.avatar_frames(id) on delete cascade,
  acquired_reason text not null default 'item_ticket',
  created_at timestamptz not null default now(),
  unique (user_id, frame_id)
);

alter table public.user_unlocked_backgrounds enable row level security;
alter table public.user_unlocked_avatar_frames enable row level security;

drop policy if exists "user_unlocked_backgrounds_self_select" on public.user_unlocked_backgrounds;
create policy "user_unlocked_backgrounds_self_select"
on public.user_unlocked_backgrounds for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

drop policy if exists "user_unlocked_avatar_frames_self_select" on public.user_unlocked_avatar_frames;
create policy "user_unlocked_avatar_frames_self_select"
on public.user_unlocked_avatar_frames for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

-- writes happen through security definer functions / admin policies
drop policy if exists "user_unlocked_backgrounds_admin_write" on public.user_unlocked_backgrounds;
create policy "user_unlocked_backgrounds_admin_write"
on public.user_unlocked_backgrounds for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

drop policy if exists "user_unlocked_avatar_frames_admin_write" on public.user_unlocked_avatar_frames;
create policy "user_unlocked_avatar_frames_admin_write"
on public.user_unlocked_avatar_frames for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

-- ------------------------------------------------------
-- 3. item master / owned items
-- ------------------------------------------------------
create table if not exists public.items (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  item_type text not null check (item_type in ('ILLUST_TICKET', 'BACKGROUND_TICKET', 'FRAME_TICKET', 'TAG_TICKET')),
  target_illustration_id uuid references public.illustrations(id) on delete set null,
  target_background_id text references public.profile_backgrounds(id) on delete set null,
  target_avatar_frame_id text references public.avatar_frames(id) on delete set null,
  target_tag_id text references public.profile_tags(id) on delete set null,
  charisma_value int,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint items_target_match check (
    (item_type = 'ILLUST_TICKET' and target_illustration_id is not null and target_background_id is null and target_avatar_frame_id is null and target_tag_id is null) or
    (item_type = 'BACKGROUND_TICKET' and target_background_id is not null and target_illustration_id is null and target_avatar_frame_id is null and target_tag_id is null) or
    (item_type = 'FRAME_TICKET' and target_avatar_frame_id is not null and target_illustration_id is null and target_background_id is null and target_tag_id is null) or
    (item_type = 'TAG_TICKET' and target_tag_id is not null and target_illustration_id is null and target_background_id is null and target_avatar_frame_id is null)
  )
);

create table if not exists public.user_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  expires_at timestamptz,
  used_at timestamptz,
  used_target_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.items enable row level security;
alter table public.user_items enable row level security;

drop policy if exists "items_select_active" on public.items;
create policy "items_select_active"
on public.items for select to authenticated
using (is_active = true or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

drop policy if exists "items_admin_write" on public.items;
create policy "items_admin_write"
on public.items for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

drop policy if exists "user_items_self_select" on public.user_items;
create policy "user_items_self_select"
on public.user_items for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

drop policy if exists "user_items_admin_write" on public.user_items;
create policy "user_items_admin_write"
on public.user_items for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

grant select on public.items to authenticated;
grant select on public.user_items to authenticated;
grant select, insert, update on public.items to authenticated;
grant select, insert, update on public.user_items to authenticated;
grant select, insert, update on public.user_unlocked_backgrounds to authenticated;
grant select, insert, update on public.user_unlocked_avatar_frames to authenticated;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'handle_updated_at'
  ) THEN
    DROP TRIGGER IF EXISTS items_updated_at ON public.items;
    CREATE TRIGGER items_updated_at
      BEFORE UPDATE ON public.items
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

-- ------------------------------------------------------
-- 4. use_owned_item RPC
-- ------------------------------------------------------
create or replace function public.use_owned_item(
  p_user_item_id uuid,
  p_target_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_item record;
  v_target_user_id uuid;
  v_charm int;
  v_level_reward_tag_ids text[] := array[]::text[];
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  select
    ui.id as user_item_id,
    ui.user_id,
    ui.expires_at,
    ui.used_at,
    i.id as item_id,
    i.name,
    i.item_type,
    i.target_illustration_id,
    i.target_background_id,
    i.target_avatar_frame_id,
    i.target_tag_id,
    i.charisma_value,
    i.is_active,
    ill.price as illustration_price
  into v_item
  from public.user_items ui
  join public.items i on i.id = ui.item_id
  left join public.illustrations ill on ill.id = i.target_illustration_id
  where ui.id = p_user_item_id
  for update of ui;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'item_not_found');
  end if;

  if v_item.user_id <> v_user_id then
    return jsonb_build_object('ok', false, 'error', 'not_owner');
  end if;

  if v_item.is_active is not true then
    return jsonb_build_object('ok', false, 'error', 'item_inactive');
  end if;

  if v_item.used_at is not null then
    return jsonb_build_object('ok', false, 'error', 'already_used');
  end if;

  if v_item.expires_at is not null and v_item.expires_at <= now() then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;

  if v_item.item_type = 'ILLUST_TICKET' then
    v_target_user_id := coalesce(p_target_user_id, v_user_id);

    if not exists (select 1 from public.profiles where id = v_target_user_id) then
      return jsonb_build_object('ok', false, 'error', 'target_not_found');
    end if;

    -- 自分以外に使う場合はフォロー中の相手だけ。
    if v_target_user_id <> v_user_id and not exists (
      select 1 from public.user_follows f
      where f.follower_id = v_user_id and f.followed_id = v_target_user_id
    ) then
      return jsonb_build_object('ok', false, 'error', 'target_not_followed');
    end if;

    if exists (
      select 1 from public.user_illustrations
      where user_id = v_target_user_id and illustration_id = v_item.target_illustration_id
    ) then
      return jsonb_build_object('ok', false, 'error', 'target_already_owns');
    end if;

    v_charm := greatest(coalesce(v_item.charisma_value, v_item.illustration_price, 0), 0);

    insert into public.user_illustrations (user_id, illustration_id, quantity)
    values (v_target_user_id, v_item.target_illustration_id, 1)
    on conflict (user_id, illustration_id)
    do update set quantity = public.user_illustrations.quantity + 1, updated_at = now();

    update public.profiles
    set charisma = charisma + v_charm
    where id = v_target_user_id;

    insert into public.illustration_purchases (buyer_user_id, target_user_id, illustration_id, point)
    values (v_user_id, v_target_user_id, v_item.target_illustration_id, 0);

    insert into public.point_logs (user_id, delta, reason, meta)
    values (v_user_id, 0, 'item_use', jsonb_build_object(
      'user_item_id', p_user_item_id,
      'item_id', v_item.item_id,
      'item_type', v_item.item_type,
      'target_user_id', v_target_user_id,
      'illustration_id', v_item.target_illustration_id,
      'charisma_value', v_charm
    ));

    v_level_reward_tag_ids := public.sync_level_reward_tags(v_target_user_id);

  elsif v_item.item_type = 'BACKGROUND_TICKET' then
    insert into public.user_unlocked_backgrounds (user_id, background_id, acquired_reason)
    values (v_user_id, v_item.target_background_id, 'item_ticket')
    on conflict (user_id, background_id) do nothing;

  elsif v_item.item_type = 'FRAME_TICKET' then
    insert into public.user_unlocked_avatar_frames (user_id, frame_id, acquired_reason)
    values (v_user_id, v_item.target_avatar_frame_id, 'item_ticket')
    on conflict (user_id, frame_id) do nothing;

  elsif v_item.item_type = 'TAG_TICKET' then
    insert into public.user_tags (user_id, tag_id, acquired_reason)
    values (v_user_id, v_item.target_tag_id, 'item_ticket')
    on conflict (user_id, tag_id) do nothing;
  else
    return jsonb_build_object('ok', false, 'error', 'unknown_item_type');
  end if;

  update public.user_items
  set used_at = now(), used_target_user_id = case when v_item.item_type = 'ILLUST_TICKET' then v_target_user_id else v_user_id end
  where id = p_user_item_id;

  return jsonb_build_object(
    'ok', true,
    'item_type', v_item.item_type,
    'target_user_id', case when v_item.item_type = 'ILLUST_TICKET' then v_target_user_id else v_user_id end,
    'charisma_value', coalesce(v_charm, 0),
    'level_reward_tag_ids', v_level_reward_tag_ids
  );
end;
$$;

grant execute on function public.use_owned_item(uuid, uuid) to authenticated;

-- ------------------------------------------------------
-- 5. purchase RPC guard: ticket-only illustrations cannot be bought by pt
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
begin
  if auth.uid() is null or auth.uid() <> p_buyer_id then
    return jsonb_build_object('ok', false, 'error', 'not_self');
  end if;

  if not exists (select 1 from public.profiles where id = p_target_id) then
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
