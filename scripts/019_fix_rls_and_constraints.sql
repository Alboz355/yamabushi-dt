-- Fix RLS policies and constraints for progression system
-- This script addresses the RLS policy violations and duplicate key constraints

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage their own progress" ON member_progress;
DROP POLICY IF EXISTS "Users can view their own progress" ON member_progress;
DROP POLICY IF EXISTS "Users can manage their own attendance" ON course_attendance;
DROP POLICY IF EXISTS "Users can view their own attendance" ON course_attendance;

-- Create proper RLS policies for member_progress
CREATE POLICY "Users can insert their own progress" ON member_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" ON member_progress
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own progress" ON member_progress
    FOR SELECT USING (auth.uid() = user_id);

-- Create proper RLS policies for course_attendance
CREATE POLICY "Users can manage their own attendance" ON course_attendance
    FOR ALL USING (auth.uid() = user_id);

-- Create function to automatically add completed courses to progression
CREATE OR REPLACE FUNCTION auto_add_to_progression()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the course date has passed (course is completed)
    IF NEW.course_date <= CURRENT_DATE THEN
        -- Add to member_progress with upsert
        INSERT INTO member_progress (
            user_id,
            discipline_id,
            total_classes,
            total_hours,
            current_level,
            experience_points,
            last_class_date,
            updated_at
        )
        SELECT 
            NEW.user_id,
            d.id,
            1,
            1.5, -- Assuming 1.5 hours per class
            1,
            10, -- 10 XP per class
            NEW.course_date,
            NOW()
        FROM disciplines d
        WHERE d.name = NEW.discipline
        ON CONFLICT (user_id, discipline_id)
        DO UPDATE SET
            total_classes = member_progress.total_classes + 1,
            total_hours = member_progress.total_hours + 1.5,
            experience_points = member_progress.experience_points + 10,
            current_level = CASE 
                WHEN member_progress.experience_points + 10 >= 100 THEN member_progress.current_level + 1
                ELSE member_progress.current_level
            END,
            last_class_date = NEW.course_date,
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic progression
DROP TRIGGER IF EXISTS trigger_auto_progression ON course_attendance;
CREATE TRIGGER trigger_auto_progression
    AFTER INSERT OR UPDATE ON course_attendance
    FOR EACH ROW
    EXECUTE FUNCTION auto_add_to_progression();

-- Create function to handle attendance upsert
CREATE OR REPLACE FUNCTION upsert_course_attendance(
    p_course_id TEXT,
    p_user_id UUID,
    p_course_date DATE,
    p_discipline TEXT,
    p_instructor TEXT,
    p_club TEXT
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO course_attendance (
        course_id,
        user_id,
        course_date,
        discipline,
        instructor,
        club,
        created_at
    )
    VALUES (
        p_course_id,
        p_user_id,
        p_course_date,
        p_discipline,
        p_instructor,
        p_club,
        NOW()
    )
    ON CONFLICT (course_id, user_id)
    DO UPDATE SET
        course_date = EXCLUDED.course_date,
        discipline = EXCLUDED.discipline,
        instructor = EXCLUDED.instructor,
        club = EXCLUDED.club,
        created_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION upsert_course_attendance TO authenticated;
GRANT EXECUTE ON FUNCTION auto_add_to_progression TO authenticated;
