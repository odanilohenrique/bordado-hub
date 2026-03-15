-- FIX PERMISSIONS for 'target_programmer_id'
-- Sometimes columns are hidden if permissions aren't explicitly refreshed

-- 1. Grant explicit permissions to the authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE jobs TO authenticated;
GRANT SELECT ON TABLE jobs TO anon;

-- 2. Force refresh constraint cache
NOTIFY pgrst, 'reload config';

-- 3. Check if the column exists and is visible (Run this part to see output)
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable 
FROM 
    information_schema.columns 
WHERE 
    table_name = 'jobs' 
    AND column_name = 'target_programmer_id';
