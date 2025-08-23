-- Creating RPC functions for message retrieval and fixing RLS policies for message visibility
-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_messages_with_comments();
DROP FUNCTION IF EXISTS get_message_comments(uuid);

-- Create function to get messages with comment counts (visible to all users)
CREATE OR REPLACE FUNCTION get_messages_with_comments()
RETURNS TABLE (
  id uuid,
  title text,
  message text,
  message_type text,
  priority integer,
  is_active boolean,
  expires_at timestamp with time zone,
  created_at timestamp with time zone,
  comment_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    am.id,
    am.title,
    am.message,
    am.message_type,
    am.priority,
    am.is_active,
    am.expires_at,
    am.created_at,
    COALESCE(comment_counts.comment_count, 0) as comment_count
  FROM admin_messages am
  LEFT JOIN (
    SELECT 
      message_id,
      COUNT(*) as comment_count
    FROM message_comments 
    WHERE is_deleted = false OR is_deleted IS NULL
    GROUP BY message_id
  ) comment_counts ON am.id = comment_counts.message_id
  WHERE am.is_active = true 
    AND (am.expires_at IS NULL OR am.expires_at > NOW())
  ORDER BY am.priority DESC, am.created_at DESC;
END;
$$;

-- Create function to get comments for a specific message
CREATE OR REPLACE FUNCTION get_message_comments(message_uuid uuid)
RETURNS TABLE (
  id uuid,
  comment text,
  created_at timestamp with time zone,
  user_name text,
  user_email text,
  is_admin boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mc.id,
    mc.comment,
    mc.created_at,
    COALESCE(p.first_name || ' ' || p.last_name, p.email, 'Utilisateur') as user_name,
    p.email as user_email,
    CASE WHEN p.role = 'admin' THEN true ELSE false END as is_admin
  FROM message_comments mc
  LEFT JOIN profiles p ON mc.user_id = p.id
  WHERE mc.message_id = message_uuid 
    AND (mc.is_deleted = false OR mc.is_deleted IS NULL)
  ORDER BY mc.created_at ASC;
END;
$$;

-- Create function to get all users with subscription info (admin only)
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
    WHERE id = auth.uid() AND role = 'admin'
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
      member_id,
      COUNT(*) as total_invoices,
      COUNT(CASE WHEN status != 'paid' THEN 1 END) as unpaid_invoices
    FROM invoices 
    GROUP BY member_id
  ) invoice_stats ON p.id = invoice_stats.member_id
  LEFT JOIN auth.users au ON p.id = au.id
  ORDER BY p.created_at DESC;
END;
$$;

-- Create function to cancel invoice (admin only)
CREATE OR REPLACE FUNCTION cancel_invoice_admin(invoice_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the current user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  -- Update invoice status to cancelled
  UPDATE invoices 
  SET 
    status = 'cancelled',
    updated_at = NOW(),
    notes = COALESCE(notes, '') || ' - Annulée par admin le ' || NOW()::date
  WHERE id = invoice_uuid;

  RETURN FOUND;
END;
$$;

-- Fix RLS policies for admin_messages (allow all authenticated users to read)
DROP POLICY IF EXISTS "Users can view active admin messages" ON admin_messages;
CREATE POLICY "Users can view active admin messages" ON admin_messages
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow admins to manage admin messages
DROP POLICY IF EXISTS "Admins can manage admin messages" ON admin_messages;
CREATE POLICY "Admins can manage admin messages" ON admin_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Fix RLS policies for message_comments
DROP POLICY IF EXISTS "Users can view comments" ON message_comments;
CREATE POLICY "Users can view comments" ON message_comments
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can add comments" ON message_comments;
CREATE POLICY "Users can add comments" ON message_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage comments" ON message_comments;
CREATE POLICY "Admins can manage comments" ON message_comments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_messages_with_comments() TO authenticated;
GRANT EXECUTE ON FUNCTION get_message_comments(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_users_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_invoice_admin(uuid) TO authenticated;

COMMENT ON FUNCTION get_messages_with_comments() IS 'Get all active admin messages with comment counts - visible to all authenticated users';
COMMENT ON FUNCTION get_message_comments(uuid) IS 'Get comments for a specific message - visible to all authenticated users';
COMMENT ON FUNCTION get_all_users_admin() IS 'Get all users with subscription info - admin only';
COMMENT ON FUNCTION cancel_invoice_admin(uuid) IS 'Cancel an invoice - admin only';
