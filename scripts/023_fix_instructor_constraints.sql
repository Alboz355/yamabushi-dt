-- Fix missing constraints that cause ON CONFLICT specification errors
-- This script adds the necessary unique constraints and indexes

-- Add unique constraint on instructors.profile_id to prevent duplicates
ALTER TABLE instructors 
ADD CONSTRAINT instructors_profile_id_unique UNIQUE (profile_id);

-- Add unique constraint on activity_logs for potential upsert operations
-- Using a composite unique constraint on user_id, action, and created_at (rounded to minute)
-- to prevent duplicate log entries within the same minute
ALTER TABLE activity_logs 
ADD CONSTRAINT activity_logs_unique_per_minute 
UNIQUE (user_id, action, date_trunc('minute', created_at));

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_instructors_profile_id ON instructors(profile_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_action ON activity_logs(user_id, action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- Add foreign key constraint to ensure data integrity
ALTER TABLE instructors 
ADD CONSTRAINT fk_instructors_profile_id 
FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Update RLS policies to work with new constraints
DROP POLICY IF EXISTS "Instructors can view their own data" ON instructors;
CREATE POLICY "Instructors can view their own data" ON instructors
FOR SELECT USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all instructors" ON instructors;
CREATE POLICY "Admins can manage all instructors" ON instructors
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Ensure activity_logs has proper RLS policies
DROP POLICY IF EXISTS "Admins can view all activity logs" ON activity_logs;
CREATE POLICY "Admins can view all activity logs" ON activity_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'instructor')
  )
);

DROP POLICY IF EXISTS "System can insert activity logs" ON activity_logs;
CREATE POLICY "System can insert activity logs" ON activity_logs
FOR INSERT WITH CHECK (true);
