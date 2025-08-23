-- Enhanced progression system linking bookings with progress tracking
-- This script creates tables and functions to automatically track progress from course attendance

-- Create enhanced member progress tracking table
CREATE TABLE IF NOT EXISTS member_course_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL,
  course_name TEXT NOT NULL,
  discipline_name TEXT NOT NULL,
  course_date DATE NOT NULL,
  course_time TEXT NOT NULL,
  instructor_name TEXT,
  club_name TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'missed', 'cancelled')),
  added_manually BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create discipline statistics table
CREATE TABLE IF NOT EXISTS member_discipline_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  discipline_name TEXT NOT NULL,
  total_courses INTEGER DEFAULT 0,
  courses_this_month INTEGER DEFAULT 0,
  courses_this_week INTEGER DEFAULT 0,
  first_course_date DATE,
  last_course_date DATE,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  favorite_instructor TEXT,
  favorite_club TEXT,
  total_hours DECIMAL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(member_id, discipline_name)
);

-- Create progression milestones table
CREATE TABLE IF NOT EXISTS member_milestones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL, -- 'courses_completed', 'discipline_unlocked', 'streak_achieved', 'belt_earned'
  milestone_name TEXT NOT NULL,
  milestone_description TEXT,
  discipline_name TEXT,
  achieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  value INTEGER, -- number of courses, streak length, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to automatically process completed courses
CREATE OR REPLACE FUNCTION process_completed_course()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if course date has passed
  IF NEW.course_date <= CURRENT_DATE THEN
    -- Add to course history
    INSERT INTO member_course_history (
      member_id, course_id, course_name, discipline_name, 
      course_date, course_time, instructor_name, club_name, status
    ) VALUES (
      NEW.user_id, NEW.course_id, NEW.course_name, 
      COALESCE(NEW.discipline_name, 'Unknown'), 
      NEW.course_date::DATE, NEW.course_time, 
      NEW.instructor_name, NEW.club_name, 'completed'
    )
    ON CONFLICT DO NOTHING;

    -- Update discipline statistics
    INSERT INTO member_discipline_stats (
      member_id, discipline_name, total_courses, courses_this_month, courses_this_week,
      first_course_date, last_course_date, total_hours
    ) VALUES (
      NEW.user_id, COALESCE(NEW.discipline_name, 'Unknown'), 1, 
      CASE WHEN NEW.course_date::DATE >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 ELSE 0 END,
      CASE WHEN NEW.course_date::DATE >= DATE_TRUNC('week', CURRENT_DATE) THEN 1 ELSE 0 END,
      NEW.course_date::DATE, NEW.course_date::DATE, 1.5
    )
    ON CONFLICT (member_id, discipline_name) DO UPDATE SET
      total_courses = member_discipline_stats.total_courses + 1,
      courses_this_month = CASE 
        WHEN NEW.course_date::DATE >= DATE_TRUNC('month', CURRENT_DATE) 
        THEN member_discipline_stats.courses_this_month + 1 
        ELSE member_discipline_stats.courses_this_month 
      END,
      courses_this_week = CASE 
        WHEN NEW.course_date::DATE >= DATE_TRUNC('week', CURRENT_DATE) 
        THEN member_discipline_stats.courses_this_week + 1 
        ELSE member_discipline_stats.courses_this_week 
      END,
      last_course_date = NEW.course_date::DATE,
      total_hours = member_discipline_stats.total_hours + 1.5,
      updated_at = NOW();

    -- Check for milestones
    PERFORM check_member_milestones(NEW.user_id, COALESCE(NEW.discipline_name, 'Unknown'));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to check and award milestones
CREATE OR REPLACE FUNCTION check_member_milestones(user_id UUID, discipline TEXT)
RETURNS VOID AS $$
DECLARE
  total_courses INTEGER;
  discipline_courses INTEGER;
  total_disciplines INTEGER;
BEGIN
  -- Get current stats
  SELECT COALESCE(SUM(total_courses), 0) INTO total_courses 
  FROM member_discipline_stats WHERE member_id = user_id;
  
  SELECT COALESCE(total_courses, 0) INTO discipline_courses 
  FROM member_discipline_stats WHERE member_id = user_id AND discipline_name = discipline;
  
  SELECT COUNT(DISTINCT discipline_name) INTO total_disciplines 
  FROM member_discipline_stats WHERE member_id = user_id;

  -- Award milestones
  -- First course milestone
  IF total_courses = 1 THEN
    INSERT INTO member_milestones (member_id, milestone_type, milestone_name, milestone_description, value)
    VALUES (user_id, 'courses_completed', 'Premier Cours', 'Félicitations pour votre premier cours !', 1)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Course count milestones
  IF total_courses IN (5, 10, 25, 50, 100) THEN
    INSERT INTO member_milestones (member_id, milestone_type, milestone_name, milestone_description, value)
    VALUES (user_id, 'courses_completed', total_courses || ' Cours', 
            'Vous avez complété ' || total_courses || ' cours !', total_courses)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Discipline milestones
  IF discipline_courses IN (1, 5, 10, 20) THEN
    INSERT INTO member_milestones (member_id, milestone_type, milestone_name, milestone_description, discipline_name, value)
    VALUES (user_id, 'discipline_unlocked', discipline || ' - ' || discipline_courses || ' cours', 
            'Progression en ' || discipline, discipline, discipline_courses)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Multi-discipline milestone
  IF total_disciplines >= 3 THEN
    INSERT INTO member_milestones (member_id, milestone_type, milestone_name, milestone_description, value)
    VALUES (user_id, 'discipline_unlocked', 'Polyvalent', 
            'Vous pratiquez ' || total_disciplines || ' disciplines !', total_disciplines)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically process completed courses
DROP TRIGGER IF EXISTS trigger_process_completed_course ON course_attendance;
CREATE TRIGGER trigger_process_completed_course
  AFTER INSERT OR UPDATE ON course_attendance
  FOR EACH ROW
  EXECUTE FUNCTION process_completed_course();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_member_course_history_member_date ON member_course_history(member_id, course_date DESC);
CREATE INDEX IF NOT EXISTS idx_member_discipline_stats_member ON member_discipline_stats(member_id);
CREATE INDEX IF NOT EXISTS idx_member_milestones_member ON member_milestones(member_id, achieved_at DESC);

-- Enable RLS
ALTER TABLE member_course_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_discipline_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own course history" ON member_course_history
  FOR SELECT USING (auth.uid() = member_id);

CREATE POLICY "Users can insert own course history" ON member_course_history
  FOR INSERT WITH CHECK (auth.uid() = member_id);

CREATE POLICY "Users can update own course history" ON member_course_history
  FOR UPDATE USING (auth.uid() = member_id);

CREATE POLICY "Users can view own discipline stats" ON member_discipline_stats
  FOR SELECT USING (auth.uid() = member_id);

CREATE POLICY "Users can view own milestones" ON member_milestones
  FOR SELECT USING (auth.uid() = member_id);

-- Insert some sample data for testing
INSERT INTO member_course_history (member_id, course_id, course_name, discipline_name, course_date, course_time, instructor_name, club_name, status, added_manually)
SELECT 
  id as member_id,
  'sample-kickboxing-' || generate_random_uuid() as course_id,
  'Kickboxing Débutant' as course_name,
  'Kickboxing' as discipline_name,
  CURRENT_DATE - INTERVAL '7 days' as course_date,
  '18:00' as course_time,
  'Coach Sarah Martinez' as instructor_name,
  'Yamabushi Genève Centre' as club_name,
  'completed' as status,
  false as added_manually
FROM profiles 
WHERE email IS NOT NULL
LIMIT 1
ON CONFLICT DO NOTHING;

COMMIT;
