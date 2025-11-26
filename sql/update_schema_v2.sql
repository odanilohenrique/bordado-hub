-- Atualização do Schema para Fluxo de Pedidos (V2)

-- 1. Atualizar tabela JOBS
alter table jobs add column if not exists urgency text check (urgency in ('urgente', 'sem_pressa', 'prazo_curto'));
alter table jobs add column if not exists formats text[]; -- Ex: ['PES', 'DST']
alter table jobs add column if not exists fabric_type text;

-- 2. Atualizar tabela PROPOSALS
alter table proposals add column if not exists deadline_text text; -- Prazo proposto pelo criador

-- 3. Atualizar tabela DELIVERIES
alter table deliveries add column if not exists technical_sheet_urls text[]; -- URLs das fichas técnicas
-- 'message' será usado para Observações

-- 4. Criar tabela REVISIONS (Revisões)
create table if not exists revisions (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid references deliveries(id),
  client_id uuid references users(id),
  reason text, -- 'erro_matriz', 'ma_qualidade', 'formato_errado', 'tamanho_errado', 'pedido_errado'
  comment text,
  status text default 'pendente', -- 'pendente', 'resolvido'
  created_at timestamptz default now()
);

-- RLS para Revisions
alter table revisions enable row level security;

create policy "Users involved can view revisions" on revisions
  for select using (
    auth.uid() in (select supabase_user_id from users where id = client_id) or
    auth.uid() in (select supabase_user_id from users where id = (select criador_id from deliveries where id = delivery_id))
  );

create policy "Clients can create revisions" on revisions
  for insert with check (
    auth.uid() in (select supabase_user_id from users where id = client_id)
  );

-- 5. Atualizar Policies de Jobs para permitir Upload (se necessário ajustar buckets)
-- (Assumindo que bucket 'portfolio' será usado para imagens públicas de jobs por enquanto)
