-- Definitive fix for user duplicates and invoice issues

-- Drop all existing functions with any parameter variations to avoid conflicts
DROP FUNCTION IF EXISTS get_all_users_admin();
DROP FUNCTION IF EXISTS get_user_invoices_admin(uuid);
DROP FUNCTION IF EXISTS refund_invoice_admin(uuid);
DROP FUNCTION IF EXISTS cancel_invoice_admin(uuid);

-- Create improved function to get all users without duplicates
CREATE OR REPLACE FUNCTION get_all_users_admin()
RETURNS TABLE (
  id uuid,
  email text,
  first_name text,
  last_name text,
  phone text,
  membership_status text,
  subscription_tier text,
  subscription_expires_at date,
  role text,
  created_at timestamp with time zone,
  join_date date,
  has_active_subscription boolean,
  total_invoices bigint,
  unpaid_invoices bigint,
  last_login timestamp with time zone,
  monthly_payment_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the current user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  SELECT DISTINCT ON (p.id)
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.phone,
    p.membership_status,
    p.subscription_tier,
    p.subscription_expires_at,
    p.role,
    p.created_at,
    p.join_date,
    CASE 
      WHEN s.status = 'active' AND s.end_date > CURRENT_DATE THEN true 
      ELSE false 
    END as has_active_subscription,
    COALESCE(invoice_stats.total_invoices, 0) as total_invoices,
    COALESCE(invoice_stats.unpaid_invoices, 0) as unpaid_invoices,
    au.last_sign_in_at as last_login,
    CASE 
      WHEN monthly_invoice.status = 'paid' THEN 'Payé'
      WHEN monthly_invoice.status IS NOT NULL THEN 'Impayé'
      ELSE 'Aucune facture'
    END as monthly_payment_status
  FROM profiles p
  LEFT JOIN subscriptions s ON p.id = s.member_id AND s.status = 'active'
  LEFT JOIN (
    SELECT 
      inv.member_id,
      COUNT(*) as total_invoices,
      COUNT(CASE WHEN inv.status != 'paid' THEN 1 END) as unpaid_invoices
    FROM invoices inv
    GROUP BY inv.member_id
  ) invoice_stats ON p.id = invoice_stats.member_id
  LEFT JOIN auth.users au ON p.id = au.id
  LEFT JOIN (
    SELECT DISTINCT ON (inv_monthly.member_id)
      inv_monthly.member_id,
      inv_monthly.status
    FROM invoices inv_monthly
    WHERE DATE_TRUNC('month', inv_monthly.created_at) = DATE_TRUNC('month', CURRENT_DATE)
    ORDER BY inv_monthly.member_id, inv_monthly.created_at DESC
  ) monthly_invoice ON p.id = monthly_invoice.member_id
  ORDER BY p.id, p.created_at DESC;
END;
$$;

-- Create function to get user invoices with proper filtering
CREATE OR REPLACE FUNCTION get_user_invoices_admin(user_id uuid)
RETURNS TABLE (
  id uuid,
  amount numeric,
  status text,
  created_at timestamp with time zone,
  due_date date,
  description text,
  subscription_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the current user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  SELECT 
    i.id,
    i.amount,
    i.status,
    i.created_at,
    i.due_date,
    i.description,
    COALESCE(s.tier, 'Unknown') as subscription_type
  FROM invoices i
  LEFT JOIN subscriptions s ON i.member_id = s.member_id
  WHERE i.member_id = user_id
  ORDER BY i.created_at DESC;
END;
$$;

-- Create function to refund invoice
CREATE OR REPLACE FUNCTION refund_invoice_admin(invoice_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the current user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  -- Update invoice status to refunded
  UPDATE invoices 
  SET 
    status = 'refunded',
    updated_at = NOW()
  WHERE id = invoice_id AND status = 'paid';

  -- Return true if update was successful
  RETURN FOUND;
END;
$$;

-- Create function to cancel invoice
CREATE OR REPLACE FUNCTION cancel_invoice_admin(invoice_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the current user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  -- Update invoice status to cancelled
  UPDATE invoices 
  SET 
    status = 'cancelled',
    updated_at = NOW()
  WHERE id = invoice_id AND status != 'paid';

  -- Return true if update was successful
  RETURN FOUND;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_all_users_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_invoices_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION refund_invoice_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_invoice_admin(uuid) TO authenticated;

-- Add comments
COMMENT ON FUNCTION get_all_users_admin() IS 'Get all users without duplicates with monthly payment status - admin only';
COMMENT ON FUNCTION get_user_invoices_admin(uuid) IS 'Get all invoices for a specific user - admin only';
COMMENT ON FUNCTION refund_invoice_admin(uuid) IS 'Refund a paid invoice - admin only';
COMMENT ON FUNCTION cancel_invoice_admin(uuid) IS 'Cancel an unpaid invoice - admin only';
