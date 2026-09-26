-- ==========================================
-- SCRIPT DE CORREÇÃO: ADICIONAR COLUNA READ NAS MENSAGENS
-- ==========================================

-- 1. Adiciona a coluna read se ela não existir
ALTER TABLE public.proposal_messages ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT false;

-- 2. Atualiza o cache do Supabase
NOTIFY pgrst, 'reload schema';
