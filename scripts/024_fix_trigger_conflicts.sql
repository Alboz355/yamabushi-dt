-- Fix trigger conflicts causing ON CONFLICT constraint errors
-- This script removes problematic triggers and creates a clean instructor promotion system

-- First, let's check and remove any problematic triggers on profiles table
DO $$
BEGIN
    -- Drop any existing triggers that might cause ON CONFLICT issues
    DROP TRIGGER IF EXISTS on_profile_role_change ON public.profiles;
    DROP FUNCTION IF EXISTS public.handle_profile_role_change();
    
    -- Create a simple, safe function for handling instructor promotions
    CREATE OR REPLACE FUNCTION public.safe_promote_to_instructor(
        target_user_id UUID,
        instructor_bio TEXT DEFAULT 'Nouvel instructeur',
        instructor_specialties TEXT[] DEFAULT '{}',
        instructor_certifications TEXT[] DEFAULT '{}',
        instructor_years_experience INTEGER DEFAULT 0
    )
    RETURNS BOOLEAN
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $func$
    DECLARE
        existing_instructor_id UUID;
    BEGIN
        -- Update the user role first
        UPDATE public.profiles 
        SET role = 'instructor', updated_at = NOW()
        WHERE id = target_user_id;
        
        -- Check if instructor record exists
        SELECT id INTO existing_instructor_id 
        FROM public.instructors 
        WHERE profile_id = target_user_id;
        
        IF existing_instructor_id IS NOT NULL THEN
            -- Update existing instructor record
            UPDATE public.instructors 
            SET 
                bio = instructor_bio,
                specialties = instructor_specialties,
                certifications = instructor_certifications,
                years_experience = instructor_years_experience,
                is_active = true,
                created_at = NOW()
            WHERE profile_id = target_user_id;
        ELSE
            -- Insert new instructor record
            INSERT INTO public.instructors (
                profile_id, 
                bio, 
                specialties, 
                certifications, 
                years_experience, 
                is_active
            ) VALUES (
                target_user_id,
                instructor_bio,
                instructor_specialties,
                instructor_certifications,
                instructor_years_experience,
                true
            );
        END IF;
        
        RETURN true;
    EXCEPTION WHEN OTHERS THEN
        -- If anything fails, rollback the role change
        UPDATE public.profiles 
        SET role = 'user', updated_at = NOW()
        WHERE id = target_user_id;
        
        RETURN false;
    END;
    $func$;
    
    -- Grant execute permission to authenticated users
    GRANT EXECUTE ON FUNCTION public.safe_promote_to_instructor TO authenticated;
    
END $$;
