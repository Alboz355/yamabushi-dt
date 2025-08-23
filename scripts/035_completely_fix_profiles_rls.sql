-- Completely disable and recreate RLS policies for profiles table to eliminate infinite recursion
-- Step 1: Disable RLS temporarily to allow operations
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies that might cause recursion
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON profiles;
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

-- Step 3: Ensure admin profile exists with correct data
INSERT INTO profiles (id, email, first_name, last_name, role)
VALUES (
  '632d7f0e-2708-4e55-b7ad-1d7ce96a5006',
  'admin@admin.com',
  'Admin',
  'User',
  'admin'
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role;

-- Step 4: Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 5: Create ultra-simple policies without any recursion
CREATE POLICY "simple_select_policy" ON profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "simple_insert_policy" ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "simple_update_policy" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Step 6: Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Verify the admin profile was created
SELECT id, email, role FROM profiles WHERE email = 'admin@admin.com';
