-- Add columns for negotiation
alter table proposals 
add column if not exists counter_amount numeric,
add column if not exists counter_message text;

-- Ensure RLS allows updates to these columns
-- (Existing update policy usually checks auth.uid() = criador_id OR auth.uid() = (select cliente_id from jobs where id = job_id)
-- But initially we only allowed updates by 'criador_id'?

-- Let's check policies. If "Enable update for users based on email" was general, we might need specific policy.
-- Creating a specific policy for "Job Owners can update Counter Proposal columns"
create policy "Job Owners can update proposals (Negotiate)"
on proposals
for update
using (
  auth.uid() in (
    select cliente_id from jobs where id = proposals.job_id
  )
);
