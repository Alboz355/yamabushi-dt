-- Fix infinite recursion detected in policy for relation "profiles" when querying invoices
-- This script removes problematic RLS policies and creates SECURITY DEFINER functions to bypass RLS

-- Drop existing problematic policies on invoices table
DROP POLICY IF EXISTS "Users can view their own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can insert their own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can update their own invoices" ON invoices;
DROP POLICY IF EXISTS "Admins can view all invoices" ON invoices;
DROP POLICY IF EXISTS "Admins can manage all invoices" ON invoices;

-- Create a secure schema for bypass functions (not exposed to API)
CREATE SCHEMA IF NOT EXISTS private;

-- Create SECURITY DEFINER function to get user invoices without RLS recursion
CREATE OR REPLACE FUNCTION private.get_user_invoices(user_id uuid)
RETURNS TABLE (
    id uuid,
    member_id uuid,
    subscription_id uuid,
    amount numeric,
    due_date date,
    status text,
    payment_method text,
    month integer,
    year integer,
    notes text,
    paid_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- This function bypasses RLS to avoid infinite recursion
    RETURN QUERY
    SELECT 
        i.id,
        i.member_id,
        i.subscription_id,
        i.amount,
        i.due_date,
        i.status,
        i.payment_method,
        i.month,
        i.year,
        i.notes,
        i.paid_at,
        i.created_at,
        i.updated_at
    FROM invoices i
    WHERE i.member_id = user_id
    ORDER BY i.due_date DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION private.get_user_invoices(uuid) TO authenticated;

-- Create simple RLS policies that don't reference other tables
CREATE POLICY "Users can view their own invoices via function" ON invoices
    FOR SELECT
    TO authenticated
    USING (member_id = auth.uid());

CREATE POLICY "Service role can manage all invoices" ON invoices
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Create SECURITY DEFINER function to check if user is admin without RLS recursion
CREATE OR REPLACE FUNCTION private.is_user_admin(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if user is admin by email (hardcoded admin emails)
    RETURN user_email IN ('admin@admin.com', 'admin@yamabushi.com');
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION private.is_user_admin(text) TO authenticated;

-- Create admin policy using the secure function
CREATE POLICY "Admins can manage all invoices via function" ON invoices
    FOR ALL
    TO authenticated
    USING (private.is_user_admin(auth.jwt() ->> 'email'))
    WITH CHECK (private.is_user_admin(auth.jwt() ->> 'email'));

-- Ensure RLS is enabled on invoices table
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_member_id ON invoices(member_id);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- Refresh the schema cache to apply changes
NOTIFY pgrst, 'reload schema';

-- Log the completion
DO $$
BEGIN
    RAISE NOTICE 'Successfully fixed RLS infinite recursion on invoices table';
END $$;
