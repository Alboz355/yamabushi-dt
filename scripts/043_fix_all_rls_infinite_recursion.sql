-- Fix all RLS infinite recursion issues across the application
-- This script removes problematic policies and creates SECURITY DEFINER functions

-- Create private schema for secure functions
CREATE SCHEMA IF NOT EXISTS private;

-- Drop all existing problematic RLS policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can view their own techniques" ON belt_techniques;
DROP POLICY IF EXISTS "Users can view their own member techniques" ON member_techniques;

-- Create SECURITY DEFINER function to get user profile safely
CREATE OR REPLACE FUNCTION private.get_user_profile(user_id uuid)
RETURNS TABLE (
  id uuid,
  email text,
  first_name text,
  last_name text,
  membership_type text,
  membership_status text,
  join_date date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.email, p.first_name, p.last_name, p.membership_type, p.membership_status, p.join_date
  FROM profiles p
  WHERE p.id = user_id;
END;
$$;

-- Create SECURITY DEFINER function to get user subscription safely
CREATE OR REPLACE FUNCTION private.get_user_subscription(user_id uuid)
RETURNS TABLE (
  id uuid,
  member_id uuid,
  plan_type text,
  price integer,
  status text,
  start_date date,
  end_date date,
  auto_renew boolean,
  payment_method text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.member_id, s.plan_type, s.price, s.status, s.start_date, s.end_date, s.auto_renew, s.payment_method
  FROM subscriptions s
  WHERE s.member_id = user_id AND s.status = 'active';
END;
$$;

-- Create SECURITY DEFINER function to get user invoices safely
CREATE OR REPLACE FUNCTION private.get_user_invoices(user_id uuid)
RETURNS TABLE (
  id uuid,
  member_id uuid,
  subscription_id uuid,
  amount integer,
  due_date date,
  status text,
  month integer,
  year integer,
  created_at timestamptz,
  updated_at timestamptz,
  paid_at timestamptz,
  payment_method text,
  notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT i.id, i.member_id, i.subscription_id, i.amount, i.due_date, i.status, i.month, i.year, 
         i.created_at, i.updated_at, i.paid_at, i.payment_method, i.notes
  FROM invoices i
  WHERE i.member_id = user_id
  ORDER BY i.due_date DESC;
END;
$$;

-- Create simple RLS policies that don't cause recursion
CREATE POLICY "Enable read access for own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Enable update access for own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Enable read access for own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = member_id);

CREATE POLICY "Enable read access for own invoices" ON invoices
  FOR SELECT USING (auth.uid() = member_id);

-- Grant execute permissions on private functions to authenticated users
GRANT EXECUTE ON FUNCTION private.get_user_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_user_subscription(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_user_invoices(uuid) TO authenticated;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
