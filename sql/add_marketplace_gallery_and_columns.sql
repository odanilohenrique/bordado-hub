-- ==============================================================================
-- BORDADOHUB - MIGRATION M2: MARKETPLACE GALLERY (image_urls), storage_path
-- E POLÍTICAS DE STORAGE SEGURAS PARA marketplace-previews (Idempotente)
-- ==============================================================================

-- 1. Colunas em public.marketplace_products
alter table public.marketplace_products
  add column if not exists image_urls text[] default array[]::text[];

alter table public.marketplace_products
  add column if not exists storage_path text;

-- 2. Backfill seguro de image_urls para produtos existentes sem galeria populada
update public.marketplace_products
set image_urls = array[image_url]
where (image_urls is null or cardinality(image_urls) = 0)
  and image_url is not null
  and image_url <> '';

-- 3. Garantir bucket público marketplace-previews
insert into storage.buckets (id, name, public)
values ('marketplace-previews', 'marketplace-previews', true)
on conflict (id) do update set public = true;

-- 4. Políticas idempotentes de storage.objects para marketplace-previews
-- Nota: uploads gravam na pasta `${profile.id}/...`, onde `profile.id` é `public.users.id`.
-- Portanto validamos `(storage.foldername(name))[1]` contra `auth.uid()` OU `public.users.id`.
drop policy if exists "Previews are public" on storage.objects;
drop policy if exists "Marketplace previews are publicly readable" on storage.objects;
create policy "Marketplace previews are publicly readable"
on storage.objects
for select
using (bucket_id = 'marketplace-previews');

drop policy if exists "Users can upload previews" on storage.objects;
drop policy if exists "Sellers can upload own marketplace previews" on storage.objects;
create policy "Sellers can upload own marketplace previews"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'marketplace-previews'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1
      from public.users u
      where u.supabase_user_id = auth.uid()
        and u.id::text = (storage.foldername(name))[1]
    )
  )
);

drop policy if exists "Sellers can update own marketplace previews" on storage.objects;
create policy "Sellers can update own marketplace previews"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'marketplace-previews'
  and owner = auth.uid()
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1
      from public.users u
      where u.supabase_user_id = auth.uid()
        and u.id::text = (storage.foldername(name))[1]
    )
  )
)
with check (
  bucket_id = 'marketplace-previews'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1
      from public.users u
      where u.supabase_user_id = auth.uid()
        and u.id::text = (storage.foldername(name))[1]
    )
  )
);

drop policy if exists "Sellers can delete own marketplace previews" on storage.objects;
create policy "Sellers can delete own marketplace previews"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'marketplace-previews'
  and owner = auth.uid()
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1
      from public.users u
      where u.supabase_user_id = auth.uid()
        and u.id::text = (storage.foldername(name))[1]
    )
  )
);

-- 5. Recarregar cache de schema do PostgREST
NOTIFY pgrst, 'reload schema';
