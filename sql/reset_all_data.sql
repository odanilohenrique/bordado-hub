-- ==========================================
-- SCRIPT DE RESET COMPLETO (LIMPAR TUDO DO ZERO)
-- ==========================================
-- ATENÇÃO: Este script apaga todos os dados de testes
-- (usuários, autenticação, pedidos, propostas, mensagens e transações)
-- para que você possa começar os testes 100% do zero.

-- 1. Limpar tabelas da aplicação
TRUNCATE TABLE messages, deliveries, transactions, proposals, jobs, users RESTART IDENTITY CASCADE;

-- 2. Limpar usuários do Supabase Auth
DELETE FROM auth.users;

-- 3. Garantir estrutura atualizada com os campos do Asaas/PIX
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT,
ADD COLUMN IF NOT EXISTS pix_key TEXT,
ADD COLUMN IF NOT EXISTS pix_key_type TEXT CHECK (pix_key_type IN ('cpf', 'cnpj', 'email', 'phone', 'random'));

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS asaas_payment_id TEXT,
ADD COLUMN IF NOT EXISTS pix_qr_code TEXT,
ADD COLUMN IF NOT EXISTS pix_copy_paste TEXT,
ADD COLUMN IF NOT EXISTS pix_expiration TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS asaas_transfer_id TEXT;

-- 4. Re-garantir permissões de service_role
GRANT ALL ON TABLE users, jobs, proposals, transactions, deliveries, messages TO service_role;
