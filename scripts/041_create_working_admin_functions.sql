-- Creating completely new admin functions that work with the actual database schema
-- Drop any existing problematic functions
DROP FUNCTION IF EXISTS get_all_users_admin();
DROP FUNCTION IF EXISTS get_user_invoices_admin(uuid);
DROP FUNCTION IF EXISTS refund_invoice_admin(uuid);
DROP FUNCTION IF EXISTS cancel_invoice_admin(uuid);

-- Create function to get all users with their subscription and invoice info
CREATE OR REPLACE FUNCTION get_all_users_admin()
RETURNS TABLE (
    id uuid,
    email text,
    first_name text,
    last_name text,
    role text,
    membership_status text,
    subscription_tier text,
    subscription_expires_at date,
    created_at timestamp with time zone,
    join_date date,
    phone text,
    active_subscription_id uuid,
    subscription_status text,
    subscription_plan_type text,
    subscription_start_date date,
    subscription_end_date date,
    total_invoices bigint,
    unpaid_invoices bigint,
    current_month_paid boolean,
    last_payment_date timestamp with time zone
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        p.id,
        p.email,
        p.first_name,
        p.last_name,
        p.role,
        p.membership_status,
        p.subscription_tier,
        p.subscription_expires_at,
        p.created_at,
        p.join_date,
        p.phone,
        s.id as active_subscription_id,
        s.status as subscription_status,
        s.plan_type as subscription_plan_type,
        s.start_date as subscription_start_date,
        s.end_date as subscription_end_date,
        COALESCE(inv_stats.total_invoices, 0) as total_invoices,
        COALESCE(inv_stats.unpaid_invoices, 0) as unpaid_invoices,
        COALESCE(current_month.is_paid, false) as current_month_paid,
        inv_stats.last_payment_date
    FROM profiles p
    LEFT JOIN subscriptions s ON p.id = s.member_id AND s.status = 'active'
    LEFT JOIN (
        SELECT 
            member_id,
            COUNT(*) as total_invoices,
            COUNT(CASE WHEN status != 'paid' THEN 1 END) as unpaid_invoices,
            MAX(paid_at) as last_payment_date
        FROM invoices 
        GROUP BY member_id
    ) inv_stats ON p.id = inv_stats.member_id
    LEFT JOIN (
        SELECT 
            member_id,
            CASE WHEN COUNT(CASE WHEN status = 'paid' THEN 1 END) > 0 THEN true ELSE false END as is_paid
        FROM invoices 
        WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)::integer 
        AND month = EXTRACT(MONTH FROM CURRENT_DATE)::integer
        GROUP BY member_id
    ) current_month ON p.id = current_month.member_id
    ORDER BY p.created_at DESC;
END;
$$;

-- Create function to get user invoices
CREATE OR REPLACE FUNCTION get_user_invoices_admin(user_id uuid)
RETURNS TABLE (
    id uuid,
    amount numeric,
    status text,
    due_date date,
    paid_at timestamp with time zone,
    created_at timestamp with time zone,
    year integer,
    month integer,
    payment_method text,
    notes text,
    subscription_id uuid
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.amount,
        i.status,
        i.due_date,
        i.paid_at,
        i.created_at,
        i.year,
        i.month,
        i.payment_method,
        i.notes,
        i.subscription_id
    FROM invoices i
    WHERE i.member_id = user_id
    ORDER BY i.created_at DESC;
END;
$$;

-- Create function to refund an invoice
CREATE OR REPLACE FUNCTION refund_invoice_admin(invoice_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE invoices 
    SET 
        status = 'refunded',
        updated_at = NOW(),
        notes = COALESCE(notes, '') || ' - Remboursé par admin le ' || NOW()::date
    WHERE id = invoice_id AND status = 'paid';
    
    RETURN FOUND;
END;
$$;

-- Create function to cancel an invoice
CREATE OR REPLACE FUNCTION cancel_invoice_admin(invoice_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE invoices 
    SET 
        status = 'cancelled',
        updated_at = NOW(),
        notes = COALESCE(notes, '') || ' - Annulé par admin le ' || NOW()::date
    WHERE id = invoice_id AND status != 'paid';
    
    RETURN FOUND;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_all_users_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_invoices_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION refund_invoice_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_invoice_admin(uuid) TO authenticated;
