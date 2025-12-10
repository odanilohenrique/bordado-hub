-- FINAL SETUP SCRIPT
-- Run this in Supabase SQL Editor to fix EVERYTHING

-- 1. Reset Schema (Optional - use if you want to wipe data and start fresh)
-- drop table if exists messages, deliveries, transactions, proposals, jobs, users cascade;

-- 2. Extensions
create extension if not exists "pgcrypto";

-- 3. Tables
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  supabase_user_id uuid unique,
  name text,
  email text,
  role text check (role in ('cliente','criador')),
  bio text,
  portfolio jsonb,
  created_at timestamptz default now()
);

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references users(id),
  title text not null,
  description text,
  image_urls text[],
  formats text[],
  fabric_type text,
  urgency text,
  status text default 'aberto',
  created_at timestamptz default now(),
  deadline timestamptz
);

create table if not exists proposals (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id),
  criador_id uuid references users(id),
  amount numeric,
  message text,
  deadline_text text,
  status text default 'pendente',
  created_at timestamptz default now()
);

-- 4. Enable RLS
alter table users enable row level security;
alter table jobs enable row level security;
alter table proposals enable row level security;

-- 5. FIX POLICIES (DROP OLD ONES FIRST TO AVOID CONFLICTS)
drop policy if exists "Enable all access for now" on users;
drop policy if exists "Enable all access for now" on jobs;
drop policy if exists "Enable all access for now" on proposals;
drop policy if exists "Public Access" on users;
drop policy if exists "Public Access" on jobs;
drop policy if exists "Public Access" on proposals;

-- Create permissive policies for testing (Fixes "No jobs available" and "Table not found" issues)
create policy "Enable read access for all users" on users for select using (true);
create policy "Enable insert for authenticated users only" on users for insert with check (auth.role() = 'authenticated' OR auth.role() = 'service_role');
create policy "Enable update for users based on email" on users for update using (auth.uid() = supabase_user_id);

create policy "Enable read access for all jobs" on jobs for select using (true);
create policy "Enable insert for authenticated users" on jobs for insert with check (auth.role() = 'authenticated');
create policy "Enable update for job owners" on jobs for update using (auth.uid() in (select supabase_user_id from users where id = cliente_id));

create policy "Enable read access for proposals" on proposals for select using (true);
create policy "Enable insert for authenticated users" on proposals for insert with check (auth.role() = 'authenticated');

-- 6. Storage (If not already set)
insert into storage.buckets (id, name, public) 
values ('portfolio', 'portfolio', true)
on conflict (id) do nothing;

create policy "Public Access to Portfolio" on storage.objects for select using (bucket_id = 'portfolio');
create policy "Auth users can upload" on storage.objects for insert with check (bucket_id = 'portfolio' and auth.role() = 'authenticated');

-- 7. Grant permissions to service_role (Fixes API issues)
grant all on table users to service_role;
grant all on table jobs to service_role;
grant all on table proposals to service_role;
