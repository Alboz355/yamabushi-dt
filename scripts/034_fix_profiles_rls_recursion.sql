-- Fix infinite recursion in profiles RLS policies
-- Drop all existing policies that might cause recursion
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON profiles;
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;

-- Create simple, non-recursive RLS policies
CREATE POLICY "profiles_select_policy" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert_policy" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_policy" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Fixed column names to match actual profiles table schema
-- Insert/Update the admin profile directly
INSERT INTO profiles (id, email, role, first_name, last_name, created_at, updated_at)
VALUES (
    '632d7f0e-2708-4e55-b7ad-1d7ce96a5006',
    'admin@admin.com',
    'admin',
    'Admin',
    'User',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    email = 'admin@admin.com',
    first_name = 'Admin',
    last_name = 'User',
    updated_at = NOW();

-- Updated SELECT query to use correct column names
-- Verify the admin profile exists
SELECT id, email, role, first_name, last_name FROM profiles WHERE email = 'admin@admin.com';
