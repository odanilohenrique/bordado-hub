-- Fix: Add missing RLS policies for proposals and jobs updates

-- Allow authenticated users to update proposals
create policy "Allow proposal updates by job owner or creator"
on proposals for update
using (
  auth.uid() in (
    select supabase_user_id from users where id = criador_id
  ) OR
  auth.uid() in (
    select supabase_user_id from users 
    where id = (select cliente_id from jobs where id = job_id)
  )
);

-- Allow job status updates by owner
create policy "Allow job updates by owner"
on jobs for update
using (
  auth.uid() in (
    select supabase_user_id from users where id = cliente_id
  )
);

-- Allow transactions to be created by authenticated users  
create policy "Allow authenticated users to create transactions"
on transactions for insert
with check (auth.role() = 'authenticated');
