-- ==========================================
-- SUPORTE A KITS E MÚLTIPLAS MATRIZES
-- ==========================================

-- 1. Adiciona coluna order_type ('individual' ou 'kit')
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'individual';

-- 2. Adiciona coluna items_count (quantidade de matrizes no pedido)
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS items_count INTEGER DEFAULT 1;

-- 3. Atualiza o cache do Supabase PostgREST
NOTIFY pgrst, 'reload schema';
