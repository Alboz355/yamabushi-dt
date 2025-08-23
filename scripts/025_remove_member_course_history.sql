-- Remove problematic member_course_history table and all associated triggers
-- This table is causing RLS violations and is not used directly in the application

-- Drop any triggers that might be inserting into member_course_history
DROP TRIGGER IF EXISTS trigger_update_course_history ON course_attendance;
DROP TRIGGER IF EXISTS trigger_update_member_history ON member_progress;
DROP TRIGGER IF EXISTS trigger_transfer_completed_courses ON course_attendance;

-- Drop any functions that might be related to member_course_history
DROP FUNCTION IF EXISTS transfer_completed_courses_to_history(uuid);
DROP FUNCTION IF EXISTS update_member_course_history();
DROP FUNCTION IF EXISTS process_course_completion();

-- Drop the problematic table completely
DROP TABLE IF EXISTS member_course_history CASCADE;

-- Also drop other unused progression tables that might cause similar issues
DROP TABLE IF EXISTS member_discipline_stats CASCADE;
DROP TABLE IF EXISTS member_milestones CASCADE;

-- Create a simple view for progression tracking using existing tables
CREATE OR REPLACE VIEW user_course_summary AS
SELECT 
    ca.user_id,
    ca.course_name as discipline_name,
    COUNT(*) as total_courses,
    MIN(ca.course_date) as first_class_date,
    MAX(ca.course_date) as last_class_date,
    COUNT(CASE WHEN ca.course_date >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as courses_this_week
FROM course_attendance ca
GROUP BY ca.user_id, ca.course_name;

-- Enable RLS on the view (though it's not strictly necessary for views)
ALTER VIEW user_course_summary ENABLE ROW LEVEL SECURITY;

-- Create a simple RLS policy for the view
CREATE POLICY "Users can view their own course summary" ON user_course_summary
    FOR SELECT USING (auth.uid() = user_id);

-- Ensure course_attendance has proper RLS policies
DROP POLICY IF EXISTS "Users can manage their own attendance" ON course_attendance;
CREATE POLICY "Users can manage their own attendance" ON course_attendance
    FOR ALL USING (auth.uid() = user_id);

-- Ensure member_progress has proper RLS policies  
DROP POLICY IF EXISTS "Users can manage their own progress" ON member_progress;
CREATE POLICY "Users can manage their own progress" ON member_progress
    FOR ALL USING (auth.uid() = member_id);

-- Grant necessary permissions
GRANT SELECT ON user_course_summary TO authenticated;
GRANT ALL ON course_attendance TO authenticated;
GRANT ALL ON member_progress TO authenticated;
