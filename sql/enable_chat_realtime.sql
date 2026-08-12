-- Habilita o Realtime para o Chat Privado
-- Necessário para que as mensagens cheguem sem recarregar a página
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'proposal_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE proposal_messages;
  END IF;
END $$;
