-- Enable pgcrypto for UUID generation
create extension if not exists "pgcrypto";

-- USERS Table
-- Stores user profile information. Authentication is handled by Supabase Auth.
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  supabase_user_id uuid unique, -- Links to Supabase Auth.user.id
  name text,
  email text,
  role text check (role in ('cliente','criador')),
  bio text,
  portfolio jsonb, -- Array of objects: [{url, title, desc}]
  created_at timestamptz default now()
);

-- JOBS Table
-- Requests created by Clients.
create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references users(id),
  title text not null,
  description text,
  image_urls text[], -- Reference images
  status text default 'aberto', -- aberto, em_progresso, entregue, finalizado, cancelado
  created_at timestamptz default now(),
  deadline timestamptz
);

-- PROPOSALS Table
-- Offers made by Creators for specific Jobs.
create table if not exists proposals (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id),
  criador_id uuid references users(id),
  amount numeric, -- Proposed price in BRL
  message text,
  status text default 'pendente', -- pendente, aceita, recusada
  created_at timestamptz default now()
);

-- TRANSACTIONS Table
-- Financial records for Jobs.
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id),
  cliente_id uuid references users(id),
  criador_id uuid references users(id),
  amount numeric, -- Base job amount
  taxa_cliente numeric default 5,
  taxa_criador numeric default 5,
  total_pago numeric, -- amount + taxa_cliente
  valor_liquido numeric, -- amount - taxa_criador
  metodo text, -- 'mercadopago' or 'paypal'
  status text default 'pendente', -- pendente, pago, liberado, estornado
  created_at timestamptz default now()
);

-- DELIVERIES Table
-- Files uploaded by Creators.
create table if not exists deliveries (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id),
  criador_id uuid references users(id),
  file_url text,
  message text,
  created_at timestamptz default now()
);

-- MESSAGES Table
-- Simple chat between Client and Creator.
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id),
  sender_id uuid references users(id),
  content text,
  created_at timestamptz default now()
);

-- ROW LEVEL SECURITY (RLS)
-- Enable RLS on all tables
alter table users enable row level security;
alter table jobs enable row level security;
alter table proposals enable row level security;
alter table transactions enable row level security;
alter table deliveries enable row level security;
alter table messages enable row level security;

-- POLICIES

-- Users
create policy "Users can view their own profile" on users
  for select using (auth.uid() = supabase_user_id);

create policy "Users can view public profiles of creators" on users
  for select using (role = 'criador');

create policy "Users can insert their own profile" on users
  for insert with check (auth.uid() = supabase_user_id);

create policy "Users can update their own profile" on users
  for update using (auth.uid() = supabase_user_id);

-- Jobs
create policy "Anyone can view jobs" on jobs
  for select using (true);

create policy "Authenticated users can create jobs" on jobs
  for insert with check (auth.role() = 'authenticated');

create policy "Clients can update their own jobs" on jobs
  for update using (auth.uid() in (select supabase_user_id from users where id = cliente_id));

-- Proposals
create policy "Creators can insert proposals" on proposals
  for insert with check (auth.role() = 'authenticated'); -- Logic to check if user is creator should be in app or stricter RLS

create policy "Clients can view proposals for their jobs" on proposals
  for select using (auth.uid() in (select supabase_user_id from users where id = (select cliente_id from jobs where id = job_id)));

create policy "Creators can view their own proposals" on proposals
  for select using (auth.uid() in (select supabase_user_id from users where id = criador_id));

-- Transactions
create policy "Users can view their own transactions" on transactions
  for select using (
    auth.uid() in (select supabase_user_id from users where id = cliente_id) or
    auth.uid() in (select supabase_user_id from users where id = criador_id)
  );

-- Deliveries
create policy "Users involved in job can view deliveries" on deliveries
  for select using (
    auth.uid() in (select supabase_user_id from users where id = (select cliente_id from jobs where id = job_id)) or
    auth.uid() in (select supabase_user_id from users where id = criador_id)
  );

create policy "Creators can insert deliveries" on deliveries
  for insert with check (auth.uid() in (select supabase_user_id from users where id = criador_id));

-- Messages
create policy "Users involved in job can view/insert messages" on messages
  for all using (
    auth.uid() in (select supabase_user_id from users where id = (select cliente_id from jobs where id = job_id)) or
    auth.uid() in (select supabase_user_id from users where id = (select criador_id from proposals where job_id = messages.job_id and status = 'aceita')) -- Simplified check
  );

