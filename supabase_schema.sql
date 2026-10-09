-- ============================================================================
-- COMPLETE PRODUCTION SUPABASE DATABASE SCHEMA FOR ZALANDO PRO APP
-- Run this script in the Supabase Dashboard -> SQL Editor
-- ============================================================================

-- 1. Create Users Table
create table if not exists public.users (
  id text primary key,
  email text,
  display_name text default '',
  phone text default '',
  dob text default '',
  balance numeric default 0,
  total_earnings numeric default 0,
  today_task_earnings numeric default 0,
  today_team_earnings numeric default 0,
  tasks_completed_count integer default 0,
  completed_days_count integer default 0,
  current_plan text default 'none',
  plan_purchase_date timestamp with time zone,
  vip_tier text default 'VIP0',
  referral_code text,
  referred_by text,
  kyc_completed boolean default false,
  is_blocked boolean default false,
  ban_reason text default '',
  is_admin boolean default false,
  username text,
  username_lower text,
  device_signature text,
  ip_hint text,
  fcm_token text,
  usdt_address text,
  last_task_date timestamp with time zone,
  plan_expiry timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 2. Create Transactions Table
create table if not exists public.transactions (
  id text primary key default gen_random_uuid()::text,
  user_id text references public.users(id) on delete cascade,
  recipient_id text,
  type text not null, -- 'deposit', 'withdrawal', 'task_reward', 'commission', 'transfer', 'plan_purchase'
  amount numeric not null,
  status text default 'completed', -- 'pending', 'completed', 'failed', 'rejected'
  description text,
  payment_method text,
  withdrawal_method text,
  order_id text,
  wallet_address text,
  user_usdt_address text,
  rejection_reason text,
  deducted_amount numeric,
  from_user text,
  timestamp timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 3. Create Orders Table (Daily Tasks / Product Orders)
create table if not exists public.orders (
  id text primary key,
  user_id text references public.users(id) on delete cascade,
  product_id text,
  product_name text,
  product_image text,
  order_total numeric default 0,
  commission_rate numeric default 0,
  commission_amount numeric default 0,
  pending_commission numeric default 0,
  estimated_refund numeric default 0,
  status text default 'Pending', -- 'Pending', 'Successful'
  submitted_at text,
  created_at timestamp with time zone default now()
);

-- 4. Create Shipped Orders Table
create table if not exists public.shipped_orders (
  id text primary key default gen_random_uuid()::text,
  user_id text references public.users(id) on delete cascade,
  order_id text,
  product_name text,
  product_image text,
  tracking_number text,
  status text default 'Shipped',
  total_tasks integer default 0,
  claim_amount numeric default 0,
  claimed boolean default false,
  shipped_at text,
  created_at timestamp with time zone default now()
);

-- 5. Create Referrals Table (MLM Commission & Team Tracking)
create table if not exists public.referrals (
  id text primary key default gen_random_uuid()::text,
  referrer_id text references public.users(id) on delete cascade,
  l2_referrer_id text,
  l3_referrer_id text,
  invitee_id text,
  invitee_name text,
  commission_earned numeric default 0,
  commission_type text,
  timestamp timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- 6. Create Settings Table (Global App Config)
create table if not exists public.settings (
  id text primary key, -- 'global'
  wallet_address text,
  announcement text,
  banner_url text,
  telegram_link text,
  instagram_link text,
  youtube_link text,
  deposit_qr_url text,
  binance_id text,
  binance_qr_url text,
  account_profile_url text,
  updated_at timestamp with time zone default now()
);

-- 7. Create Referral Codes Table
create table if not exists public.referral_codes (
  id text primary key, -- 'MASTER' or code string
  user_id text references public.users(id) on delete cascade,
  created_at timestamp with time zone default now()
);

-- 8. Create Tasks Table
create table if not exists public.tasks (
  id text primary key default gen_random_uuid()::text,
  user_id text references public.users(id) on delete cascade,
  title text not null,
  reward numeric not null,
  status text default 'pending', -- 'pending', 'completed'
  completed_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- 9. Create Deposits Table
create table if not exists public.deposits (
  id text primary key default gen_random_uuid()::text,
  user_id text references public.users(id) on delete cascade,
  amount numeric not null,
  currency text default 'USD',
  payment_method text default 'nowpayments',
  payment_id text,
  status text default 'pending', -- 'pending', 'completed', 'failed'
  invoice_url text,
  created_at timestamp with time zone default now()
);

-- 10. Create Withdrawals Table
create table if not exists public.withdrawals (
  id text primary key default gen_random_uuid()::text,
  user_id text references public.users(id) on delete cascade,
  amount numeric not null,
  address text not null,
  network text default 'USDT',
  status text default 'pending', -- 'pending', 'completed', 'rejected'
  created_at timestamp with time zone default now()
);

-- ============================================================================
-- ALTER EXISTING TABLES (MIGRATION SAFETY FOR EXISTING DATABASES)
-- ============================================================================

alter table public.users add column if not exists plan_purchase_date timestamp with time zone;
alter table public.users add column if not exists usdt_address text;
alter table public.users add column if not exists username text;
alter table public.users add column if not exists username_lower text;
alter table public.users add column if not exists is_admin boolean default false;
alter table public.users add column if not exists "isAdmin" boolean default false;
alter table public.users add column if not exists device_signature text;

create or replace function public.sync_user_admin_columns()
returns trigger
language plpgsql
as $$
begin
  if new."isAdmin" is null then
    new."isAdmin" = new.is_admin;
  elsif new.is_admin is null then
    new.is_admin = new."isAdmin";
  elsif new."isAdmin" <> new.is_admin then
    new.is_admin = new."isAdmin";
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_user_admin_columns on public.users;
create trigger trg_sync_user_admin_columns
before insert or update on public.users
for each row
execute function public.sync_user_admin_columns();
alter table public.users add column if not exists ip_hint text;
alter table public.users add column if not exists fcm_token text;

alter table public.transactions add column if not exists recipient_id text;
alter table public.transactions add column if not exists withdrawal_method text;
alter table public.transactions add column if not exists order_id text;
alter table public.transactions add column if not exists wallet_address text;
alter table public.transactions add column if not exists user_usdt_address text;
alter table public.transactions add column if not exists rejection_reason text;
alter table public.transactions add column if not exists deducted_amount numeric;
alter table public.transactions add column if not exists from_user text;
alter table public.transactions add column if not exists timestamp timestamp with time zone default now();
-- NOWPayments: stores the official invoice/payment ID from NOWPayments API (separate from our UUID)
alter table public.transactions add column if not exists nowpayments_invoice_id text;


alter table public.shipped_orders add column if not exists total_tasks integer default 0;
alter table public.shipped_orders add column if not exists claim_amount numeric default 0;
alter table public.shipped_orders add column if not exists claimed boolean default false;

-- ============================================================================
-- DISABLE ROW LEVEL SECURITY (RLS) FOR OPEN DEV/PRODUCTION COMPATIBILITY
-- ============================================================================

alter table public.users disable row level security;
alter table public.transactions disable row level security;
alter table public.orders disable row level security;
alter table public.shipped_orders disable row level security;
alter table public.referrals disable row level security;
alter table public.settings disable row level security;
alter table public.referral_codes disable row level security;
alter table public.tasks disable row level security;
alter table public.deposits disable row level security;
alter table public.withdrawals disable row level security;

-- ============================================================================
-- CLOCK GUARD: block_reason column + get_server_time RPC
-- ============================================================================

-- Add block_reason column (for auto-block reason logging)
alter table public.users add column if not exists block_reason text default '';

-- RPC: Returns current server UTC timestamp as text
-- Used by ClockGuard to compare device time vs server time
create or replace function public.get_server_time()
returns text
language sql
security definer
as $$
  select now()::text;
$$;

-- Grant execute to anonymous/authenticated users
grant execute on function public.get_server_time() to anon, authenticated;

-- ============================================================================
-- ATOMIC INCREMENT RPC (Fixes Race Conditions)
-- ============================================================================
create or replace function public.atomic_increment(table_name text, row_id text, increments jsonb)
returns void
language plpgsql
security definer
as $$
declare
  key text;
  val numeric;
  query_str text;
  set_parts text[] := array[]::text[];
begin
  for key, val in select * from jsonb_each_text(increments)
  loop
    set_parts := array_append(set_parts, format('%I = coalesce(%I, 0) + %L', key, key, val));
  end loop;
  
  if array_length(set_parts, 1) > 0 then
    query_str := format('update public.%I set %s, updated_at = now() where id = %L', table_name, array_to_string(set_parts, ', '), row_id);
    execute query_str;
  end if;
end;
$$;
grant execute on function public.atomic_increment(text, text, jsonb) to anon, authenticated;
