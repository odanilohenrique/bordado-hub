-- ==========================================
-- SCRIPT DE CORREÇÃO: CRIAR TABELA DE MENSAGENS E BUCKET
-- ==========================================

-- 1. Cria a tabela de mensagens da negociação
CREATE TABLE IF NOT EXISTS public.proposal_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT,
    attachment_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Permissões de RLS para a tabela de mensagens (liberado para testes)
ALTER TABLE public.proposal_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for users" ON public.proposal_messages FOR ALL USING (true);

-- 3. Garante permissão ao service_role
GRANT ALL ON TABLE public.proposal_messages TO service_role;

-- 4. Cria o bucket para anexos do chat (se não existir)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('proposal_attachments', 'proposal_attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Atualiza o cache do Supabase
NOTIFY pgrst, 'reload schema';
