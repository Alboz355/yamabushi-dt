-- Fix infinite recursion in RLS policies for profiles table
-- This script creates SECURITY DEFINER functions to bypass RLS and prevent recursion

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;

-- Create SECURITY DEFINER function to check if user owns profile (bypasses RLS)
CREATE OR REPLACE FUNCTION auth.user_owns_profile(profile_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = profile_id
  );
$$;

-- Create SECURITY DEFINER function to check if user is admin (bypasses RLS)
CREATE OR REPLACE FUNCTION auth.is_admin_user(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = user_id 
    AND auth.users.email IN ('admin@admin.com')
  );
$$;

-- Create simple RLS policies using SECURITY DEFINER functions
CREATE POLICY "Users can view own profile or admins can view all"
ON profiles FOR SELECT
USING (
  auth.uid() = id OR 
  auth.is_admin_user(auth.uid())
);

CREATE POLICY "Users can update own profile or admins can update all"
ON profiles FOR UPDATE
USING (
  auth.uid() = id OR 
  auth.is_admin_user(auth.uid())
);

CREATE POLICY "Authenticated users can insert their own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION auth.user_owns_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION auth.is_admin_user(uuid) TO authenticated;
