-- Add some sample progress data for testing
-- This would normally be created through the UI by users

-- Note: This script assumes you have at least one user profile created
-- You may need to update the member_id values with actual user IDs

-- Sample progress records (replace with actual user IDs as needed)
-- INSERT INTO public.member_progress (member_id, discipline_id, current_belt, next_belt_target, goals)
-- SELECT 
--   'USER_ID_HERE',
--   d.id,
--   'Ceinture Blanche',
--   'Ceinture Bleue',
--   'Améliorer ma technique de garde et apprendre les soumissions de base'
-- FROM public.disciplines d WHERE d.name = 'Brazilian Jiu-Jitsu';

-- The above is commented out because we need actual user IDs
-- Users will create their own progress records through the UI

-- Instead, let's add some sample attendance records for testing
-- (These would normally be created when users check in to classes)

-- This is also commented out as it requires actual user IDs and session IDs
-- INSERT INTO public.attendance (member_id, class_session_id, check_in_time, status)
-- VALUES 
-- ('USER_ID_HERE', 'SESSION_ID_HERE', NOW() - INTERVAL '1 day', 'present'),
-- ('USER_ID_HERE', 'SESSION_ID_HERE', NOW() - INTERVAL '3 days', 'present');

-- For now, this script serves as a template for future data seeding
SELECT 'Progress tracking system ready - users can now create their own progress records' as status;
