-- 1. Criação da tabela oficial de convites
CREATE TABLE IF NOT EXISTS public.invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    used_at TIMESTAMPTZ,
    used_by TEXT,
    max_uses INT DEFAULT 1,
    current_uses INT DEFAULT 0,
    active BOOLEAN DEFAULT TRUE
);

-- 2. Habilita segurança RLS e leitura pública
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura de convites para validação" 
ON public.invites 
FOR SELECT 
USING (true);

-- 3. Insere os convites oficiais iniciais para programadores VIP
INSERT INTO public.invites (code, max_uses, current_uses, active)
VALUES 
    ('PROGRAMADOR-TOP', 5, 0, true),
    ('VIP-BORDADO', 1, 0, true)
ON CONFLICT (code) DO NOTHING;
