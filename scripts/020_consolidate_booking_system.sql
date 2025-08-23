-- Consolidating booking systems and ensuring data consistency

-- Create a unified booking system that works with both attendance and reservations
CREATE TABLE IF NOT EXISTS unified_bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL,
  course_name TEXT NOT NULL,
  course_date DATE NOT NULL,
  course_time TIME NOT NULL,
  instructor TEXT,
  club_name TEXT,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  attendance_confirmed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_unified_bookings_user_id ON unified_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_unified_bookings_course_id ON unified_bookings(course_id);
CREATE INDEX IF NOT EXISTS idx_unified_bookings_date ON unified_bookings(course_date);

-- Enable RLS
ALTER TABLE unified_bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own bookings" ON unified_bookings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bookings" ON unified_bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings" ON unified_bookings
  FOR UPDATE USING (auth.uid() = user_id);

-- Migrate existing course_attendance data to unified_bookings
INSERT INTO unified_bookings (user_id, course_id, course_name, course_date, course_time, status, attendance_confirmed)
SELECT 
  user_id,
  course_id,
  course_name,
  course_date::DATE,
  course_time::TIME,
  'confirmed',
  TRUE
FROM course_attendance
ON CONFLICT DO NOTHING;

-- Function to automatically update progression when attendance is confirmed
CREATE OR REPLACE FUNCTION update_progression_on_attendance()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update progression if attendance is confirmed and course date has passed
  IF NEW.attendance_confirmed = TRUE AND NEW.course_date <= CURRENT_DATE THEN
    INSERT INTO member_progress (member_id, discipline_name, total_classes, experience_points, current_level, last_class_date)
    VALUES (NEW.user_id, NEW.course_name, 1, 10, 1, NEW.course_date)
    ON CONFLICT (member_id, discipline_name) 
    DO UPDATE SET
      total_classes = member_progress.total_classes + 1,
      experience_points = member_progress.experience_points + 10,
      current_level = LEAST(10, (member_progress.experience_points + 10) / 100 + 1),
      last_class_date = NEW.course_date,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic progression updates
DROP TRIGGER IF EXISTS trigger_update_progression ON unified_bookings;
CREATE TRIGGER trigger_update_progression
  AFTER INSERT OR UPDATE ON unified_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_progression_on_attendance();

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_unified_bookings_updated_at ON unified_bookings;
CREATE TRIGGER trigger_update_unified_bookings_updated_at
  BEFORE UPDATE ON unified_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
