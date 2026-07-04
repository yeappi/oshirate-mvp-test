-- ======================================================
-- Phase 4K: CSS avatar frames
-- - total_spent_points for unlock conditions
-- - selected_avatar_frame_id on profiles
-- - avatar_frames master table
-- - purchase_illustration increments total_spent_points
-- ======================================================

-- ------------------------------------------------------
-- 1. profiles extensions
-- ------------------------------------------------------
alter table public.profiles
  add column if not exists total_spent_points bigint not null default 0;

alter table public.profiles
  add column if not exists selected_avatar_frame_id text;

-- ------------------------------------------------------
-- 2. Avatar frame master
-- ------------------------------------------------------
create table if not exists public.avatar_frames (
  id text primary key,
  name text not null,
  css_key text not null unique,
  required_spent_points bigint not null default 0,
  description text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.avatar_frames enable row level security;

drop policy if exists "avatar_frames_select_public" on public.avatar_frames;
create policy "avatar_frames_select_public"
on public.avatar_frames
for select
to authenticated
using (is_active = true);

grant select on public.avatar_frames to authenticated;

-- updated_at trigger if helper exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'handle_updated_at'
  ) THEN
    DROP TRIGGER IF EXISTS avatar_frames_updated_at ON public.avatar_frames;
    CREATE TRIGGER avatar_frames_updated_at
      BEFORE UPDATE ON public.avatar_frames
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

insert into public.avatar_frames (id, name, css_key, required_spent_points, description, sort_order, is_active)
values
  ('black',       '黒フレーム',       'black',       0,     '最初から使える基本フレーム。', 10, true),
  ('blue',        '青フレーム',       'blue',        100,   '少し応援を重ねた証。', 20, true),
  ('red',         '赤フレーム',       'red',         300,   '熱量が見え始めた証。', 30, true),
  ('bronze',      '銅フレーム',       'bronze',      700,   '応援の積み重ねが形になった証。', 40, true),
  ('silver',      '銀フレーム',       'silver',      1500,  'プロフィールに存在感が出てきた証。', 50, true),
  ('gold',        '金フレーム',       'gold',        3000,  'かなり推されている証。', 60, true),
  ('cyan_aura',   '水色オーラ',       'cyan_aura',   5000,  'アイコン周りにオーラが出始める。', 70, true),
  ('purple_aura', '紫オーラ',         'purple_aura', 8000,  'さらに特別感のあるオーラ。', 80, true),
  ('rainbow_aura','虹オーラ',         'rainbow_aura',12000, 'MVP内最高クラスのフレーム。', 90, true)
on conflict (id) do update set
  name = excluded.name,
  css_key = excluded.css_key,
  required_spent_points = excluded.required_spent_points,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = now();

-- Add FK after seed target exists. DO block avoids duplicate constraint errors.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_selected_avatar_frame_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_selected_avatar_frame_id_fkey
      FOREIGN KEY (selected_avatar_frame_id)
      REFERENCES public.avatar_frames(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Default and existing users: set black frame.
alter table public.profiles
  alter column selected_avatar_frame_id set default 'black';

update public.profiles
set selected_avatar_frame_id = 'black'
where selected_avatar_frame_id is null;

-- Backfill total_spent_points from existing purchase logs.
update public.profiles p
set total_spent_points = greatest(
  coalesce(p.total_spent_points, 0),
  coalesce(s.spent, 0)
)
from (
  select buyer_user_id as user_id, coalesce(sum(point), 0)::bigint as spent
  from public.illustration_purchases
  group by buyer_user_id
) s
where p.id = s.user_id;

-- ------------------------------------------------------
-- 3. Update bootstrap RPC so future users start with black frame.
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

  insert into public.profiles (id, name, avatar_url, points, charisma, is_admin, selected_background_id, selected_avatar_frame_id, total_spent_points)
  values (
    p_user_id,
    coalesce(nullif(p_name, ''), '名無し'),
    p_avatar_url,
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

  -- Initial owned tags. If tags do not exist yet, this simply inserts nothing.
  insert into public.user_tags (user_id, tag_id, acquired_reason)
  select p_user_id, t.id, 'initial'
  from public.profile_tags t
  where t.id in ('early_user', 'watching_over', 'oshi_potential', 'growth_margin', 'swamp_entrance', 'oshi_rookie')
    and t.is_active = true
  on conflict (user_id, tag_id) do nothing;

  -- Initial display tags: first 3 owned active tags when none are selected.
  if not exists (select 1 from public.profile_display_tags where user_id = p_user_id) then
    insert into public.profile_display_tags (user_id, tag_id, display_order)
    select p_user_id, t.id, row_number() over (order by t.sort_order, t.id)
    from public.profile_tags t
    join public.user_tags ut on ut.tag_id = t.id and ut.user_id = p_user_id
    where t.is_active = true
    order by t.sort_order, t.id
    limit 3
    on conflict (user_id, tag_id) do nothing;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.bootstrap_user_profile(uuid, text, text) to authenticated;

-- ------------------------------------------------------
-- 4. Update purchase RPC: add total_spent_points increment while keeping existing guards/tag reward.
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

  return jsonb_build_object(
    'ok', true,
    'price', v_price,
    'reward_tag_id', v_reward_tag_id,
    'reward_tag_granted', v_reward_tag_granted
  );
end;
$$;

grant execute on function public.purchase_illustration(uuid, uuid, uuid) to authenticated;
