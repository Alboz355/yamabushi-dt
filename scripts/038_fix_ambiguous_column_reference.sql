-- Fix the ambiguous column reference in get_all_users_admin function
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
  last_login timestamp with time zone
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
    au.last_sign_in_at as last_login
  FROM profiles p
  LEFT JOIN subscriptions s ON p.id = s.member_id AND s.status = 'active'
  LEFT JOIN (
    SELECT 
      i.member_id,
      COUNT(*) as total_invoices,
      COUNT(CASE WHEN i.status != 'paid' THEN 1 END) as unpaid_invoices
    FROM invoices i
    GROUP BY i.member_id
  ) invoice_stats ON p.id = invoice_stats.member_id
  LEFT JOIN auth.users au ON p.id = au.id
  ORDER BY p.created_at DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_all_users_admin() TO authenticated;

COMMENT ON FUNCTION get_all_users_admin() IS 'Get all users with subscription info - admin only (fixed ambiguous column reference)';
