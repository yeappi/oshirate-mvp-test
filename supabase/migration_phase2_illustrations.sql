-- ======================================================
-- Phase 2 Migration
-- illustrations / user_illustrations を仕様通りに再定義
-- illustration_purchases を新規作成
-- ======================================================

-- 依存関係の順に DROP
drop table if exists public.illustration_purchases;
drop table if exists public.user_illustrations;
drop table if exists public.illustrations;

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
-- 購入するたびに quantity を加算する。レコードは illustration ごとに 1 行。
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

-- 自分の所持数は自分だけ読める
create policy "user_illustrations: self read"
  on public.user_illustrations for select
  using (auth.uid() = user_id);

-- 管理者は全閲覧
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
-- 1回の購入 = 1レコード。TOP購入者集計にも使う。
create table public.illustration_purchases (
  id              uuid primary key default uuid_generate_v4(),
  buyer_user_id   uuid not null references public.profiles(id) on delete cascade,
  target_user_id  uuid not null references public.profiles(id) on delete cascade,
  illustration_id uuid not null references public.illustrations(id) on delete cascade,
  point           int  not null,
  created_at      timestamptz not null default now()
);

alter table public.illustration_purchases enable row level security;

-- 自分の購入ログは自分だけ
create policy "illustration_purchases: self read"
  on public.illustration_purchases for select
  using (auth.uid() = buyer_user_id);

-- 管理者は全閲覧（TOP購入者の実名確認用）
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

-- ===== purchase_illustration RPC =====
-- 購入処理をアトミックに実行する
--   1. 所持pt確認
--   2. 購入数上限確認（max_per_user）
--   3. profiles.points 減算
--   4. profiles.charisma 加算（target_user）
--   5. user_illustrations upsert（quantity +1）
--   6. illustration_purchases insert
--   7. point_logs insert
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
  -- イラスト情報取得
  select price, max_per_user
  into v_price, v_max_per_user
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

  return jsonb_build_object('ok', true, 'price', v_price);
end;
$$;
