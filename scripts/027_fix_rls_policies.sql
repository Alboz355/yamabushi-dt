-- Fix RLS policies to prevent infinite recursion
-- Based on Supabase best practices from integration examples

-- Drop existing problematic policies
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;

-- Drop any other existing policies that might cause recursion
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      policy_record.policyname, 
                      policy_record.schemaname, 
                      policy_record.tablename);
    END LOOP;
END $$;

-- Create simple, non-recursive RLS policies following Supabase best practices
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "profiles_delete_own"
  ON public.profiles FOR DELETE
  USING (auth.uid() = id);

-- Add admin access policy for profiles (admins can see all profiles)
CREATE POLICY "profiles_admin_access"
  ON public.profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create admin user if it doesn't exist
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  role,
  aud,
  confirmation_token,
  recovery_token
) VALUES (
  '632d7f0e-2708-4e55-b7ad-1d7ce96a5006'::uuid,
  'admin@admin.com',
  crypt('admin123', gen_salt('bf')),
  now(),
  now(),
  now(),
  'authenticated',
  'authenticated',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

-- Create admin profile
INSERT INTO public.profiles (
  id,
  email,
  first_name,
  last_name,
  role,
  created_at,
  updated_at
) VALUES (
  '632d7f0e-2708-4e55-b7ad-1d7ce96a5006'::uuid,
  'admin@admin.com',
  'Admin',
  'User',
  'admin',
  now(),
  now()
) ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  email = 'admin@admin.com',
  first_name = 'Admin',
  last_name = 'User',
  updated_at = now();

-- Add logging
INSERT INTO public.activity_logs (
  id,
  user_id,
  action_type,
  description,
  user_role,
  created_at
) VALUES (
  gen_random_uuid(),
  '632d7f0e-2708-4e55-b7ad-1d7ce96a5006'::uuid,
  'system_fix',
  'Fixed RLS policies and ensured admin user exists',
  'admin',
  now()
);
