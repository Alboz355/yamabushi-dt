-- Create instructor permissions and role management
CREATE TABLE IF NOT EXISTS instructor_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  instructor_id UUID REFERENCES instructors(id) ON DELETE CASCADE,
  permission_type VARCHAR(50) NOT NULL, -- 'view_participants', 'validate_attendance', 'add_progress_notes'
  resource_id UUID, -- Can be class_id, discipline_id, etc.
  resource_type VARCHAR(50), -- 'class', 'discipline', 'all'
  granted_by UUID REFERENCES profiles(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create instructor class assignments
CREATE TABLE IF NOT EXISTS instructor_class_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  instructor_id UUID REFERENCES instructors(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES profiles(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(instructor_id, class_id)
);

-- Create instructor session notes
CREATE TABLE IF NOT EXISTS instructor_session_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  instructor_id UUID REFERENCES instructors(id) ON DELETE CASCADE,
  class_session_id UUID REFERENCES class_sessions(id) ON DELETE CASCADE,
  member_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  notes TEXT NOT NULL,
  progress_rating INTEGER CHECK (progress_rating >= 1 AND progress_rating <= 5),
  techniques_practiced TEXT[],
  areas_for_improvement TEXT,
  strengths_observed TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update profiles table to ensure role column has proper constraints
DO $$
BEGIN
  -- Add check constraint for role if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'profiles_role_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('admin', 'user', 'instructor'));
  END IF;
END $$;

-- Create function to automatically create instructor record when role is set to instructor
CREATE OR REPLACE FUNCTION create_instructor_on_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If role is changed to instructor and no instructor record exists
  IF NEW.role = 'instructor' AND OLD.role != 'instructor' THEN
    INSERT INTO instructors (profile_id, bio, years_experience, is_active)
    VALUES (NEW.id, 'Instructeur certifié Yamabushi Academy', 0, true)
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;
  
  -- If role is changed from instructor, deactivate instructor record
  IF OLD.role = 'instructor' AND NEW.role != 'instructor' THEN
    UPDATE instructors SET is_active = false WHERE profile_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic instructor creation
DROP TRIGGER IF EXISTS trigger_create_instructor_on_role_change ON profiles;
CREATE TRIGGER trigger_create_instructor_on_role_change
  AFTER UPDATE OF role ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_instructor_on_role_change();

-- Insert default permissions for instructors
INSERT INTO instructor_permissions (instructor_id, permission_type, resource_type, granted_by)
SELECT 
  i.id,
  unnest(ARRAY['view_participants', 'validate_attendance', 'add_progress_notes']) as permission_type,
  'all' as resource_type,
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1) as granted_by
FROM instructors i
WHERE i.is_active = true
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_instructor_permissions_instructor_id ON instructor_permissions(instructor_id);
CREATE INDEX IF NOT EXISTS idx_instructor_class_assignments_instructor_id ON instructor_class_assignments(instructor_id);
CREATE INDEX IF NOT EXISTS idx_instructor_class_assignments_class_id ON instructor_class_assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_instructor_session_notes_instructor_id ON instructor_session_notes(instructor_id);
CREATE INDEX IF NOT EXISTS idx_instructor_session_notes_member_id ON instructor_session_notes(member_id);
