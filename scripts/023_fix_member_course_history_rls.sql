-- Fix RLS policies for member_course_history table
-- This script resolves the "new row violates row-level security policy" error

-- First, drop any existing policies to start clean
DROP POLICY IF EXISTS "Allow users to view their own course history" ON member_course_history;
DROP POLICY IF EXISTS "Allow users to insert their own course history" ON member_course_history;
DROP POLICY IF EXISTS "Allow users to update their own course history" ON member_course_history;
DROP POLICY IF EXISTS "Allow users to delete their own course history" ON member_course_history;

-- Enable RLS on the table
ALTER TABLE member_course_history ENABLE ROW LEVEL SECURITY;

-- Create proper RLS policies following Supabase best practices
CREATE POLICY "Allow users to view their own course history" 
  ON member_course_history FOR SELECT 
  USING (auth.uid() = member_id);

CREATE POLICY "Allow users to insert their own course history" 
  ON member_course_history FOR INSERT 
  WITH CHECK (auth.uid() = member_id);

CREATE POLICY "Allow users to update their own course history" 
  ON member_course_history FOR UPDATE 
  USING (auth.uid() = member_id);

CREATE POLICY "Allow users to delete their own course history" 
  ON member_course_history FOR DELETE 
  USING (auth.uid() = member_id);

-- Also fix RLS policies for other progression tables
-- member_discipline_stats
DROP POLICY IF EXISTS "Allow users to view their own discipline stats" ON member_discipline_stats;
DROP POLICY IF EXISTS "Allow users to insert their own discipline stats" ON member_discipline_stats;
DROP POLICY IF EXISTS "Allow users to update their own discipline stats" ON member_discipline_stats;
DROP POLICY IF EXISTS "Allow users to delete their own discipline stats" ON member_discipline_stats;

ALTER TABLE member_discipline_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view their own discipline stats" 
  ON member_discipline_stats FOR SELECT 
  USING (auth.uid() = member_id);

CREATE POLICY "Allow users to insert their own discipline stats" 
  ON member_discipline_stats FOR INSERT 
  WITH CHECK (auth.uid() = member_id);

CREATE POLICY "Allow users to update their own discipline stats" 
  ON member_discipline_stats FOR UPDATE 
  USING (auth.uid() = member_id);

CREATE POLICY "Allow users to delete their own discipline stats" 
  ON member_discipline_stats FOR DELETE 
  USING (auth.uid() = member_id);

-- member_milestones
DROP POLICY IF EXISTS "Allow users to view their own milestones" ON member_milestones;
DROP POLICY IF EXISTS "Allow users to insert their own milestones" ON member_milestones;
DROP POLICY IF EXISTS "Allow users to update their own milestones" ON member_milestones;
DROP POLICY IF EXISTS "Allow users to delete their own milestones" ON member_milestones;

ALTER TABLE member_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view their own milestones" 
  ON member_milestones FOR SELECT 
  USING (auth.uid() = member_id);

CREATE POLICY "Allow users to insert their own milestones" 
  ON member_milestones FOR INSERT 
  WITH CHECK (auth.uid() = member_id);

CREATE POLICY "Allow users to update their own milestones" 
  ON member_milestones FOR UPDATE 
  USING (auth.uid() = member_id);

CREATE POLICY "Allow users to delete their own milestones" 
  ON member_milestones FOR DELETE 
  USING (auth.uid() = member_id);

-- Remove any problematic triggers that might be causing automatic insertions
DROP TRIGGER IF EXISTS auto_add_to_course_history ON course_attendance;
DROP FUNCTION IF EXISTS auto_add_course_to_history();

-- Create a simple function to manually transfer completed courses to history
-- This will be called explicitly from the application code
CREATE OR REPLACE FUNCTION transfer_completed_courses_to_history(user_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert completed courses (where course date + time has passed) into history
  INSERT INTO member_course_history (
    member_id,
    course_name,
    discipline_name,
    course_date,
    course_time,
    attendance_status,
    created_at
  )
  SELECT DISTINCT
    ca.user_id,
    ca.course_name,
    ca.course_name, -- Use course_name as discipline_name for now
    ca.course_date,
    ca.course_time,
    'attended',
    NOW()
  FROM course_attendance ca
  WHERE ca.user_id = user_uuid
    AND ca.course_date <= CURRENT_DATE
    AND (
      ca.course_date < CURRENT_DATE 
      OR (ca.course_date = CURRENT_DATE AND ca.course_time < CURRENT_TIME)
    )
    AND NOT EXISTS (
      SELECT 1 FROM member_course_history mch 
      WHERE mch.member_id = ca.user_id 
        AND mch.course_date = ca.course_date 
        AND mch.course_time = ca.course_time
        AND mch.course_name = ca.course_name
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION transfer_completed_courses_to_history(UUID) TO authenticated;
