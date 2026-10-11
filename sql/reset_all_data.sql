-- ==========================================
-- SCRIPT DE RESET COMPLETO (LIMPAR TUDO DO ZERO)
-- BordadoHUB — versão atualizada com todas as tabelas
-- ==========================================
-- ⚠️  ATENÇÃO: Este script apaga TODOS os dados.
-- Execute APENAS em ambiente de testes. Não há como desfazer.

-- 1. Limpar tabelas de dados (em ordem para respeitar FK)
TRUNCATE TABLE
  reviews,
  notifications,
  proposal_messages,
  messages,
  deliveries,
  transactions,
  proposals,
  jobs,
  users
RESTART IDENTITY CASCADE;

-- 2. Limpar usuários do Supabase Auth
DELETE FROM auth.users;

-- 3. Limpar arquivos de storage (avatars + portfolio no mesmo bucket)
DELETE FROM storage.objects WHERE bucket_id = 'avatars';
DELETE FROM storage.objects WHERE bucket_id = 'portfolio';
DELETE FROM storage.objects WHERE bucket_id = 'job-deliveries';

-- 4. Garantir estrutura atualizada com os campos do Asaas/PIX
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

-- 5. Re-garantir permissões de service_role em todas as tabelas
GRANT ALL ON TABLE
  users, jobs, proposals, transactions, deliveries,
  messages, proposal_messages, notifications, reviews
TO service_role;
