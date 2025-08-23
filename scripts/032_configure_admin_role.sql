-- Configure admin role for the specific admin user
-- User ID: 632d7f0e-2708-4e55-b7ad-1d7ce96a5006 (admin@admin.com)

-- First, ensure the profiles table has the role column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Set the admin role for the admin user
INSERT INTO profiles (id, role, full_name, email)
VALUES ('632d7f0e-2708-4e55-b7ad-1d7ce96a5006', 'admin', 'Administrator', 'admin@admin.com')
ON CONFLICT (id) 
DO UPDATE SET 
  role = 'admin',
  full_name = COALESCE(profiles.full_name, 'Administrator'),
  email = COALESCE(profiles.email, 'admin@admin.com');

-- Create RLS policies for admin access
DROP POLICY IF EXISTS "Admin can access all profiles" ON profiles;
CREATE POLICY "Admin can access all profiles" ON profiles
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );

-- Grant admin access to all tables
DROP POLICY IF EXISTS "Admin can access all subscriptions" ON subscriptions;
CREATE POLICY "Admin can access all subscriptions" ON subscriptions
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admin can access all course_attendance" ON course_attendance;
CREATE POLICY "Admin can access all course_attendance" ON course_attendance
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admin can access all member_progress" ON member_progress;
CREATE POLICY "Admin can access all member_progress" ON member_progress
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );

-- Create admin messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS admin_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'info' CHECK (priority IN ('info', 'warning', 'urgent')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Enable RLS on admin_messages
ALTER TABLE admin_messages ENABLE ROW LEVEL SECURITY;

-- Admin can manage all messages
CREATE POLICY "Admin can manage all messages" ON admin_messages
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );

-- Users can read active messages
CREATE POLICY "Users can read active messages" ON admin_messages
  FOR SELECT USING (is_active = true);
