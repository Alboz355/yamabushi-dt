-- Create course attendance table for tracking who will attend courses
CREATE TABLE IF NOT EXISTS course_attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_name TEXT NOT NULL,
  course_date DATE NOT NULL,
  course_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Ensure one attendance record per user per course
  UNIQUE(course_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_course_attendance_course_id ON course_attendance(course_id);
CREATE INDEX IF NOT EXISTS idx_course_attendance_user_id ON course_attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_course_attendance_date ON course_attendance(course_date);

-- Enable RLS
ALTER TABLE course_attendance ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all attendance records" ON course_attendance
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own attendance" ON course_attendance
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attendance" ON course_attendance
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own attendance" ON course_attendance
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_course_attendance_updated_at 
  BEFORE UPDATE ON course_attendance 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
