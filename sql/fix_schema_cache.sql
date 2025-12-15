-- Force PostgREST to reload the schema cache
-- Run this in the Supabase SQL Editor to fix "Could not find column in schema cache" errors

NOTIFY pgrst, 'reload config';
