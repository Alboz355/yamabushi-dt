-- Add missing duration column to instructor_courses table
ALTER TABLE instructor_courses 
ADD COLUMN IF NOT EXISTS duration integer DEFAULT 60;

-- Create function to sync instructor courses with unified_bookings system
CREATE OR REPLACE FUNCTION sync_instructor_course_to_bookings()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new instructor course is created, create corresponding booking entries
  IF TG_OP = 'INSERT' AND NEW.is_active = true THEN
    -- For recurring courses, create multiple booking entries
    IF NEW.recurrence_type = 'weekly' AND NEW.recurrence_days IS NOT NULL THEN
      -- This will be handled by a separate function for recurring courses
      PERFORM create_recurring_course_bookings(NEW.id);
    ELSE
      -- For single courses, create one booking entry
      INSERT INTO unified_bookings (
        id,
        course_id,
        course_name,
        course_date,
        course_time,
        instructor,
        club_name,
        status,
        user_id,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        'instructor-' || NEW.id::text,
        NEW.title,
        NEW.start_date,
        NEW.start_time,
        (SELECT COALESCE(p.first_name || ' ' || p.last_name, 'Instructeur') 
         FROM profiles p 
         WHERE p.id = NEW.instructor_id),
        'Yamabushi Academy',
        'available',
        NULL, -- No specific user, available for booking
        NOW(),
        NOW()
      );
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for instructor course sync
DROP TRIGGER IF EXISTS sync_instructor_courses_trigger ON instructor_courses;
CREATE TRIGGER sync_instructor_courses_trigger
  AFTER INSERT OR UPDATE ON instructor_courses
  FOR EACH ROW
  EXECUTE FUNCTION sync_instructor_course_to_bookings();

-- Create function to handle recurring course bookings
CREATE OR REPLACE FUNCTION create_recurring_course_bookings(course_id uuid)
RETURNS void AS $$
DECLARE
  course_record instructor_courses%ROWTYPE;
  booking_date date;
  end_date date;
  day_num integer;
  instructor_name text;
BEGIN
  -- Get course details
  SELECT * INTO course_record FROM instructor_courses WHERE id = course_id;
  
  -- Get instructor name
  SELECT COALESCE(p.first_name || ' ' || p.last_name, 'Instructeur') 
  INTO instructor_name
  FROM profiles p 
  WHERE p.id = course_record.instructor_id;
  
  -- Set end date (max 6 months from start)
  end_date := LEAST(course_record.end_date, course_record.start_date + INTERVAL '6 months');
  
  -- Create bookings for each occurrence
  booking_date := course_record.start_date;
  
  WHILE booking_date <= end_date LOOP
    -- Check if current day of week is in recurrence_days
    day_num := EXTRACT(DOW FROM booking_date); -- 0=Sunday, 1=Monday, etc.
    
    IF day_num = ANY(course_record.recurrence_days) THEN
      INSERT INTO unified_bookings (
        id,
        course_id,
        course_name,
        course_date,
        course_time,
        instructor,
        club_name,
        status,
        user_id,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        'instructor-' || course_record.id::text || '-' || booking_date::text,
        course_record.title,
        booking_date,
        course_record.start_time,
        instructor_name,
        'Yamabushi Academy',
        'available',
        NULL,
        NOW(),
        NOW()
      );
    END IF;
    
    booking_date := booking_date + INTERVAL '1 day';
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create table for instructor course registrations (J'y serai functionality)
CREATE TABLE IF NOT EXISTS instructor_course_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES instructor_courses(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  session_date date NOT NULL,
  status varchar(20) DEFAULT 'registered' CHECK (status IN ('registered', 'confirmed', 'rejected', 'cancelled')),
  confirmed_by uuid REFERENCES profiles(id),
  confirmed_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW(),
  UNIQUE(course_id, user_id, session_date)
);

-- Enable RLS on instructor_course_registrations
ALTER TABLE instructor_course_registrations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for instructor_course_registrations
CREATE POLICY "Users can view their own registrations" ON instructor_course_registrations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can register for courses" ON instructor_course_registrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own registrations" ON instructor_course_registrations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Instructors can view registrations for their courses" ON instructor_course_registrations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM instructor_courses ic 
      WHERE ic.id = course_id AND ic.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can update registrations for their courses" ON instructor_course_registrations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM instructor_courses ic 
      WHERE ic.id = course_id AND ic.instructor_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_instructor_course_registrations_course_id ON instructor_course_registrations(course_id);
CREATE INDEX IF NOT EXISTS idx_instructor_course_registrations_user_id ON instructor_course_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_instructor_course_registrations_session_date ON instructor_course_registrations(session_date);
