-- Create missing progression tables and auto-transfer system
-- This script creates the tables that the progression page expects but don't exist yet

-- Create member_course_history table
CREATE TABLE IF NOT EXISTS member_course_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  course_name TEXT NOT NULL,
  course_date DATE NOT NULL,
  course_time TIME NOT NULL,
  instructor TEXT,
  club_name TEXT,
  discipline_name TEXT,
  attendance_status TEXT DEFAULT 'completed',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create member_discipline_stats table
CREATE TABLE IF NOT EXISTS member_discipline_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  discipline_name TEXT NOT NULL,
  total_courses INTEGER DEFAULT 0,
  total_hours NUMERIC DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_class_date DATE,
  first_class_date DATE,
  average_per_week NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(member_id, discipline_name)
);

-- Create member_milestones table
CREATE TABLE IF NOT EXISTS member_milestones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL, -- 'first_class', 'classes_milestone', 'streak_milestone', 'belt_promotion'
  milestone_name TEXT NOT NULL,
  description TEXT,
  discipline_name TEXT,
  achieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  value INTEGER, -- number of classes, streak length, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE member_course_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_discipline_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_milestones ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own course history" ON member_course_history
  FOR SELECT USING (auth.uid() = member_id);

CREATE POLICY "Users can insert their own course history" ON member_course_history
  FOR INSERT WITH CHECK (auth.uid() = member_id);

CREATE POLICY "Users can update their own course history" ON member_course_history
  FOR UPDATE USING (auth.uid() = member_id);

CREATE POLICY "Users can view their own discipline stats" ON member_discipline_stats
  FOR SELECT USING (auth.uid() = member_id);

CREATE POLICY "Users can insert their own discipline stats" ON member_discipline_stats
  FOR INSERT WITH CHECK (auth.uid() = member_id);

CREATE POLICY "Users can update their own discipline stats" ON member_discipline_stats
  FOR UPDATE USING (auth.uid() = member_id);

CREATE POLICY "Users can view their own milestones" ON member_milestones
  FOR SELECT USING (auth.uid() = member_id);

CREATE POLICY "Users can insert their own milestones" ON member_milestones
  FOR INSERT WITH CHECK (auth.uid() = member_id);

-- Function to transfer completed courses to history
CREATE OR REPLACE FUNCTION transfer_completed_courses()
RETURNS void AS $$
DECLARE
  completed_course RECORD;
  stats_record RECORD;
  milestone_count INTEGER;
BEGIN
  -- Find courses that are completed (course date + time has passed) but not yet in history
  FOR completed_course IN
    SELECT DISTINCT
      ca.user_id,
      ca.course_name,
      ca.course_date,
      ca.course_time,
      ub.instructor,
      ub.club_name,
      ca.course_name as discipline_name
    FROM course_attendance ca
    LEFT JOIN unified_bookings ub ON ca.course_id = ub.course_id AND ca.user_id = ub.user_id
    WHERE 
      -- Course is in the past (date + time has passed)
      (ca.course_date + ca.course_time) < NOW()
      -- Not already in history
      AND NOT EXISTS (
        SELECT 1 FROM member_course_history mch 
        WHERE mch.member_id = ca.user_id 
        AND mch.course_date = ca.course_date 
        AND mch.course_time = ca.course_time
        AND mch.course_name = ca.course_name
      )
  LOOP
    -- Insert into course history
    INSERT INTO member_course_history (
      member_id, course_name, course_date, course_time, 
      instructor, club_name, discipline_name, attendance_status
    ) VALUES (
      completed_course.user_id, completed_course.course_name, 
      completed_course.course_date, completed_course.course_time,
      completed_course.instructor, completed_course.club_name, 
      completed_course.discipline_name, 'completed'
    );

    -- Update or create discipline stats
    INSERT INTO member_discipline_stats (
      member_id, discipline_name, total_courses, total_hours, 
      last_class_date, first_class_date
    ) VALUES (
      completed_course.user_id, completed_course.discipline_name, 1, 1.5,
      completed_course.course_date, completed_course.course_date
    )
    ON CONFLICT (member_id, discipline_name) 
    DO UPDATE SET
      total_courses = member_discipline_stats.total_courses + 1,
      total_hours = member_discipline_stats.total_hours + 1.5,
      last_class_date = completed_course.course_date,
      first_class_date = LEAST(member_discipline_stats.first_class_date, completed_course.course_date),
      updated_at = NOW();

    -- Check for milestones
    SELECT * INTO stats_record 
    FROM member_discipline_stats 
    WHERE member_id = completed_course.user_id 
    AND discipline_name = completed_course.discipline_name;

    -- First class milestone
    IF stats_record.total_courses = 1 THEN
      INSERT INTO member_milestones (
        member_id, milestone_type, milestone_name, description, 
        discipline_name, value
      ) VALUES (
        completed_course.user_id, 'first_class', 'Premier cours',
        'Félicitations pour votre premier cours de ' || completed_course.discipline_name || ' !',
        completed_course.discipline_name, 1
      );
    END IF;

    -- Classes milestones (5, 10, 25, 50, 100)
    IF stats_record.total_courses IN (5, 10, 25, 50, 100) THEN
      INSERT INTO member_milestones (
        member_id, milestone_type, milestone_name, description, 
        discipline_name, value
      ) VALUES (
        completed_course.user_id, 'classes_milestone', 
        stats_record.total_courses || ' cours complétés',
        'Bravo ! Vous avez complété ' || stats_record.total_courses || ' cours de ' || completed_course.discipline_name,
        completed_course.discipline_name, stats_record.total_courses
      );
    END IF;

  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically run the transfer function
CREATE OR REPLACE FUNCTION trigger_transfer_completed_courses()
RETURNS trigger AS $$
BEGIN
  -- Run the transfer function when new attendance is added
  PERFORM transfer_completed_courses();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on course_attendance table
DROP TRIGGER IF EXISTS auto_transfer_completed_courses ON course_attendance;
CREATE TRIGGER auto_transfer_completed_courses
  AFTER INSERT OR UPDATE ON course_attendance
  FOR EACH ROW
  EXECUTE FUNCTION trigger_transfer_completed_courses();

-- Run initial transfer for existing data
SELECT transfer_completed_courses();
