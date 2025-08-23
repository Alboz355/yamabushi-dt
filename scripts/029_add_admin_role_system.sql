-- Add role column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Create role constraint to ensure only valid roles
ALTER TABLE profiles ADD CONSTRAINT valid_roles CHECK (role IN ('user', 'admin', 'instructor'));

-- Enable RLS on profiles if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;

-- Create new RLS policies that allow admins to see all profiles
CREATE POLICY "profiles_select_policy" ON profiles FOR SELECT USING (
  auth.uid() = id OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "profiles_insert_policy" ON profiles FOR INSERT WITH CHECK (
  auth.uid() = id
);

CREATE POLICY "profiles_update_policy" ON profiles FOR UPDATE USING (
  auth.uid() = id OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "profiles_delete_policy" ON profiles FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Create admin messages table for club announcements
CREATE TABLE IF NOT EXISTS admin_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'info' CHECK (message_type IN ('info', 'warning', 'urgent', 'announcement')),
  priority INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on admin_messages
ALTER TABLE admin_messages ENABLE ROW LEVEL SECURITY;

-- Admin messages policies
CREATE POLICY "admin_messages_select_all" ON admin_messages FOR SELECT USING (true);
CREATE POLICY "admin_messages_insert_admin" ON admin_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "admin_messages_update_admin" ON admin_messages FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "admin_messages_delete_admin" ON admin_messages FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM profiles WHERE id = user_id;
  RETURN COALESCE(user_role, 'user');
END;
$$;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM profiles WHERE id = user_id AND role = 'admin');
END;
$$;

-- Insert some sample admin messages
INSERT INTO admin_messages (title, message, message_type, priority, created_by) VALUES
('Bienvenue dans l''espace admin', 'Vous avez maintenant accès aux fonctionnalités d''administration de Yamabushi Academy.', 'info', 1, NULL),
('Cours annulé', 'Le cours de Kickboxing du mercredi 18 décembre est annulé en raison d''un événement spécial.', 'warning', 2, NULL),
('Nouvelle discipline', 'Nous ajoutons bientôt des cours de Capoeira ! Restez à l''écoute pour plus d''informations.', 'announcement', 1, NULL);

COMMENT ON TABLE admin_messages IS 'Messages and announcements created by administrators for club members';
COMMENT ON FUNCTION get_user_role IS 'Returns the role of a user (user, admin, instructor)';
COMMENT ON FUNCTION is_admin IS 'Checks if a user has admin privileges';
