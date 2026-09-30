-- ==============================================================================
-- ADICIONA CAMPOS DE CHAVE PIX NA TABELA USERS (PARA REPASSE AO PROGRAMADOR)
-- ==============================================================================

-- 1. Coluna para o valor da chave PIX (ex: CPF, CNPJ, E-mail, Celular ou Chave Aleatória)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pix_key TEXT;

-- 2. Coluna para o tipo de chave PIX ('cpf', 'cnpj', 'email', 'telefone', 'aleatoria')
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pix_key_type TEXT DEFAULT 'cpf';

-- 3. Atualiza cache de schema do Supabase PostgREST
NOTIFY pgrst, 'reload schema';
