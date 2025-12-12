-- Phase 2: Profiles & Negotiation Chat

-- 1. Expand Users Table (Perfil Avançado)
alter table public.users
add column if not exists avatar_url text,
add column if not exists bio text,
add column if not exists skills text[], -- Ex: ['Wilcom', 'Embird']
add column if not exists portfolio_urls text[],
add column if not exists rating numeric default 5.0,
add column if not exists matrices_count int default 0,
add column if not exists reviews_count int default 0;

-- 2. Create Proposal Chat Messages Table (Negociação 2.0)
create table if not exists public.proposal_messages (
  id uuid default gen_random_uuid() primary key,
  proposal_id uuid references public.proposals(id) on delete cascade not null,
  sender_id uuid references public.users(id) not null,
  content text,
  attachment_url text,
  created_at timestamptz default now()
);

-- 3. RLS for Chat Messages
alter table public.proposal_messages enable row level security;

-- Helper to map Auth ID -> Public User ID
-- Policy: Participants (Job Owner and Proposal Creator) can view messages
create policy "Participants can view messages"
on public.proposal_messages
for select
using (
  exists (
    select 1 from public.users u
    where u.supabase_user_id = auth.uid()
    and (
      -- User is the Creator of the proposal
      u.id = (select criador_id from proposals where id = proposal_messages.proposal_id)
      or
      -- User is the Client (Owner) of the job linked to the proposal
      u.id = (select cliente_id from jobs j join proposals p on p.job_id = j.id where p.id = proposal_messages.proposal_id)
    )
  )
);

-- Policy: Participants can insert messages
create policy "Participants can send messages"
on public.proposal_messages
for insert
with check (
  exists (
    select 1 from public.users u
    where u.supabase_user_id = auth.uid()
    and (
      u.id = (select criador_id from proposals where id = proposal_messages.proposal_id)
      or
      u.id = (select cliente_id from jobs j join proposals p on p.job_id = j.id where p.id = proposal_messages.proposal_id)
    )
  )
);
