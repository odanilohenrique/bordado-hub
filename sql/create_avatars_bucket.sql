-- Create 'avatars' bucket
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Policy: Give public access to view avatars
create policy "Avatar images are public"
on storage.objects for select
using ( bucket_id = 'avatars' );

-- Policy: Allow authenticated users to upload avatars
create policy "Users can upload their own avatar"
on storage.objects for insert
with check (
  bucket_id = 'avatars' 
  and auth.role() = 'authenticated'
);

-- Policy: Allow users to update their own avatar
create policy "Users can update their own avatar"
on storage.objects for update
using (
  bucket_id = 'avatars' 
  and auth.uid() = owner
);

-- Policy: Allow users to delete their own avatar
create policy "Users can delete their own avatar"
on storage.objects for delete
using (
  bucket_id = 'avatars' 
  and auth.uid() = owner
);
