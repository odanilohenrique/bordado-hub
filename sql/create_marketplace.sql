-- Phase 4: Marketplace Products Table

create table if not exists public.marketplace_products (
  id uuid default gen_random_uuid() primary key,
  seller_id uuid references public.users(id) not null,
  title text not null,
  description text,
  price numeric not null default 0,
  image_url text not null,
  file_url text not null,
  formats text[], -- Ex: ['PES', 'DST', 'JEF']
  created_at timestamptz default now()
);

-- RLS setup
alter table public.marketplace_products enable row level security;

-- Policy: Anyone can view marketplace items
create policy "Anyone can view products"
on public.marketplace_products
for select
using (true);

-- Policy: Sellers can create items
create policy "Users can sell products"
on public.marketplace_products
for insert
with check (
  exists (
    select 1 from public.users u
    where u.supabase_user_id = auth.uid()
    and u.id = marketplace_products.seller_id
  )
);

-- Policy: Sellers can update their items
create policy "Users can update their products"
on public.marketplace_products
for update
using (
  exists (
    select 1 from public.users u
    where u.supabase_user_id = auth.uid()
    and u.id = marketplace_products.seller_id
  )
);

-- Policy: Sellers can delete their items
create policy "Users can delete their products"
on public.marketplace_products
for delete
using (
  exists (
    select 1 from public.users u
    where u.supabase_user_id = auth.uid()
    and u.id = marketplace_products.seller_id
  )
);
