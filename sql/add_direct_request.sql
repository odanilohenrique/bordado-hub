-- Add Direct Request Feature
-- Allows clients to create jobs targeted at a specific programmer

-- Add column for direct targeting
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS direct_to_programmer_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_jobs_direct_to_programmer 
ON jobs(direct_to_programmer_id) 
WHERE direct_to_programmer_id IS NOT NULL;

-- Comment
COMMENT ON COLUMN jobs.direct_to_programmer_id IS 'If set, this job is a direct request to a specific programmer and should not appear in the public job board.';
