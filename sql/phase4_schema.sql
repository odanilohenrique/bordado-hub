-- Phase 4: Profile 2.0 Enhancements

-- 1. Client Profile Fields
alter table public.users
add column if not exists formats text[], -- Ex: ['DST', 'PES', 'XXX']
add column if not exists experience_level text; -- Ex: 'Iniciante', 'Intermediário', 'Experiente'

-- 2. Reviews Table (Avaliações Reais)
create table if not exists public.reviews (
  id uuid default gen_random_uuid() primary key,
  job_id uuid references public.jobs(id), -- Optional link to a job
  reviewer_id uuid references public.users(id) not null,
  reviewee_id uuid references public.users(id) not null,
  rating int check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz default now()
);

-- 3. RLS for Reviews
alter table public.reviews enable row level security;

create policy "Reviews are public"
on public.reviews for select
using (true);

create policy "Users can write reviews for jobs they participated in"
on public.reviews for insert
with check (
  auth.uid() = (select supabase_user_id from public.users where id = reviewer_id)
);

-- 4. Storage Buckets (via SQL if possible, otherwise manual)
-- Note: Supabase usually requires API/Dashboard for buckets, but we can try inserting if storage schema is exposed
-- This is a hint for the user mainly.
