-- Sync all existing users from auth.users to profiles table
-- This fixes the issue where only admin has a profile

-- First, let's see how many users we have in auth.users vs profiles
DO $$
DECLARE
    auth_users_count INTEGER;
    profiles_count INTEGER;
BEGIN
    -- Count users in auth.users (this will fail if we don't have access, but let's try)
    BEGIN
        SELECT COUNT(*) INTO auth_users_count FROM auth.users;
        RAISE NOTICE 'Users in auth.users: %', auth_users_count;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Cannot access auth.users table (expected for security reasons)';
        auth_users_count := 0;
    END;
    
    -- Count users in profiles
    SELECT COUNT(*) INTO profiles_count FROM profiles;
    RAISE NOTICE 'Users in profiles: %', profiles_count;
END $$;

-- Create a function to manually create profiles for users who don't have them
-- Since we can't access auth.users directly, we'll create profiles based on known user IDs
CREATE OR REPLACE FUNCTION sync_user_profiles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert profiles for any users who might be missing them
    -- We'll use the subscription and invoice data to identify real users
    
    -- Create profiles for users who have subscriptions but no profile
    INSERT INTO profiles (
        id,
        email,
        first_name,
        last_name,
        membership_type,
        role,
        created_at
    )
    SELECT DISTINCT
        s.member_id,
        COALESCE(s.member_id::text || '@user.com', 'unknown@user.com') as email,
        'User' as first_name,
        'Member' as last_name,
        CASE 
            WHEN s.plan_type = 'yearly' THEN 'yearly'
            WHEN s.plan_type = 'monthly' THEN 'monthly'
            ELSE 'monthly'
        END as membership_type,
        'user' as role,
        s.created_at
    FROM subscriptions s
    LEFT JOIN profiles p ON s.member_id = p.id
    WHERE p.id IS NULL
    ON CONFLICT (id) DO NOTHING;
    
    -- Create profiles for users who have invoices but no profile
    INSERT INTO profiles (
        id,
        email,
        first_name,
        last_name,
        membership_type,
        role,
        created_at
    )
    SELECT DISTINCT
        i.member_id,
        COALESCE(i.member_id::text || '@user.com', 'unknown@user.com') as email,
        'User' as first_name,
        'Member' as last_name,
        'monthly' as membership_type,
        'user' as role,
        i.created_at
    FROM invoices i
    LEFT JOIN profiles p ON i.member_id = p.id
    WHERE p.id IS NULL
    ON CONFLICT (id) DO NOTHING;
    
    -- Create profiles for users who have course attendance but no profile
    INSERT INTO profiles (
        id,
        email,
        first_name,
        last_name,
        membership_type,
        role,
        created_at
    )
    SELECT DISTINCT
        ca.user_id,
        COALESCE(ca.user_id::text || '@user.com', 'unknown@user.com') as email,
        'User' as first_name,
        'Member' as last_name,
        'monthly' as membership_type,
        'user' as role,
        ca.created_at
    FROM course_attendance ca
    LEFT JOIN profiles p ON ca.user_id = p.id
    WHERE p.id IS NULL
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Profile sync completed';
END;
$$;

-- Execute the sync function
SELECT sync_user_profiles();

-- Show the results
DO $$
DECLARE
    profiles_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO profiles_count FROM profiles;
    RAISE NOTICE 'Total profiles after sync: %', profiles_count;
END $$;

-- Ensure the profile creation trigger is still active
-- Re-create it to make sure it works for future users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    first_name, 
    last_name, 
    phone, 
    membership_type,
    role
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', 'User'),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', 'Member'),
    COALESCE(NEW.raw_user_meta_data ->> 'phone', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'membership_type', 'monthly'),
    'user'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, profiles.last_name),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    membership_type = COALESCE(EXCLUDED.membership_type, profiles.membership_type);

  RETURN NEW;
END;
$$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Removed invalid COMMENT ON SCRIPT syntax that was causing SQL execution error
