-- Add delivery columns to jobs
alter table public.jobs
add column if not exists delivery_url text,
add column if not exists delivery_notes text,
add column if not exists delivered_at timestamptz;

-- Add enhanced review fields to reviews
alter table public.reviews
add column if not exists rating_matrix int check (rating_matrix >= 1 and rating_matrix <= 5),
add column if not exists rating_service int check (rating_service >= 1 and rating_service <= 5);

-- Enable RLS for jobs update (for programmer to deliver)
-- Only assigned programmer can update delivery fields when status is em_progresso
create policy "Programmer can deliver job"
on public.jobs
for update
using (
  auth.uid() = (select supabase_user_id from public.users where id = (select criador_id from proposals where job_id = jobs.id and status = 'aceita'))
  and status = 'em_progresso'
);
