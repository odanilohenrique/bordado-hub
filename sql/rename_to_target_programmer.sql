-- RENAME COLUMN FIX
-- Changing column name to 'target_programmer_id' to bypass persistent schema cache issues

-- 1. Drop the old column if it exists (Cleaning up)
ALTER TABLE jobs DROP COLUMN IF EXISTS direct_to_programmer_id;

-- 2. Add the NEW column with a different name
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS target_programmer_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- 3. Create Index
CREATE INDEX IF NOT EXISTS idx_jobs_target_programmer 
ON jobs(target_programmer_id) 
WHERE target_programmer_id IS NOT NULL;

-- 4. Force Cache Reload (Just in case)
NOTIFY pgrst, 'reload config';

-- 5. Verify
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'jobs' 
AND column_name = 'target_programmer_id';
