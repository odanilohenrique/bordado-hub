-- ==========================================
-- SCRIPT DE CORREÇÃO DA TABELA USERS & SCHEMA CACHE
-- ==========================================

-- 1. Adicionar coluna 'role' e todas as outras colunas que possam faltar
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('cliente','criador')),
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS skills TEXT[],
ADD COLUMN IF NOT EXISTS formats TEXT[],
ADD COLUMN IF NOT EXISTS experience_level TEXT,
ADD COLUMN IF NOT EXISTS portfolio_urls TEXT[],
ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT,
ADD COLUMN IF NOT EXISTS pix_key TEXT,
ADD COLUMN IF NOT EXISTS pix_key_type TEXT CHECK (pix_key_type IN ('cpf', 'cnpj', 'email', 'phone', 'random'));

-- 2. Garantir permissões completas para o service_role
GRANT ALL ON TABLE users TO service_role;
GRANT ALL ON TABLE jobs TO service_role;
GRANT ALL ON TABLE proposals TO service_role;
GRANT ALL ON TABLE transactions TO service_role;

-- 3. Forçar recarregamento do Cache de Esquema do Supabase PostgREST
NOTIFY pgrst, 'reload schema';
