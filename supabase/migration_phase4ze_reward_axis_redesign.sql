-- ======================================================
-- Phase 4ZE: Lv100 & reward axis redesign foundation
-- - charisma/Lv unlocks avatar frames and future aura parts
-- - total_spent_points unlocks backgrounds and the name-side spent mark
-- - old Lv background/tag reward sync is disabled so future rewards do not mix axes
-- ======================================================

-- Avatar frames move from total_spent_points to charisma.
alter table public.avatar_frames
  add column if not exists required_charisma bigint not null default 0;

update public.avatar_frames
set required_charisma = case id
  when 'black' then 0
  when 'blue' then 1000
  when 'red' then 2500
  when 'bronze' then 10000
  when 'silver' then 30000
  when 'gold' then 100000
  when 'cyan_aura' then 300000
  when 'purple_aura' then 650000
  when 'rainbow_aura' then 1000000
  else coalesce(required_charisma, 0)
end,
  description = case id
  when 'black' then '最初から使える基本フレーム。'
  when 'blue' then '魅力値1,000で解放される、推され始めの青フレーム。'
  when 'red' then '魅力値2,500で解放される、熱量が見え始めた赤フレーム。'
  when 'bronze' then '魅力値10,000で解放される、羽ばたき前夜の銅フレーム。'
  when 'silver' then '魅力値30,000で解放される、存在感が出てきた銀フレーム。'
  when 'gold' then '魅力値100,000で解放される、強い推され感の金フレーム。'
  when 'cyan_aura' then '魅力値300,000で解放される、水色オーラの土台。'
  when 'purple_aura' then '魅力値650,000で解放される、上位オーラの土台。'
  when 'rainbow_aura' then '魅力値1,000,000で解放される、殿堂級オーラの土台。'
  else description
end;

create index if not exists avatar_frames_required_charisma_idx
  on public.avatar_frames(required_charisma, sort_order);

-- Backgrounds move from Lv to total_spent_points.
alter table public.profile_backgrounds
  add column if not exists required_spent_points bigint not null default 0;

update public.profile_backgrounds
set required_spent_points = case id
  when 'starter' then 0
  when 'mint_glow' then 1000
  when 'neon_night' then 10000
  when 'gold_stage' then 100000
  when 'aurora' then 450000
  when 'legend' then 1000000
  else coalesce(required_spent_points, 0)
end,
  description = case id
  when 'starter' then '最初から使える標準背景。'
  when 'mint_glow' then '累計1,000pt使用で解放される淡いミント背景。'
  when 'neon_night' then '累計10,000pt使用で解放されるネオン背景。'
  when 'gold_stage' then '累計100,000pt使用で解放されるゴールド背景。'
  when 'aurora' then '累計450,000pt使用で解放されるオーロラ背景。'
  when 'legend' then '累計1,000,000pt使用で解放される殿堂背景。'
  else description
end;

create index if not exists profile_backgrounds_required_spent_points_idx
  on public.profile_backgrounds(required_spent_points, sort_order);

-- Old Lv reward tags/backgrounds are no longer the main reward axis.
-- Keep the function name because purchase/use RPCs already call it, but make it a safe no-op.
create or replace function public.sync_level_reward_tags(p_user_id uuid)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
begin
  return array[]::text[];
end;
$$;

grant execute on function public.sync_level_reward_tags(uuid) to authenticated;
