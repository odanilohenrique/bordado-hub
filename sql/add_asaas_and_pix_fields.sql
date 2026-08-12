-- Migration to add Asaas & PIX payout fields

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
