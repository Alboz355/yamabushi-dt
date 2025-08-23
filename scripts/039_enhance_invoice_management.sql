-- Enhanced invoice management functions for admin
-- Add monthly payment status and refund functionality

-- Function to get current month payment status for a user
CREATE OR REPLACE FUNCTION get_current_month_payment_status(user_uuid UUID)
RETURNS TABLE (
  has_current_month_invoice BOOLEAN,
  current_month_paid BOOLEAN,
  current_month_amount NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_month INTEGER := EXTRACT(MONTH FROM CURRENT_DATE);
  current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) > 0 as has_current_month_invoice,
    COUNT(CASE WHEN i.status = 'paid' THEN 1 END) > 0 as current_month_paid,
    COALESCE(SUM(i.amount), 0) as current_month_amount
  FROM invoices i
  WHERE i.member_id = user_uuid 
    AND i.month = current_month 
    AND i.year = current_year;
END;
$$;

-- Enhanced function to get all users with monthly payment status
CREATE OR REPLACE FUNCTION get_all_users_admin_enhanced()
RETURNS TABLE (
  id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  membership_status TEXT,
  subscription_tier TEXT,
  subscription_expires_at DATE,
  role TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  join_date DATE,
  has_active_subscription BOOLEAN,
  total_invoices BIGINT,
  unpaid_invoices BIGINT,
  last_login TIMESTAMP WITH TIME ZONE,
  has_current_month_invoice BOOLEAN,
  current_month_paid BOOLEAN,
  current_month_amount NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.phone,
    p.membership_status,
    p.subscription_tier,
    p.subscription_expires_at,
    COALESCE(p.role, 'user') as role,
    p.created_at,
    p.join_date,
    CASE 
      WHEN s.status = 'active' AND s.end_date >= CURRENT_DATE THEN true
      ELSE false
    END as has_active_subscription,
    COALESCE(invoice_counts.total_invoices, 0) as total_invoices,
    COALESCE(invoice_counts.unpaid_invoices, 0) as unpaid_invoices,
    au.last_sign_in_at as last_login,
    COALESCE(monthly_status.has_current_month_invoice, false) as has_current_month_invoice,
    COALESCE(monthly_status.current_month_paid, false) as current_month_paid,
    COALESCE(monthly_status.current_month_amount, 0) as current_month_amount
  FROM profiles p
  LEFT JOIN auth.users au ON p.id = au.id
  LEFT JOIN subscriptions s ON p.id = s.member_id AND s.status = 'active'
  LEFT JOIN (
    SELECT 
      i.member_id,
      COUNT(*) as total_invoices,
      COUNT(CASE WHEN i.status IN ('pending', 'overdue') THEN 1 END) as unpaid_invoices
    FROM invoices i
    GROUP BY i.member_id
  ) invoice_counts ON p.id = invoice_counts.member_id
  LEFT JOIN LATERAL get_current_month_payment_status(p.id) monthly_status ON true
  ORDER BY p.created_at DESC;
END;
$$;

-- Function to refund a paid invoice
CREATE OR REPLACE FUNCTION refund_invoice_admin(invoice_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invoice_status TEXT;
BEGIN
  -- Check if invoice exists and is paid
  SELECT status INTO invoice_status
  FROM invoices
  WHERE id = invoice_uuid;
  
  IF invoice_status IS NULL THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;
  
  IF invoice_status != 'paid' THEN
    RAISE EXCEPTION 'Only paid invoices can be refunded';
  END IF;
  
  -- Update invoice status to refunded
  UPDATE invoices 
  SET 
    status = 'refunded',
    updated_at = NOW(),
    notes = COALESCE(notes, '') || ' - Refunded by admin on ' || NOW()::TEXT
  WHERE id = invoice_uuid;
  
  RETURN true;
END;
$$;

-- Enhanced cancel invoice function
CREATE OR REPLACE FUNCTION cancel_invoice_admin(invoice_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invoice_status TEXT;
BEGIN
  -- Check if invoice exists
  SELECT status INTO invoice_status
  FROM invoices
  WHERE id = invoice_uuid;
  
  IF invoice_status IS NULL THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;
  
  IF invoice_status = 'paid' THEN
    RAISE EXCEPTION 'Cannot cancel a paid invoice. Use refund instead.';
  END IF;
  
  -- Update invoice status to cancelled
  UPDATE invoices 
  SET 
    status = 'cancelled',
    updated_at = NOW(),
    notes = COALESCE(notes, '') || ' - Cancelled by admin on ' || NOW()::TEXT
  WHERE id = invoice_uuid;
  
  RETURN true;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_current_month_payment_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_users_admin_enhanced() TO authenticated;
GRANT EXECUTE ON FUNCTION refund_invoice_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_invoice_admin(UUID) TO authenticated;
