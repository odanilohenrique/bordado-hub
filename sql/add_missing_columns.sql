-- ==========================================
-- SCRIPT DE CORREÇÃO: ADICIONAR COLUNAS QUE FALTARAM
-- ==========================================

-- 1. Adiciona os campos de contraproposta para o cliente e produtor negociarem
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS counter_amount NUMERIC;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS counter_message TEXT;

-- 2. Adiciona o campo de Tamanho da Matriz na criação do pedido
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS dimensions TEXT;

-- 3. Atualiza o cache do Supabase para ele reconhecer as novas colunas
NOTIFY pgrst, 'reload schema';
