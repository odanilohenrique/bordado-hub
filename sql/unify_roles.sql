-- Migration: Unify User Roles
-- Description: Removes the 'role' column and constraint from users table and updates RLS policies.

-- 1. Drop dependent policies FIRST
DROP POLICY IF EXISTS "Users can view public profiles of creators" ON users;

-- 2. Remove role check constraint and column
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users DROP COLUMN IF EXISTS role;

-- 3. Create new policy allowing access to all profiles
CREATE POLICY "Anyone can view profiles" ON users
  FOR SELECT USING (true);

-- Note: Other policies in init_tables.sql relied on auth.uid() matching IDs in tables, 
-- or auth.role() which is Supabase's internal role (authenticated/anon), so they remain valid.
