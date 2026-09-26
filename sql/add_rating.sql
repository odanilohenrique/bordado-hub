-- ==========================================
-- SCRIPT DE CORREÇÃO: ADICIONAR RATING NA TABELA USERS
-- ==========================================

-- Adiciona a coluna rating à tabela users (se não existir) com valor padrão 5.0
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS rating NUMERIC(3, 2) DEFAULT 5.00;

-- Força o recarregamento do Cache de Esquema do Supabase PostgREST
NOTIFY pgrst, 'reload schema';
