-- Create message comments table for user interactions
CREATE TABLE IF NOT EXISTS message_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES admin_messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_by UUID REFERENCES profiles(id),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on message_comments
ALTER TABLE message_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for message_comments
CREATE POLICY "Users can view all comments" ON message_comments
  FOR SELECT USING (NOT is_deleted);

CREATE POLICY "Users can insert their own comments" ON message_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON message_comments
  FOR UPDATE USING (auth.uid() = user_id AND NOT is_deleted);

CREATE POLICY "Admins can delete any comment" ON message_comments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Update admin_messages to be visible to all users
ALTER TABLE admin_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for admin_messages
CREATE POLICY "All users can view active messages" ON admin_messages
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage all messages" ON admin_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create function to get message with comment count
CREATE OR REPLACE FUNCTION get_messages_with_comments()
RETURNS TABLE (
  id UUID,
  title TEXT,
  message TEXT,
  message_type TEXT,
  priority INTEGER,
  is_active BOOLEAN,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  comment_count BIGINT
) AS $$
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
    COALESCE(comment_counts.count, 0) as comment_count
  FROM admin_messages am
  LEFT JOIN (
    SELECT 
      message_id,
      COUNT(*) as count
    FROM message_comments 
    WHERE NOT is_deleted
    GROUP BY message_id
  ) comment_counts ON am.id = comment_counts.message_id
  WHERE am.is_active = true
  AND (am.expires_at IS NULL OR am.expires_at > NOW())
  ORDER BY am.priority DESC, am.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get comments for a message
CREATE OR REPLACE FUNCTION get_message_comments(message_uuid UUID)
RETURNS TABLE (
  id UUID,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  user_name TEXT,
  user_email TEXT,
  is_admin BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mc.id,
    mc.comment,
    mc.created_at,
    COALESCE(p.first_name || ' ' || p.last_name, p.email) as user_name,
    p.email as user_email,
    (p.role = 'admin') as is_admin
  FROM message_comments mc
  JOIN profiles p ON mc.user_id = p.id
  WHERE mc.message_id = message_uuid
  AND NOT mc.is_deleted
  ORDER BY mc.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE message_comments IS 'Comments from users on admin messages';
COMMENT ON FUNCTION get_messages_with_comments() IS 'Get all active messages with comment counts';
COMMENT ON FUNCTION get_message_comments(UUID) IS 'Get all comments for a specific message';
