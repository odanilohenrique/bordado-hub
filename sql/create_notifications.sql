-- create_notifications.sql
-- Run this in the Supabase SQL Editor

create table if not exists notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references users(id) not null,
    type text not null, -- 'nova_proposta', 'nova_mensagem', 'solicitacao_direta', etc.
    title text not null,
    message text not null,
    link_url text,
    is_read boolean default false,
    created_at timestamptz default now()
);

-- RLS
alter table notifications enable row level security;

-- Policies
create policy "Users can view their own notifications" on notifications
    for select using (auth.uid() in (select supabase_user_id from users where id = user_id));

create policy "Users can update their own notifications (e.g., mark as read)" on notifications
    for update using (auth.uid() in (select supabase_user_id from users where id = user_id));

-- Note: Inserts will mostly happen via edge functions, trigger, or backend API using service role, 
-- but users making an action that generates a notification could potentially insert if their RLS allowed.
-- For safety, inserts can be restricted or handled by the app server/service role.
create policy "Authenticated users can create notifications" on notifications
  for insert with check (auth.role() = 'authenticated');
