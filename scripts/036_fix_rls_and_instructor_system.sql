-- Fix RLS infinite recursion and instructor system
-- This script handles existing policies and creates a complete solution

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "simple_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "simple_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "simple_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "simple_delete_policy" ON public.profiles;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS public.get_user_role_bypass_rls(uuid);
DROP FUNCTION IF EXISTS public.safe_update_user_role(uuid, text);

-- Create a private schema for RLS bypass functions
CREATE SCHEMA IF NOT EXISTS private;

-- Create SECURITY DEFINER function to bypass RLS for role checking
CREATE OR REPLACE FUNCTION private.get_user_role_bypass_rls(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role text;
BEGIN
    SELECT role INTO user_role FROM public.profiles WHERE id = user_id;
    RETURN COALESCE(user_role, 'user');
END;
$$;

-- Create SECURITY DEFINER function to safely update user roles
CREATE OR REPLACE FUNCTION private.safe_update_user_role(user_id uuid, new_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.profiles SET role = new_role WHERE id = user_id;
    RETURN FOUND;
END;
$$;

-- Create simple RLS policies that don't cause recursion
CREATE POLICY "allow_own_profile_select" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "allow_own_profile_update" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "allow_service_role_all" ON public.profiles
    FOR ALL USING (auth.role() = 'service_role');

-- Grant necessary permissions
GRANT USAGE ON SCHEMA private TO service_role;
GRANT EXECUTE ON FUNCTION private.get_user_role_bypass_rls(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION private.safe_update_user_role(uuid, text) TO service_role;

-- Ensure admin profile exists
INSERT INTO public.profiles (id, email, role, created_at, updated_at)
SELECT 
    '00000000-0000-0000-0000-000000000000'::uuid,
    'admin@admin.com',
    'admin',
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE email = 'admin@admin.com'
);

-- Create instructor demotion function
CREATE OR REPLACE FUNCTION private.demote_instructor(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Update role to user
    UPDATE public.profiles SET role = 'user' WHERE id = user_id;
    
    -- Remove from instructors table
    DELETE FROM public.instructors WHERE profile_id = user_id;
    
    RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION private.demote_instructor(uuid) TO service_role;
