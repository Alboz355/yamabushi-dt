-- Fix Supabase trigger conflicts by ensuring proper constraints and triggers exist
-- This script addresses the "ON CONFLICT constraint specification" error

-- First, ensure the profiles table has the correct primary key constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_pkey CASCADE;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

-- Ensure the instructors table has proper constraints
ALTER TABLE public.instructors DROP CONSTRAINT IF EXISTS instructors_pkey CASCADE;
ALTER TABLE public.instructors ADD CONSTRAINT instructors_pkey PRIMARY KEY (id);

-- Add unique constraint on profile_id in instructors table if it doesn't exist
ALTER TABLE public.instructors DROP CONSTRAINT IF EXISTS instructors_profile_id_unique;
ALTER TABLE public.instructors ADD CONSTRAINT instructors_profile_id_unique UNIQUE (profile_id);

-- Create or replace the handle_new_user function with proper conflict handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles with proper conflict handling using primary key
  INSERT INTO public.profiles (
    id, 
    email, 
    first_name, 
    last_name, 
    role,
    created_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    'user', -- Default role
    NOW()
  )
  ON CONFLICT (id) DO NOTHING; -- Use primary key for conflict resolution

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create a safe function for role updates that avoids trigger conflicts
CREATE OR REPLACE FUNCTION public.safe_update_user_role(
  user_id UUID,
  new_role TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the role directly without triggering conflicts
  UPDATE public.profiles 
  SET role = new_role, updated_at = NOW()
  WHERE id = user_id;
  
  -- Return true if update was successful
  RETURN FOUND;
END;
$$;

-- Create a safe function for instructor creation that avoids conflicts
CREATE OR REPLACE FUNCTION public.safe_create_instructor(
  user_id UUID,
  instructor_bio TEXT DEFAULT 'Nouvel instructeur',
  instructor_specialties TEXT[] DEFAULT '{}',
  instructor_certifications TEXT[] DEFAULT '{}',
  instructor_years_experience INTEGER DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  instructor_id UUID;
BEGIN
  -- Check if instructor already exists
  SELECT id INTO instructor_id
  FROM public.instructors
  WHERE profile_id = user_id;
  
  IF instructor_id IS NOT NULL THEN
    -- Update existing instructor
    UPDATE public.instructors
    SET 
      bio = instructor_bio,
      specialties = instructor_specialties,
      certifications = instructor_certifications,
      years_experience = instructor_years_experience,
      updated_at = NOW()
    WHERE profile_id = user_id;
    
    RETURN instructor_id;
  ELSE
    -- Create new instructor
    INSERT INTO public.instructors (
      profile_id,
      bio,
      specialties,
      certifications,
      years_experience,
      is_active,
      created_at
    )
    VALUES (
      user_id,
      instructor_bio,
      instructor_specialties,
      instructor_certifications,
      instructor_years_experience,
      true,
      NOW()
    )
    RETURNING id INTO instructor_id;
    
    RETURN instructor_id;
  END IF;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.safe_update_user_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.safe_create_instructor(UUID, TEXT, TEXT[], TEXT[], INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;

-- Ensure RLS is properly configured
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Create admin policies for profiles table
DROP POLICY IF EXISTS "admin_all_profiles" ON public.profiles;
CREATE POLICY "admin_all_profiles" ON public.profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create admin policies for instructors table  
DROP POLICY IF EXISTS "admin_all_instructors" ON public.instructors;
CREATE POLICY "admin_all_instructors" ON public.instructors
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create admin policies for activity_logs table
DROP POLICY IF EXISTS "admin_all_activity_logs" ON public.activity_logs;
CREATE POLICY "admin_all_activity_logs" ON public.activity_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
