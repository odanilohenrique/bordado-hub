-- FORCE COMPREHENSIVE FIX for 'Could not find column in schema cache'
-- Run this entire script in the Supabase SQL Editor

-- 1. Ensure the column exists (Idempotent)
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS direct_to_programmer_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- 2. Create the Index (Idempotent)
CREATE INDEX IF NOT EXISTS idx_jobs_direct_to_programmer 
ON jobs(direct_to_programmer_id) 
WHERE direct_to_programmer_id IS NOT NULL;

-- 3. FORCE Schema Cache Refresh by modifying a comment (Triggers schema change event)
COMMENT ON TABLE jobs IS 'Jobs table - Updated schema cache at ' || to_char(now(), 'YYYY-MM-DD HH24:MI:SS');

-- 4. Explicitly notify PostgREST
NOTIFY pgrst, 'reload config';

-- 5. Grant permissions (Just to be safe for RLS/API visibility)
GRANT ALL ON TABLE jobs TO authenticated;
GRANT ALL ON TABLE jobs TO service_role;

-- 6. Verification Query (Check the Results tab!)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'jobs' 
AND column_name = 'direct_to_programmer_id';
