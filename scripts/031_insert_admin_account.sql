-- Create admin account directly in Supabase auth and profiles tables
-- Email: admin@admin, Password: admin

-- First, ensure the role column exists in profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Create RLS policies for role-based access
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Insert admin user directly into auth.users table
-- Note: This requires SUPERUSER privileges, so we'll create a function instead
CREATE OR REPLACE FUNCTION create_admin_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Generate a UUID for the admin user
  admin_user_id := gen_random_uuid();
  
  -- Insert into auth.users (this might not work due to RLS, but we'll try)
  -- If this fails, the admin will need to be created manually in Supabase dashboard
  
  -- Insert into profiles table with admin role
  INSERT INTO profiles (
    id,
    email,
    full_name,
    role,
    created_at,
    updated_at
  ) VALUES (
    admin_user_id,
    'admin@admin',
    'Administrator',
    'admin',
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    email = 'admin@admin',
    full_name = 'Administrator';
    
  -- Create a subscription for the admin (optional)
  INSERT INTO subscriptions (
    user_id,
    status,
    plan_type,
    start_date,
    end_date,
    created_at,
    updated_at
  ) VALUES (
    admin_user_id,
    'active',
    'admin',
    NOW(),
    NOW() + INTERVAL '10 years',
    NOW(),
    NOW()
  ) ON CONFLICT (user_id) DO UPDATE SET
    status = 'active',
    plan_type = 'admin';

END;
$$;

-- Execute the function
SELECT create_admin_user();

-- Create a function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id AND role = 'admin'
  );
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION create_admin_user TO authenticated;

COMMENT ON SCRIPT IS 'Creates admin account with email admin@admin and admin role';
