-- ==============================================================================
-- HABILITAR REALTIME COMPLETO PARA CHAT DE NEGOCIAÇÃO
-- ==============================================================================

-- 1. Garante réplica completa para enviar todas as colunas no evento Realtime
ALTER TABLE public.proposal_messages REPLICA IDENTITY FULL;

-- 2. Adiciona a tabela à publicação supabase_realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'proposal_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.proposal_messages;
  END IF;
END $$;

-- 3. Notifica recarregamento do schema
NOTIFY pgrst, 'reload schema';
