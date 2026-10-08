-- Enable Realtime for the jobs table so that status changes
-- (e.g. 'aberto' -> 'em_progresso' after payment) are broadcast
-- to all connected clients viewing /jobs/[id].
-- Run this in the Supabase SQL Editor.

-- REPLICA IDENTITY FULL is required so UPDATE events include old + new row data
ALTER TABLE public.jobs REPLICA IDENTITY FULL;

-- Add jobs to the realtime publication (idempotent check)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'jobs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
  END IF;
END $$;
