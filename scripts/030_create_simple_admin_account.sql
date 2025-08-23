-- Creating simple admin account with email "admin" and password "admin"

-- First, add role column to profiles table if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Create RLS policies for role column
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create admin user in auth.users (this will be done manually through Supabase dashboard)
-- For now, we'll create a trigger to automatically set role to admin for admin email

CREATE OR REPLACE FUNCTION set_admin_role()
RETURNS TRIGGER AS $$
BEGIN
  -- If the email is 'admin', set role to 'admin'
  IF NEW.email = 'admin' THEN
    NEW.role = 'admin';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set admin role
DROP TRIGGER IF EXISTS trigger_set_admin_role ON profiles;
CREATE TRIGGER trigger_set_admin_role
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_admin_role();

-- Create club_messages table for admin messages
CREATE TABLE IF NOT EXISTS club_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on club_messages
ALTER TABLE club_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for club_messages
CREATE POLICY "Everyone can view active messages" ON club_messages
  FOR SELECT USING (active = true);

CREATE POLICY "Admins can manage messages" ON club_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

COMMENT ON TABLE club_messages IS 'Messages and announcements from the club administration';
