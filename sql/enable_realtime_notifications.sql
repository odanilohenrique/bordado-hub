-- Ensure Realtime is enabled for notifications
-- Check if table is in the publication, and add it if not.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;

-- Also ensure Replica Identity is FULL to allow filtering on multiple columns if needed (though not strictly required for just INSERT)
ALTER TABLE notifications REPLICA IDENTITY FULL;
