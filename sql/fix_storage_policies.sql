-- Fix: Add policy to allow authenticated users to upload to portfolio bucket
-- Run this in Supabase SQL Editor

-- 1. Ensure portfolio bucket exists and is public
-- (This was done before, just checking)

-- 2. Add upload policy for portfolio bucket
create policy "Authenticated users can upload to portfolio"
on storage.objects for insert
to authenticated
with check (bucket_id = 'portfolio');

-- 3. Add policy for users to upload to their own folder in portfolio
create policy "Users can upload to their jobs folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'portfolio' AND
  (storage.foldername(name))[1] = 'jobs'
);
