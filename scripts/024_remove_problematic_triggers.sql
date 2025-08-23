-- Remove problematic triggers and tables causing RLS violations
-- This script fixes the "member_course_history" RLS policy violation

-- Drop all triggers that might be causing automatic insertions
DROP TRIGGER IF EXISTS auto_transfer_completed_courses ON course_attendance;
DROP TRIGGER IF EXISTS update_progression_on_attendance ON course_attendance;
DROP TRIGGER IF EXISTS auto_update_member_progress ON member_progress;

-- Drop the problematic function
DROP FUNCTION IF EXISTS transfer_completed_courses_to_history(uuid);
DROP FUNCTION IF EXISTS auto_transfer_completed_courses();
DROP FUNCTION IF EXISTS update_member_progression();

-- Drop the problematic tables that are causing RLS issues
DROP TABLE IF EXISTS member_course_history CASCADE;
DROP TABLE IF EXISTS member_discipline_stats CASCADE;
DROP TABLE IF EXISTS member_milestones CASCADE;

-- Ensure proper RLS policies for existing tables
ALTER TABLE course_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_progress ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can manage their own attendance" ON course_attendance;
DROP POLICY IF EXISTS "Users can view their own attendance" ON course_attendance;
DROP POLICY IF EXISTS "Users can insert their own attendance" ON course_attendance;
DROP POLICY IF EXISTS "Users can update their own attendance" ON course_attendance;
DROP POLICY IF EXISTS "Users can delete their own attendance" ON course_attendance;

DROP POLICY IF EXISTS "Users can manage their own progress" ON member_progress;
DROP POLICY IF EXISTS "Users can view their own progress" ON member_progress;
DROP POLICY IF EXISTS "Users can insert their own progress" ON member_progress;
DROP POLICY IF EXISTS "Users can update their own progress" ON member_progress;

-- Create simple and effective RLS policies for course_attendance
CREATE POLICY "Users can view their own attendance" ON course_attendance
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own attendance" ON course_attendance
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attendance" ON course_attendance
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own attendance" ON course_attendance
    FOR DELETE USING (auth.uid() = user_id);

-- Create simple and effective RLS policies for member_progress
CREATE POLICY "Users can view their own progress" ON member_progress
    FOR SELECT USING (auth.uid() = member_id);

CREATE POLICY "Users can insert their own progress" ON member_progress
    FOR INSERT WITH CHECK (auth.uid() = member_id);

CREATE POLICY "Users can update their own progress" ON member_progress
    FOR UPDATE USING (auth.uid() = member_id);

-- Grant necessary permissions
GRANT ALL ON course_attendance TO authenticated;
GRANT ALL ON member_progress TO authenticated;

-- Create a simple view for progress tracking (read-only, no RLS issues)
CREATE OR REPLACE VIEW user_progress_summary AS
SELECT 
    mp.member_id,
    d.name as discipline_name,
    mp.current_belt,
    mp.goals,
    mp.instructor_notes,
    mp.created_at,
    mp.updated_at,
    COUNT(ca.id) as total_classes_attended
FROM member_progress mp
LEFT JOIN disciplines d ON mp.discipline_id = d.id
LEFT JOIN course_attendance ca ON ca.user_id = mp.member_id 
    AND ca.course_name = d.name
WHERE mp.member_id = auth.uid()
GROUP BY mp.member_id, d.name, mp.current_belt, mp.goals, mp.instructor_notes, mp.created_at, mp.updated_at;

-- Grant access to the view
GRANT SELECT ON user_progress_summary TO authenticated;

COMMENT ON SCRIPT IS 'Removes problematic triggers and tables causing RLS violations, creates simple and effective RLS policies';
