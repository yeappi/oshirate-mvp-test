-- ======================================================
-- 推されーと MVP スキーマ
-- Supabase SQL Editor に貼り付けて実行
-- ======================================================

create extension if not exists "uuid-ossp";

-- ===== Profiles =====
-- Supabase Auth の auth.users と 1:1 対応
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text,
  avatar_url  text,
  is_admin    boolean not null default false,
  points      bigint  not null default 0,
  charisma    bigint  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 自分のレコードは自分だけ読める（実験ルール: 他ユーザーは非公開）
create policy "profiles: self read"
  on public.profiles for select
  using (auth.uid() = id);

-- 管理者は全ユーザー閲覧可能
create policy "profiles: admin read"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

create policy "profiles: self update"
  on public.profiles for update
  using (auth.uid() = id);

-- 初回ログイン時の自動作成（callback route から upsert する）
create policy "profiles: self insert"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ===== Illustrations =====
create table public.illustrations (
  id            uuid primary key default uuid_generate_v4(),
  title         text not null,
  description   text,
  price         int  not null,
  image_url     text,
  max_per_user  int,                      -- null = 無限購入
  is_active     boolean not null default true,
  sort_order    int  not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.illustrations enable row level security;

create policy "illustrations: public read"
  on public.illustrations for select
  using (is_active = true);

create policy "illustrations: admin write"
  on public.illustrations for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

create trigger illustrations_updated_at
  before update on public.illustrations
  for each row execute function public.handle_updated_at();

-- ===== User Illustrations (所持数) =====
create table public.user_illustrations (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  illustration_id uuid not null references public.illustrations(id) on delete cascade,
  quantity        int  not null default 1,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, illustration_id)
);

alter table public.user_illustrations enable row level security;

create policy "user_illustrations: self read"
  on public.user_illustrations for select
  using (auth.uid() = user_id);

create policy "user_illustrations: admin read"
  on public.user_illustrations for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

create policy "user_illustrations: self insert"
  on public.user_illustrations for insert
  with check (auth.uid() = user_id);

create policy "user_illustrations: self update"
  on public.user_illustrations for update
  using (auth.uid() = user_id);

create trigger user_illustrations_updated_at
  before update on public.user_illustrations
  for each row execute function public.handle_updated_at();

-- ===== Illustration Purchases (購入ログ) =====
create table public.illustration_purchases (
  id              uuid primary key default uuid_generate_v4(),
  buyer_user_id   uuid not null references public.profiles(id) on delete cascade,
  target_user_id  uuid not null references public.profiles(id) on delete cascade,
  illustration_id uuid not null references public.illustrations(id) on delete cascade,
  point           int  not null,
  created_at      timestamptz not null default now()
);

alter table public.illustration_purchases enable row level security;

create policy "illustration_purchases: self read"
  on public.illustration_purchases for select
  using (auth.uid() = buyer_user_id);

create policy "illustration_purchases: admin read"
  on public.illustration_purchases for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

create policy "illustration_purchases: self insert"
  on public.illustration_purchases for insert
  with check (auth.uid() = buyer_user_id);

-- purchase_illustration RPC
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
  v_price         int;
  v_max_per_user  int;
  v_buyer_points  bigint;
  v_owned_qty     int;
begin
  select price, max_per_user
  into v_price, v_max_per_user
  from public.illustrations
  where id = p_illust_id and is_active = true;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'illustration_not_found');
  end if;

  select points into v_buyer_points
  from public.profiles
  where id = p_buyer_id;

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

  update public.profiles set points = points - v_price where id = p_buyer_id;
  update public.profiles set charisma = charisma + v_price where id = p_target_id;

  insert into public.user_illustrations (user_id, illustration_id, quantity)
  values (p_buyer_id, p_illust_id, 1)
  on conflict (user_id, illustration_id)
  do update set quantity = user_illustrations.quantity + 1, updated_at = now();

  insert into public.illustration_purchases (buyer_user_id, target_user_id, illustration_id, point)
  values (p_buyer_id, p_target_id, p_illust_id, v_price);

  insert into public.point_logs (user_id, delta, reason, meta)
  values (p_buyer_id, -v_price, 'illust_purchase',
          jsonb_build_object('illustration_id', p_illust_id));

  return jsonb_build_object('ok', true, 'price', v_price);
end;
$$;

-- ===== Point Logs =====
create table public.point_logs (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  delta       bigint not null,
  reason      text not null,          -- 'gift_30min' | 'illust_purchase' | 'admin_grant'
  meta        jsonb,
  created_at  timestamptz not null default now()
);

alter table public.point_logs enable row level security;

create policy "point_logs: self read"
  on public.point_logs for select
  using (auth.uid() = user_id);

create policy "point_logs: admin read"
  on public.point_logs for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- ===== Notifications =====
create table public.notifications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  type        text not null,          -- 'point_earned' | 'illust_purchased' | 'admin'
  title       text not null,
  body        text,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "notifications: self read"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "notifications: self update"
  on public.notifications for update
  using (auth.uid() = user_id);

create policy "notifications: admin write"
  on public.notifications for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- ===== Announcements (告知) =====
create table public.announcements (
  id          uuid primary key default uuid_generate_v4(),
  content     text not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.announcements enable row level security;

create policy "announcements: public read"
  on public.announcements for select
  using (is_active = true);

create policy "announcements: admin write"
  on public.announcements for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- ===== Gift Slots (30分プレゼント) =====
create table public.gift_slots (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  table_type      text not null check (table_type in ('normal', 'gold')),
  options         int[] not null,           -- [slot_a, slot_b, slot_c]
  selected_index  int,                      -- null=未受取 | 0|1|2
  selected_point  int,
  status          text not null default 'pending' check (status in ('pending', 'claimed')),
  available_at    timestamptz not null,     -- 次のプレゼントが受取可能になる時刻
  claimed_at      timestamptz,
  created_at      timestamptz not null default now()
);

alter table public.gift_slots enable row level security;

create policy "gift_slots: self read"
  on public.gift_slots for select
  using (auth.uid() = user_id);

create policy "gift_slots: self insert"
  on public.gift_slots for insert
  with check (auth.uid() = user_id);

create policy "gift_slots: self update"
  on public.gift_slots for update
  using (auth.uid() = user_id);

-- increment_points RPC（gift_30min 受取時に使用）
create or replace function public.increment_points(
  p_user_id uuid,
  p_delta   bigint
)
returns void
language plpgsql
security definer
as $$
begin
  update public.profiles
  set points = points + p_delta
  where id = p_user_id;

  insert into public.point_logs (user_id, delta, reason)
  values (p_user_id, p_delta, 'gift_30min');
end;
$$;

-- ===== Triggers =====
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger announcements_updated_at
  before update on public.announcements
  for each row execute function public.handle_updated_at();
