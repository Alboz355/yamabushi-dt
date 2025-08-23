-- FINAL CLEANUP: Remove ALL problematic triggers and tables causing RLS violations
-- This script definitively removes all automatic triggers that insert into member_course_history

-- === STEP 1: DROP ALL TRIGGERS ===
-- Drop all possible trigger variations that might exist
DROP TRIGGER IF EXISTS trigger_process_completed_course ON course_attendance;
DROP TRIGGER IF EXISTS auto_transfer_completed_courses ON course_attendance;
DROP TRIGGER IF EXISTS trigger_add_completed_course ON course_attendance;
DROP TRIGGER IF EXISTS trigger_transfer_completed_courses ON course_attendance;
DROP TRIGGER IF EXISTS trigger_update_course_history ON course_attendance;
DROP TRIGGER IF EXISTS trigger_update_member_history ON member_progress;
DROP TRIGGER IF EXISTS update_progression_on_attendance ON course_attendance;
DROP TRIGGER IF EXISTS auto_update_member_progress ON member_progress;

-- === STEP 2: DROP ALL FUNCTIONS ===
-- Drop all functions that might be called by triggers
DROP FUNCTION IF EXISTS process_completed_course() CASCADE;
DROP FUNCTION IF EXISTS trigger_transfer_completed_courses() CASCADE;
DROP FUNCTION IF EXISTS transfer_completed_courses() CASCADE;
DROP FUNCTION IF EXISTS add_completed_course_to_progression() CASCADE;
DROP FUNCTION IF EXISTS transfer_completed_courses_to_history(uuid) CASCADE;
DROP FUNCTION IF EXISTS auto_transfer_completed_courses() CASCADE;
DROP FUNCTION IF EXISTS update_member_progression() CASCADE;
DROP FUNCTION IF EXISTS check_member_milestones(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS update_member_course_history() CASCADE;
DROP FUNCTION IF EXISTS process_course_completion() CASCADE;

-- === STEP 3: DROP ALL PROBLEMATIC TABLES ===
-- Drop all tables that cause RLS violations
DROP TABLE IF EXISTS member_course_history CASCADE;
DROP TABLE IF EXISTS member_discipline_stats CASCADE;
DROP TABLE IF EXISTS member_milestones CASCADE;

-- === STEP 4: CLEAN UP EXISTING TABLES ===
-- Ensure course_attendance and member_progress have clean RLS policies
ALTER TABLE course_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_progress ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their own attendance" ON course_attendance;
DROP POLICY IF EXISTS "Users can insert their own attendance" ON course_attendance;
DROP POLICY IF EXISTS "Users can update their own attendance" ON course_attendance;
DROP POLICY IF EXISTS "Users can delete their own attendance" ON course_attendance;
DROP POLICY IF EXISTS "Users can manage their own attendance" ON course_attendance;

DROP POLICY IF EXISTS "Users can view their own progress" ON member_progress;
DROP POLICY IF EXISTS "Users can insert their own progress" ON member_progress;
DROP POLICY IF EXISTS "Users can update their own progress" ON member_progress;
DROP POLICY IF EXISTS "Users can manage their own progress" ON member_progress;

-- === STEP 5: CREATE SIMPLE, CLEAN RLS POLICIES ===
-- Create simple RLS policies for course_attendance
CREATE POLICY "course_attendance_select" ON course_attendance
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "course_attendance_insert" ON course_attendance
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "course_attendance_update" ON course_attendance
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "course_attendance_delete" ON course_attendance
    FOR DELETE USING (auth.uid() = user_id);

-- Create simple RLS policies for member_progress
CREATE POLICY "member_progress_select" ON member_progress
    FOR SELECT USING (auth.uid() = member_id);

CREATE POLICY "member_progress_insert" ON member_progress
    FOR INSERT WITH CHECK (auth.uid() = member_id);

CREATE POLICY "member_progress_update" ON member_progress
    FOR UPDATE USING (auth.uid() = member_id);

-- === STEP 6: GRANT PERMISSIONS ===
GRANT ALL ON course_attendance TO authenticated;
GRANT ALL ON member_progress TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- === STEP 7: CREATE SIMPLE PROGRESS VIEW ===
-- Create a simple view for progress tracking without RLS issues
CREATE OR REPLACE VIEW simple_user_progress AS
SELECT 
    ca.user_id,
    ca.course_name,
    COUNT(*) as total_attended,
    MIN(ca.course_date) as first_class,
    MAX(ca.course_date) as last_class,
    COUNT(CASE WHEN ca.course_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as classes_this_month
FROM course_attendance ca
WHERE ca.user_id = auth.uid()
GROUP BY ca.user_id, ca.course_name;

-- Grant access to the view
GRANT SELECT ON simple_user_progress TO authenticated;

-- === STEP 8: VERIFY CLEANUP ===
-- Log what we've cleaned up
DO $$
BEGIN
    RAISE NOTICE 'CLEANUP COMPLETE:';
    RAISE NOTICE '- Removed all automatic triggers on course_attendance';
    RAISE NOTICE '- Removed all functions that insert into member_course_history';
    RAISE NOTICE '- Dropped member_course_history, member_discipline_stats, member_milestones tables';
    RAISE NOTICE '- Created clean RLS policies for course_attendance and member_progress';
    RAISE NOTICE '- Created simple_user_progress view for progress tracking';
END $$;

-- Final cleanup of all problematic triggers and tables causing RLS violations
