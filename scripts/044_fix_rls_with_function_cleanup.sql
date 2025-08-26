-- Fix all RLS infinite recursion errors by cleaning up existing functions and policies
-- This script addresses the "cannot change return type of existing function" error

BEGIN;

-- Drop all existing functions that might conflict
DROP FUNCTION IF EXISTS private.get_user_invoices(uuid);
DROP FUNCTION IF EXISTS private.is_admin_user(text);
DROP FUNCTION IF EXISTS private.get_user_techniques(uuid);
DROP FUNCTION IF EXISTS private.get_belt_techniques(uuid);
DROP FUNCTION IF EXISTS private.get_user_profile_safe(uuid);

-- Create private schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS private;

-- Revoke all permissions on private schema from public
REVOKE ALL ON SCHEMA private FROM public;

-- Grant usage only to postgres and service_role
GRANT USAGE ON SCHEMA private TO postgres, service_role;

-- Drop all existing problematic RLS policies
DROP POLICY IF EXISTS "Users can view their own invoices" ON invoices;
DROP POLICY IF EXISTS "Admins can view all invoices" ON invoices;
DROP POLICY IF EXISTS "Users can view their own techniques" ON member_techniques;
DROP POLICY IF EXISTS "Users can view belt techniques" ON belt_techniques;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Disable RLS temporarily to clean up
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE member_techniques DISABLE ROW LEVEL SECURITY;
ALTER TABLE belt_techniques DISABLE ROW LEVEL SECURITY;

-- Create SECURITY DEFINER functions to bypass RLS
-- Function to safely get user invoices
CREATE OR REPLACE FUNCTION private.get_user_invoices(user_id uuid)
RETURNS TABLE (
    id uuid,
    member_id uuid,
    subscription_id uuid,
    amount numeric,
    due_date date,
    status text,
    payment_method text,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.member_id,
        i.subscription_id,
        i.amount,
        i.due_date,
        i.status,
        i.payment_method,
        i.created_at,
        i.updated_at
    FROM invoices i
    WHERE i.member_id = user_id;
END;
$$;

-- Function to safely check if user is admin
CREATE OR REPLACE FUNCTION private.is_admin_user(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN user_email = 'admin@admin.com';
END;
$$;

-- Function to safely get user techniques
CREATE OR REPLACE FUNCTION private.get_user_techniques(user_id uuid)
RETURNS TABLE (
    id uuid,
    member_id uuid,
    technique_id uuid,
    mastery_level text,
    last_practiced date,
    created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mt.id,
        mt.member_id,
        mt.technique_id,
        mt.mastery_level,
        mt.last_practiced,
        mt.created_at
    FROM member_techniques mt
    WHERE mt.member_id = user_id;
END;
$$;

-- Function to safely get belt techniques
CREATE OR REPLACE FUNCTION private.get_belt_techniques(user_id uuid)
RETURNS TABLE (
    id uuid,
    name text,
    description text,
    belt_level text,
    discipline text,
    difficulty_level integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bt.id,
        bt.name,
        bt.description,
        bt.belt_level,
        bt.discipline,
        bt.difficulty_level
    FROM belt_techniques bt;
END;
$$;

-- Function to safely get user profile
CREATE OR REPLACE FUNCTION private.get_user_profile_safe(user_id uuid)
RETURNS TABLE (
    id uuid,
    email text,
    first_name text,
    last_name text,
    role text,
    membership_status text,
    join_date date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.email,
        p.first_name,
        p.last_name,
        p.role,
        p.membership_status,
        p.join_date
    FROM profiles p
    WHERE p.id = user_id;
END;
$$;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION private.get_user_invoices(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_admin_user(text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_user_techniques(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_belt_techniques(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_user_profile_safe(uuid) TO authenticated;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_techniques ENABLE ROW LEVEL SECURITY;
ALTER TABLE belt_techniques ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive RLS policies

-- Profiles policies
CREATE POLICY "Users can view their own profile simple" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles simple" ON profiles
    FOR SELECT USING (private.is_admin_user(auth.email()::text));

-- Invoices policies
CREATE POLICY "Users can view their own invoices simple" ON invoices
    FOR SELECT USING (auth.uid() = member_id);

CREATE POLICY "Admins can view all invoices simple" ON invoices
    FOR SELECT USING (private.is_admin_user(auth.email()::text));

-- Member techniques policies
CREATE POLICY "Users can view their own techniques simple" ON member_techniques
    FOR SELECT USING (auth.uid() = member_id);

CREATE POLICY "Admins can view all techniques simple" ON member_techniques
    FOR SELECT USING (private.is_admin_user(auth.email()::text));

-- Belt techniques policies (public read access)
CREATE POLICY "Anyone can view belt techniques" ON belt_techniques
    FOR SELECT USING (true);

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;
