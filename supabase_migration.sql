-- ================================================================
-- Supabase Migration: Create all tables for multi-device sync
-- Run this SQL in your Supabase Dashboard → SQL Editor
-- ================================================================

-- Enable UUID extension (if not already)
create extension if not exists "pgcrypto";

-- ============================================
-- 1. locations
-- ============================================
create table locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text not null default 'home',
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table locations enable row level security;
create policy "Users manage own locations"
  on locations for all to authenticated using (true) with check (true);

-- ============================================
-- 2. hive_rows
-- ============================================
create table hive_rows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  name text not null,
  "order" integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table hive_rows enable row level security;
create policy "Users manage own hive_rows"
  on hive_rows for all to authenticated using (true) with check (true);

-- ============================================
-- 3. hives
-- ============================================
create table hives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  row_id uuid not null references hive_rows(id) on delete cascade,
  number integer not null,
  health text not null default 'good' check (health in ('good', 'bad')),
  has_queen boolean not null default true,
  queen_id uuid,
  last_inspection timestamptz,
  frame_count integer default 10,
  is_harvested boolean default false,
  has_pollen boolean default false,
  is_active boolean default true,
  last_feeding_date timestamptz,
  last_harvest_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table hives enable row level security;
create policy "Users manage own hives"
  on hives for all to authenticated using (true) with check (true);

-- ============================================
-- 4. hive_notes
-- ============================================
create table hive_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  hive_id uuid not null references hives(id) on delete cascade,
  text text not null,
  photos jsonb default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table hive_notes enable row level security;
create policy "Users manage own hive_notes"
  on hive_notes for all to authenticated using (true) with check (true);

-- ============================================
-- 5. hive_feeding_dates
-- ============================================
create table hive_feeding_dates (
  id uuid primary key default gen_random_uuid(),
  hive_id uuid not null references hives(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  date timestamptz not null,
  created_at timestamptz not null default now()
);

alter table hive_feeding_dates enable row level security;
create policy "Users manage own hive_feeding_dates"
  on hive_feeding_dates for all to authenticated using (true) with check (true);

-- ============================================
-- 6. hive_harvest_dates
-- ============================================
create table hive_harvest_dates (
  id uuid primary key default gen_random_uuid(),
  hive_id uuid not null references hives(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  date timestamptz not null,
  created_at timestamptz not null default now()
);

alter table hive_harvest_dates enable row level security;
create policy "Users manage own hive_harvest_dates"
  on hive_harvest_dates for all to authenticated using (true) with check (true);

-- ============================================
-- 7. queens
-- ============================================
create table queens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  breed text not null check (breed in ('carniolan', 'italian', 'buckfast', 'caucasian', 'hybrid')),
  status text not null check (status in ('mature', 'developing', 'mated', 'laying', 'retired')),
  birth_date timestamptz not null,
  color text,
  marking_year integer,
  current_hive_id uuid,
  mother_queen_id uuid,
  productivity integer,
  temperament integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table queens enable row level security;
create policy "Users manage own queens"
  on queens for all to authenticated using (true) with check (true);

-- ============================================
-- 8. queen_box_rows
-- ============================================
create table queen_box_rows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  location text not null check (location in ('kuca', 'suma')),
  "order" integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table queen_box_rows enable row level security;
create policy "Users manage own queen_box_rows"
  on queen_box_rows for all to authenticated using (true) with check (true);

-- ============================================
-- 9. queen_boxes
-- ============================================
create table queen_boxes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  row_id uuid not null references queen_box_rows(id) on delete cascade,
  number integer not null,
  health text not null default 'good' check (health in ('excellent', 'good', 'warning', 'critical')),
  status text not null default 'empty' check (status in ('empty', 'developing', 'mature', 'removed')),
  start_date timestamptz,
  maturity_date timestamptz,
  removal_date timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table queen_boxes enable row level security;
create policy "Users manage own queen_boxes"
  on queen_boxes for all to authenticated using (true) with check (true);

-- ============================================
-- 10. nuclei
-- ============================================
create table nuclei (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  status text not null check (status in ('developing', 'ready', 'for-sale', 'sold', 'merged')),
  queen_id uuid,
  frame_count integer not null default 5,
  strength integer not null default 5,
  created_date timestamptz not null,
  ready_date timestamptz,
  price numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table nuclei enable row level security;
create policy "Users manage own nuclei"
  on nuclei for all to authenticated using (true) with check (true);

-- ============================================
-- 11. sales
-- ============================================
create table sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_name text not null,
  customer_phone text,
  customer_email text,
  total_amount numeric not null default 0,
  status text not null default 'pending' check (status in ('pending', 'completed', 'cancelled')),
  sale_date timestamptz not null,
  payment_method text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table sales enable row level security;
create policy "Users manage own sales"
  on sales for all to authenticated using (true) with check (true);

-- ============================================
-- 12. sale_items
-- ============================================
create table sale_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sale_id uuid not null references sales(id) on delete cascade,
  type text not null check (type in ('nuclei', 'queen', 'honey', 'wax', 'other')),
  item_id uuid,
  item_name text not null,
  quantity integer not null default 1,
  unit_price numeric not null,
  total_price numeric not null,
  created_at timestamptz not null default now()
);

alter table sale_items enable row level security;
create policy "Users manage own sale_items"
  on sale_items for all to authenticated using (true) with check (true);

-- ============================================
-- 13. expenses
-- ============================================
create table expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('equipment', 'feed', 'medication', 'maintenance', 'transportation', 'packaging', 'other')),
  description text not null,
  amount numeric not null,
  date timestamptz not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table expenses enable row level security;
create policy "Users manage own expenses"
  on expenses for all to authenticated using (true) with check (true);

-- ============================================
-- 14. incomes
-- ============================================
create table incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('honey-sale', 'nucleus-sale', 'queen-sale', 'wax-sale', 'pollination', 'other')),
  description text not null,
  amount numeric not null,
  date timestamptz not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table incomes enable row level security;
create policy "Users manage own incomes"
  on incomes for all to authenticated using (true) with check (true);
