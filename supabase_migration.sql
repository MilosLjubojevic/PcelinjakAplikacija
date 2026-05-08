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
-- 10. swarm_box_rows
-- ============================================
create table swarm_box_rows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  location text not null check (location in ('kuca', 'suma')),
  "order" integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table swarm_box_rows enable row level security;
create policy "Users manage own swarm_box_rows"
  on swarm_box_rows for all to authenticated using (true) with check (true);

-- ============================================
-- 11. swarm_boxes
-- ============================================
create table swarm_boxes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  row_id uuid not null references swarm_box_rows(id) on delete cascade,
  number integer not null,
  health text not null default 'good' check (health in ('good', 'warning')),
  status text not null default 'empty' check (status in ('empty', 'developing', 'ready')),
  start_date timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table swarm_boxes enable row level security;
create policy "Users manage own swarm_boxes"
  on swarm_boxes for all to authenticated using (true) with check (true);

-- ============================================
-- 12. nuclei
-- ============================================
create table nuclei (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  status text not null check (status in ('developing', 'ready', 'for-sale', 'sold', 'merged')),
  location text not null default 'kuca' check (location in ('kuca', 'suma')),
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
  category text not null check (category in ('honey-sale', 'nucleus-sale', 'queen-sale', 'hive-sale', 'wax-sale', 'pollination', 'other')),
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

-- ============================================
-- 15. notes (bilješke)
-- ============================================
create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null default '',
  date timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table notes enable row level security;
create policy "Users manage own notes"
  on notes for all to authenticated using (true) with check (true);

-- ============================================
-- 16. polen_harvests (berbe polena)
-- ============================================
-- If the table doesn't exist yet, create it:
-- create table if not exists public.polen_harvests (
--   id uuid primary key default gen_random_uuid(),
--   user_id uuid not null references auth.users(id) on delete cascade,
--   date timestamptz not null,
--   weight_grams numeric not null,
--   notes text,
--   created_at timestamptz not null default now(),
--   updated_at timestamptz not null default now()
-- );

-- Run these in Supabase SQL Editor to fix cross-device sync:
alter table public.polen_harvests enable row level security;

drop policy if exists "Users manage own polen harvests" on public.polen_harvests;
create policy "Users manage own polen harvests"
  on public.polen_harvests for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.polen_harvests replica identity full;
alter publication supabase_realtime add table public.polen_harvests;

-- ================================================================
-- Migration v2: Unified slot-based rows
-- Merge swarms into hives table, link queen_box_rows to locations
-- ================================================================

-- 1a. Add type discriminator and swarm fields to hives
ALTER TABLE hives ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'hive';
ALTER TABLE hives ADD COLUMN IF NOT EXISTS swarm_status text;
ALTER TABLE hives ADD COLUMN IF NOT EXISTS swarm_start_date timestamptz;

-- Update health constraint to include 'warning' (used by swarms)
ALTER TABLE hives DROP CONSTRAINT IF EXISTS hives_health_check;
ALTER TABLE hives ADD CONSTRAINT hives_health_check CHECK (health IN ('good', 'bad', 'warning'));

-- Add type constraint
ALTER TABLE hives ADD CONSTRAINT hives_type_check CHECK (type IN ('hive', 'swarm'));

-- Add swarm_status constraint
ALTER TABLE hives ADD CONSTRAINT hives_swarm_status_check CHECK (swarm_status IS NULL OR swarm_status IN ('empty', 'developing', 'ready'));

-- Make has_queen nullable (swarms don't use it)
ALTER TABLE hives ALTER COLUMN has_queen DROP NOT NULL;
ALTER TABLE hives ALTER COLUMN has_queen DROP DEFAULT;

-- 1b. Add capacity to hive_rows
ALTER TABLE hive_rows ADD COLUMN IF NOT EXISTS capacity integer NOT NULL DEFAULT 10;

-- Backfill capacity from existing hive count per row
UPDATE hive_rows SET capacity = GREATEST(
  (SELECT COALESCE(MAX(number), 0) FROM hives WHERE row_id = hive_rows.id),
  capacity
);

-- 1c. Add capacity to queen_box_rows
ALTER TABLE queen_box_rows ADD COLUMN IF NOT EXISTS capacity integer NOT NULL DEFAULT 10;

-- Backfill capacity from existing queen box count per row
UPDATE queen_box_rows SET capacity = GREATEST(
  (SELECT COALESCE(MAX(number), 0) FROM queen_boxes WHERE row_id = queen_box_rows.id),
  capacity
);

-- 1d. Add location_id FK to queen_box_rows (replacing string location)
ALTER TABLE queen_box_rows ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES locations(id) ON DELETE CASCADE;

-- Migration: map string location to location_id
-- For each queen_box_row, find a matching location by name for the same user
DO $$
DECLARE
  qbr RECORD;
  target_loc_id uuid;
BEGIN
  FOR qbr IN SELECT * FROM queen_box_rows WHERE location_id IS NULL LOOP
    -- Try to find matching location
    SELECT id INTO target_loc_id
    FROM locations
    WHERE user_id = qbr.user_id
    AND (
      (qbr.location = 'kuca' AND lower(name) IN ('kuca', 'kuća', 'kuci', 'kući')) OR
      (qbr.location = 'suma' AND lower(name) IN ('suma', 'šuma', 'sumi', 'šumi'))
    )
    LIMIT 1;

    -- If no matching location, create one
    IF target_loc_id IS NULL THEN
      target_loc_id := gen_random_uuid();
      INSERT INTO locations (id, user_id, name, icon, created_at, updated_at)
      VALUES (target_loc_id, qbr.user_id,
        CASE WHEN qbr.location = 'kuca' THEN 'Kuća' ELSE 'Šuma' END,
        CASE WHEN qbr.location = 'kuca' THEN 'home' ELSE 'leaf' END,
        now(), now());
    END IF;

    UPDATE queen_box_rows SET location_id = target_loc_id WHERE id = qbr.id;
  END LOOP;
END $$;

-- Drop old location column and make location_id required
ALTER TABLE queen_box_rows DROP COLUMN IF EXISTS location;
ALTER TABLE queen_box_rows ALTER COLUMN location_id SET NOT NULL;

-- 1e. Migrate swarm data into hives/hive_rows
DO $$
DECLARE
  sbr RECORD;
  target_loc_id uuid;
  new_row_id uuid;
  max_number integer;
BEGIN
  FOR sbr IN SELECT * FROM swarm_box_rows LOOP
    -- Find matching location
    SELECT id INTO target_loc_id
    FROM locations
    WHERE user_id = sbr.user_id
    AND (
      (sbr.location = 'kuca' AND lower(name) IN ('kuca', 'kuća', 'kuci', 'kući')) OR
      (sbr.location = 'suma' AND lower(name) IN ('suma', 'šuma', 'sumi', 'šumi'))
    )
    LIMIT 1;

    -- If no matching location, create one
    IF target_loc_id IS NULL THEN
      target_loc_id := gen_random_uuid();
      INSERT INTO locations (id, user_id, name, icon, created_at, updated_at)
      VALUES (target_loc_id, sbr.user_id,
        CASE WHEN sbr.location = 'kuca' THEN 'Kuća' ELSE 'Šuma' END,
        CASE WHEN sbr.location = 'kuca' THEN 'home' ELSE 'leaf' END,
        now(), now());
    END IF;

    -- Get max swarm box number for capacity
    SELECT COALESCE(MAX(number), 0) INTO max_number
    FROM swarm_boxes WHERE row_id = sbr.id;

    -- Create hive_row from swarm_box_row
    new_row_id := gen_random_uuid();
    INSERT INTO hive_rows (id, user_id, location_id, name, "order", capacity, created_at, updated_at)
    VALUES (new_row_id, sbr.user_id, target_loc_id, sbr.name, sbr."order", max_number, sbr.created_at, sbr.updated_at);

    -- Migrate swarm_boxes as hives with type='swarm'
    INSERT INTO hives (id, user_id, location_id, row_id, number, health, type, swarm_status, swarm_start_date, has_queen, created_at, updated_at)
    SELECT sb.id, sb.user_id, target_loc_id, new_row_id, sb.number, sb.health, 'swarm', sb.status, sb.start_date, NULL, sb.created_at, sb.updated_at
    FROM swarm_boxes sb
    WHERE sb.row_id = sbr.id;
  END LOOP;
END $$;

-- Drop swarm tables after migration
DROP TABLE IF EXISTS swarm_boxes;
DROP TABLE IF EXISTS swarm_box_rows;
