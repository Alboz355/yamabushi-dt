-- Definitive fix for RLS infinite recursion using security definer functions
-- Fix RLS infinite recursion errors by creating security definer functions
-- Based on Supabase best practices for RLS performance

-- Create private schema for security definer functions
CREATE SCHEMA IF NOT EXISTS private;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Instructors can view their techniques" ON belt_techniques;
DROP POLICY IF EXISTS "Users can view their progress" ON member_techniques;

-- Create security definer function to check if user can access their own profile
CREATE OR REPLACE FUNCTION private.can_access_own_profile(profile_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (SELECT auth.uid()) = profile_user_id;
END;
$$;

-- Create security definer function to check if user is admin
CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check hardcoded admin first
  IF (SELECT auth.email()) = 'admin@admin.com' THEN
    RETURN true;
  END IF;
  
  -- Check database role
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = (SELECT auth.uid()) 
    AND role = 'admin'
  );
END;
$$;

-- Create security definer function to check if user is instructor
CREATE OR REPLACE FUNCTION private.is_instructor()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = (SELECT auth.uid()) 
    AND role = 'instructor'
  );
END;
$$;

-- Create security definer function to check if user can access specific member data
CREATE OR REPLACE FUNCTION private.can_access_member_data(member_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- User can access their own data
  IF (SELECT auth.uid()) = member_user_id THEN
    RETURN true;
  END IF;
  
  -- Admins can access all data
  IF (SELECT private.is_admin()) THEN
    RETURN true;
  END IF;
  
  -- Instructors can access student data
  IF (SELECT private.is_instructor()) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Create new simple RLS policies using security definer functions

-- Profiles table policies
CREATE POLICY "profiles_select_policy" ON profiles
  FOR SELECT TO authenticated
  USING ((SELECT private.can_access_own_profile(id)) OR (SELECT private.is_admin()));

CREATE POLICY "profiles_update_policy" ON profiles
  FOR UPDATE TO authenticated
  USING ((SELECT private.can_access_own_profile(id)) OR (SELECT private.is_admin()));

-- Invoices table policies
CREATE POLICY "invoices_select_policy" ON invoices
  FOR SELECT TO authenticated
  USING ((SELECT private.can_access_member_data(member_id)));

-- Subscriptions table policies
CREATE POLICY "subscriptions_select_policy" ON subscriptions
  FOR SELECT TO authenticated
  USING ((SELECT private.can_access_member_data(member_id)));

CREATE POLICY "subscriptions_insert_policy" ON subscriptions
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.is_admin()));

CREATE POLICY "subscriptions_update_policy" ON subscriptions
  FOR UPDATE TO authenticated
  USING ((SELECT private.is_admin()));

CREATE POLICY "subscriptions_delete_policy" ON subscriptions
  FOR DELETE TO authenticated
  USING ((SELECT private.is_admin()));

-- Belt techniques table policies
CREATE POLICY "belt_techniques_select_policy" ON belt_techniques
  FOR SELECT TO authenticated
  USING (true); -- All authenticated users can view techniques

-- Member techniques table policies
CREATE POLICY "member_techniques_select_policy" ON member_techniques
  FOR SELECT TO authenticated
  USING ((SELECT private.can_access_member_data(member_id)));

CREATE POLICY "member_techniques_insert_policy" ON member_techniques
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.can_access_member_data(member_id)));

CREATE POLICY "member_techniques_update_policy" ON member_techniques
  FOR UPDATE TO authenticated
  USING ((SELECT private.can_access_member_data(member_id)));

-- Instructors table policies
CREATE POLICY "instructors_select_policy" ON instructors
  FOR SELECT TO authenticated
  USING ((SELECT private.is_admin()) OR (SELECT auth.uid()) = profile_id);

CREATE POLICY "instructors_insert_policy" ON instructors
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.is_admin()));

CREATE POLICY "instructors_delete_policy" ON instructors
  FOR DELETE TO authenticated
  USING ((SELECT private.is_admin()));

-- Help requests table policies
CREATE POLICY "help_requests_select_policy" ON help_requests
  FOR SELECT TO authenticated
  USING ((SELECT private.is_admin()) OR user_email = (SELECT auth.email()));

CREATE POLICY "help_requests_insert_policy" ON help_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_email = (SELECT auth.email()));

-- Grant necessary permissions
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO authenticated;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'RLS infinite recursion fix completed successfully';
END $$;
