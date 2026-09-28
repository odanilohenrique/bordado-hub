-- ==============================================================================
-- BUCKET & POLÍTICAS DE ARMAZENAMENTO PARA ANEXOS DO CHAT DE NEGOCIAÇÃO
-- ==============================================================================

-- 1. Garante que o bucket 'proposal_attachments' exista e seja público
INSERT INTO storage.buckets (id, name, public)
VALUES ('proposal_attachments', 'proposal_attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Permite leitura pública de qualquer anexo do chat
CREATE POLICY "Proposal attachments are public"
ON storage.objects FOR SELECT
USING ( bucket_id = 'proposal_attachments' );

-- 3. Permite que usuários autenticados façam upload de anexos no chat
CREATE POLICY "Authenticated users can upload chat attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'proposal_attachments' 
  AND auth.role() = 'authenticated'
);

-- 4. Notifica atualização do schema do Supabase
NOTIFY pgrst, 'reload schema';
