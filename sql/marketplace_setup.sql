-- ==============================================================================
-- BORDADOHUB - MARKETPLACE COMPLETO: TABELAS, BALANÇO E POLÍTICAS RLS
-- Execute este script no SQL Editor do Supabase para ativar o Marketplace
-- ==============================================================================

-- 1. Criação ou Atualização da Tabela de Produtos do Marketplace
create table if not exists public.marketplace_products (
  id uuid default gen_random_uuid() primary key,
  seller_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  description text,
  price numeric not null default 0,
  image_url text not null,
  file_url text not null,
  formats text[] default array['PES', 'DST', 'JEF'],
  category text default 'geral', -- 'infantil', 'animais', 'floral', 'religioso', 'logos', 'frases', 'geral'
  is_bundle boolean default false, -- true = pacote com várias matrizes, false = individual
  items_count integer default 1, -- quantidade de matrizes inclusas
  sales_count integer default 0,
  tags text[] default array[]::text[],
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Adiciona colunas caso a tabela já existisse anteriormente
alter table public.marketplace_products add column if not exists category text default 'geral';
alter table public.marketplace_products add column if not exists is_bundle boolean default false;
alter table public.marketplace_products add column if not exists items_count integer default 1;
alter table public.marketplace_products add column if not exists sales_count integer default 0;
alter table public.marketplace_products add column if not exists tags text[] default array[]::text[];
alter table public.marketplace_products add column if not exists is_active boolean default true;

-- Habilita RLS em marketplace_products
alter table public.marketplace_products enable row level security;

-- Políticas de RLS para marketplace_products
drop policy if exists "Anyone can view products" on public.marketplace_products;
create policy "Anyone can view products"
on public.marketplace_products
for select
using (is_active = true or exists (
  select 1 from public.users u 
  where u.supabase_user_id = auth.uid() 
  and u.id = marketplace_products.seller_id
));

drop policy if exists "Users can sell products" on public.marketplace_products;
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

drop policy if exists "Users can update their products" on public.marketplace_products;
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

drop policy if exists "Users can delete their products" on public.marketplace_products;
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

-- ==============================================================================
-- 2. Tabela de Pedidos / Compras do Marketplace (marketplace_orders)
-- ==============================================================================
create table if not exists public.marketplace_orders (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references public.marketplace_products(id) on delete set null,
  buyer_id uuid references public.users(id) on delete cascade not null,
  seller_id uuid references public.users(id) on delete cascade not null,
  amount numeric not null,               -- Valor bruto pago pelo comprador
  platform_fee numeric not null,         -- 15% retido para a plataforma
  seller_net numeric not null,           -- 85% liberado para o vendedor
  status text default 'pending',         -- 'pending', 'paid', 'cancelled'
  payment_method text default 'asaas_pix',
  asaas_payment_id text,
  pix_qr_code text,
  pix_copy_paste text,
  pix_expiration timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.marketplace_orders enable row level security;

-- Comprador e vendedor podem visualizar seus pedidos
drop policy if exists "Users can view their orders" on public.marketplace_orders;
create policy "Users can view their orders"
on public.marketplace_orders
for select
using (
  exists (
    select 1 from public.users u
    where u.supabase_user_id = auth.uid()
    and (u.id = marketplace_orders.buyer_id or u.id = marketplace_orders.seller_id)
  )
);

-- Inserção de pedidos via serviço / usuário autenticado
drop policy if exists "Users can insert orders" on public.marketplace_orders;
create policy "Users can insert orders"
on public.marketplace_orders
for insert
with check (
  exists (
    select 1 from public.users u
    where u.supabase_user_id = auth.uid()
    and u.id = marketplace_orders.buyer_id
  )
);

-- ==============================================================================
-- 3. Storage Buckets para o Marketplace (Imagens e Arquivos de Matrizes)
-- ==============================================================================
insert into storage.buckets (id, name, public)
values ('marketplace-previews', 'marketplace-previews', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('marketplace-files', 'marketplace-files', true)
on conflict (id) do nothing;

-- Políticas de Storage
create policy "Previews are public"
on storage.objects for select
using ( bucket_id = 'marketplace-previews' );

create policy "Users can upload previews"
on storage.objects for insert
with check (
  bucket_id = 'marketplace-previews' 
  and auth.role() = 'authenticated'
);

create policy "Marketplace files are accessible"
on storage.objects for select
using ( bucket_id = 'marketplace-files' );

create policy "Users can upload marketplace files"
on storage.objects for insert
with check (
  bucket_id = 'marketplace-files' 
  and auth.role() = 'authenticated'
);

-- Índices para alta performance
create index if not exists idx_marketplace_products_seller on public.marketplace_products(seller_id);
create index if not exists idx_marketplace_products_category on public.marketplace_products(category);
create index if not exists idx_marketplace_orders_buyer on public.marketplace_orders(buyer_id);
create index if not exists idx_marketplace_orders_seller on public.marketplace_orders(seller_id);
