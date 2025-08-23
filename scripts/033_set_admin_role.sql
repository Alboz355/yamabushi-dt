-- Set admin role for the admin@admin.com user
-- Update the profile for admin@admin.com to have admin role
UPDATE profiles 
SET role = 'admin'
WHERE id = '632d7f0e-2708-4e55-b7ad-1d7ce96a5006';

-- Create profile if it doesn't exist for admin user
INSERT INTO profiles (
  id,
  email,
  first_name,
  last_name,
  role,
  membership_status,
  subscription_tier,
  join_date,
  created_at,
  updated_at
) VALUES (
  '632d7f0e-2708-4e55-b7ad-1d7ce96a5006',
  'admin@admin.com',
  'Admin',
  'User',
  'admin',
  'active',
  'admin',
  CURRENT_DATE,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  email = 'admin@admin.com',
  updated_at = NOW();

-- Verify the admin role was set correctly
SELECT id, email, role FROM profiles WHERE id = '632d7f0e-2708-4e55-b7ad-1d7ce96a5006';
