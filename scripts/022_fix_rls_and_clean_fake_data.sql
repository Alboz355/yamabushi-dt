-- Fix RLS policies and clean fake progression data
-- This script corrects Row-Level Security policies and removes all fake/demo data

-- Drop and recreate RLS policies for member_course_history
DROP POLICY IF EXISTS "Users can view own course history" ON member_course_history;
DROP POLICY IF EXISTS "Users can insert own course history" ON member_course_history;
DROP POLICY IF EXISTS "Users can update own course history" ON member_course_history;

-- Create proper RLS policies for member_course_history
CREATE POLICY "Users can view own course history" ON member_course_history
    FOR SELECT USING (member_id = auth.uid());

CREATE POLICY "Users can insert own course history" ON member_course_history
    FOR INSERT WITH CHECK (member_id = auth.uid());

CREATE POLICY "Users can update own course history" ON member_course_history
    FOR UPDATE USING (member_id = auth.uid());

-- Drop and recreate RLS policies for member_discipline_stats
DROP POLICY IF EXISTS "Users can view own discipline stats" ON member_discipline_stats;
DROP POLICY IF EXISTS "Users can insert own discipline stats" ON member_discipline_stats;
DROP POLICY IF EXISTS "Users can update own discipline stats" ON member_discipline_stats;

CREATE POLICY "Users can view own discipline stats" ON member_discipline_stats
    FOR SELECT USING (member_id = auth.uid());

CREATE POLICY "Users can insert own discipline stats" ON member_discipline_stats
    FOR INSERT WITH CHECK (member_id = auth.uid());

CREATE POLICY "Users can update own discipline stats" ON member_discipline_stats
    FOR UPDATE USING (member_id = auth.uid());

-- Drop and recreate RLS policies for member_milestones
DROP POLICY IF EXISTS "Users can view own milestones" ON member_milestones;
DROP POLICY IF EXISTS "Users can insert own milestones" ON member_milestones;
DROP POLICY IF EXISTS "Users can update own milestones" ON member_milestones;

CREATE POLICY "Users can view own milestones" ON member_milestones
    FOR SELECT USING (member_id = auth.uid());

CREATE POLICY "Users can insert own milestones" ON member_milestones
    FOR INSERT WITH CHECK (member_id = auth.uid());

CREATE POLICY "Users can update own milestones" ON member_milestones
    FOR UPDATE USING (member_id = auth.uid());

-- Clean all fake/demo data from progression tables
DELETE FROM member_course_history WHERE member_id NOT IN (SELECT id FROM auth.users);
DELETE FROM member_discipline_stats WHERE member_id NOT IN (SELECT id FROM auth.users);
DELETE FROM member_milestones WHERE member_id NOT IN (SELECT id FROM auth.users);

-- Remove any demo/fake data that might have been inserted
DELETE FROM member_course_history WHERE course_name LIKE '%Demo%' OR course_name LIKE '%Test%';
DELETE FROM member_discipline_stats WHERE discipline_name LIKE '%Demo%' OR discipline_name LIKE '%Test%';
DELETE FROM member_milestones WHERE title LIKE '%Demo%' OR title LIKE '%Test%';

-- Create or replace function to automatically add completed courses to progression
CREATE OR REPLACE FUNCTION add_completed_course_to_progression()
RETURNS TRIGGER AS $$
DECLARE
    course_datetime TIMESTAMP;
    current_time TIMESTAMP;
BEGIN
    -- Parse course date and time
    course_datetime := (NEW.course_date || ' ' || NEW.course_time)::TIMESTAMP;
    current_time := NOW();
    
    -- Only add to progression if course is completed (datetime has passed)
    IF course_datetime <= current_time THEN
        -- Add to course history
        INSERT INTO member_course_history (
            member_id,
            course_name,
            course_date,
            course_time,
            status
        ) VALUES (
            NEW.user_id,
            NEW.course_name,
            NEW.course_date,
            NEW.course_time,
            'completed'
        ) ON CONFLICT (member_id, course_date, course_time, course_name) DO NOTHING;
        
        -- Update discipline stats
        INSERT INTO member_discipline_stats (
            member_id,
            discipline_name,
            total_classes,
            total_hours,
            current_streak,
            last_class_date
        ) VALUES (
            NEW.user_id,
            NEW.course_name,
            1,
            1.5, -- Assuming 1.5 hours per class
            1,
            NEW.course_date
        ) ON CONFLICT (member_id, discipline_name) DO UPDATE SET
            total_classes = member_discipline_stats.total_classes + 1,
            total_hours = member_discipline_stats.total_hours + 1.5,
            current_streak = CASE 
                WHEN member_discipline_stats.last_class_date = NEW.course_date - INTERVAL '1 day' 
                THEN member_discipline_stats.current_streak + 1
                ELSE 1
            END,
            last_class_date = NEW.course_date;
            
        -- Create milestone for first class in discipline
        INSERT INTO member_milestones (
            member_id,
            title,
            description,
            discipline_name,
            achieved_date,
            milestone_type
        ) VALUES (
            NEW.user_id,
            'Premier cours en ' || NEW.course_name,
            'Félicitations pour votre premier cours de ' || NEW.course_name || ' !',
            NEW.course_name,
            NEW.course_date,
            'first_class'
        ) ON CONFLICT (member_id, title) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS trigger_add_completed_course ON course_attendance;

CREATE TRIGGER trigger_add_completed_course
    AFTER INSERT OR UPDATE ON course_attendance
    FOR EACH ROW
    EXECUTE FUNCTION add_completed_course_to_progression();

-- Process existing course_attendance records to add completed courses to progression
DO $$
DECLARE
    attendance_record RECORD;
    course_datetime TIMESTAMP;
    current_time TIMESTAMP;
BEGIN
    current_time := NOW();
    
    FOR attendance_record IN 
        SELECT * FROM course_attendance 
    LOOP
        -- Parse course date and time
        course_datetime := (attendance_record.course_date || ' ' || attendance_record.course_time)::TIMESTAMP;
        
        -- Only process completed courses
        IF course_datetime <= current_time THEN
            -- Add to course history
            INSERT INTO member_course_history (
                member_id,
                course_name,
                course_date,
                course_time,
                status
            ) VALUES (
                attendance_record.user_id,
                attendance_record.course_name,
                attendance_record.course_date,
                attendance_record.course_time,
                'completed'
            ) ON CONFLICT (member_id, course_date, course_time, course_name) DO NOTHING;
            
            -- Update discipline stats
            INSERT INTO member_discipline_stats (
                member_id,
                discipline_name,
                total_classes,
                total_hours,
                current_streak,
                last_class_date
            ) VALUES (
                attendance_record.user_id,
                attendance_record.course_name,
                1,
                1.5,
                1,
                attendance_record.course_date
            ) ON CONFLICT (member_id, discipline_name) DO UPDATE SET
                total_classes = member_discipline_stats.total_classes + 1,
                total_hours = member_discipline_stats.total_hours + 1.5,
                current_streak = CASE 
                    WHEN member_discipline_stats.last_class_date = attendance_record.course_date - INTERVAL '1 day' 
                    THEN member_discipline_stats.current_streak + 1
                    ELSE 1
                END,
                last_class_date = attendance_record.course_date;
                
            -- Create milestone
            INSERT INTO member_milestones (
                member_id,
                title,
                description,
                discipline_name,
                achieved_date,
                milestone_type
            ) VALUES (
                attendance_record.user_id,
                'Premier cours en ' || attendance_record.course_name,
                'Félicitations pour votre premier cours de ' || attendance_record.course_name || ' !',
                attendance_record.course_name,
                attendance_record.course_date,
                'first_class'
            ) ON CONFLICT (member_id, title) DO NOTHING;
        END IF;
    END LOOP;
END $$;
