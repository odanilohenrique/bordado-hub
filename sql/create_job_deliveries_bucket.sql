-- Create 'job-deliveries' bucket
insert into storage.buckets (id, name, public)
values ('job-deliveries', 'job-deliveries', true)
on conflict (id) do nothing;

-- Policy: Give public access to view delivery files
create policy "Delivery files are public"
on storage.objects for select
using ( bucket_id = 'job-deliveries' );

-- Policy: Allow authenticated users to upload deliveries
create policy "Users can upload deliveries"
on storage.objects for insert
with check (
  bucket_id = 'job-deliveries' 
  and auth.role() = 'authenticated'
);

-- Policy: Allow users to update their own deliveries
create policy "Users can update their own deliveries"
on storage.objects for update
using (
  bucket_id = 'job-deliveries' 
  and auth.uid() = owner
);

-- Policy: Allow users to delete their own deliveries
create policy "Users can delete their own deliveries"
on storage.objects for delete
using (
  bucket_id = 'job-deliveries' 
  and auth.uid() = owner
);
