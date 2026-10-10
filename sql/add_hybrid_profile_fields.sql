-- ==============================================================================
-- MIGRAÇÃO: SUPORTE A PERFIL HÍBRIDO (CLIENTE + PROGRAMADOR)
-- ==============================================================================
-- Permite que qualquer usuário possa comprar e vender matrizes com conta única.
-- ==============================================================================

-- 1. Novas colunas de flags e especialidades
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS is_client BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_programmer BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS client_business_type TEXT DEFAULT 'Iniciante / Hobby',
ADD COLUMN IF NOT EXISTS client_machine_brand TEXT;

-- 2. Backfill inteligente: quem já era criador ou tem skills registradas ganha is_programmer = true
UPDATE public.users
SET is_programmer = true
WHERE role = 'criador' OR (skills IS NOT NULL AND array_length(skills, 1) > 0);

-- 3. Todos são clientes por padrão (podem encomendar matrizes no mural)
UPDATE public.users
SET is_client = true
WHERE is_client IS NULL;

-- 4. Recarrega o schema do PostgREST
NOTIFY pgrst, 'reload schema';
