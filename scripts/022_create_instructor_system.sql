-- Create activity logs table for tracking admin and instructor actions
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_role TEXT NOT NULL, -- 'admin' or 'instructor'
  action_type TEXT NOT NULL, -- 'create', 'update', 'delete', 'assign', 'message', etc.
  resource_type TEXT NOT NULL, -- 'user', 'class', 'schedule', 'message', etc.
  resource_id UUID, -- ID of the affected resource
  description TEXT NOT NULL, -- Human readable description of the action
  metadata JSONB, -- Additional data about the action
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for activity logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource_type ON activity_logs(resource_type);

-- Create room messages table for instructor messages on behalf of rooms
CREATE TABLE IF NOT EXISTS room_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
  room_name TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'info', -- 'info', 'warning', 'announcement', 'schedule_change'
  priority INTEGER DEFAULT 1, -- 1-5, 5 being highest priority
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for room messages
CREATE INDEX IF NOT EXISTS idx_room_messages_instructor_id ON room_messages(instructor_id);
CREATE INDEX IF NOT EXISTS idx_room_messages_room_name ON room_messages(room_name);
CREATE INDEX IF NOT EXISTS idx_room_messages_created_at ON room_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_room_messages_is_active ON room_messages(is_active);

-- Update profiles table to ensure role column has proper constraints
ALTER TABLE profiles 
ADD CONSTRAINT check_role_values 
CHECK (role IN ('user', 'admin', 'instructor'));

-- Create function to log activities
CREATE OR REPLACE FUNCTION log_activity(
  p_user_id UUID,
  p_user_role TEXT,
  p_action_type TEXT,
  p_resource_type TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT '',
  p_metadata JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO activity_logs (
    user_id, user_role, action_type, resource_type, resource_id,
    description, metadata, ip_address, user_agent
  ) VALUES (
    p_user_id, p_user_role, p_action_type, p_resource_type, p_resource_id,
    p_description, p_metadata, p_ip_address, p_user_agent
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to automatically log instructor assignments
CREATE OR REPLACE FUNCTION log_instructor_assignment() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_activity(
      NEW.assigned_by,
      'admin',
      'assign',
      'instructor_class',
      NEW.id,
      'Assigned instructor to class',
      jsonb_build_object(
        'instructor_id', NEW.instructor_id,
        'class_id', NEW.class_id,
        'is_active', NEW.is_active
      )
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_activity(
      COALESCE(NEW.assigned_by, OLD.assigned_by),
      'admin',
      'update',
      'instructor_class',
      NEW.id,
      'Updated instructor class assignment',
      jsonb_build_object(
        'instructor_id', NEW.instructor_id,
        'class_id', NEW.class_id,
        'is_active', NEW.is_active,
        'previous_active', OLD.is_active
      )
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_activity(
      OLD.assigned_by,
      'admin',
      'delete',
      'instructor_class',
      OLD.id,
      'Removed instructor class assignment',
      jsonb_build_object(
        'instructor_id', OLD.instructor_id,
        'class_id', OLD.class_id
      )
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for instructor assignments
DROP TRIGGER IF EXISTS trigger_log_instructor_assignment ON instructor_class_assignments;
CREATE TRIGGER trigger_log_instructor_assignment
  AFTER INSERT OR UPDATE OR DELETE ON instructor_class_assignments
  FOR EACH ROW EXECUTE FUNCTION log_instructor_assignment();

-- Create trigger function to log role changes
CREATE OR REPLACE FUNCTION log_role_change() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.role != NEW.role THEN
    PERFORM log_activity(
      NEW.id,
      NEW.role,
      'update',
      'user_role',
      NEW.id,
      'User role changed from ' || OLD.role || ' to ' || NEW.role,
      jsonb_build_object(
        'previous_role', OLD.role,
        'new_role', NEW.role,
        'user_email', NEW.email
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for role changes
DROP TRIGGER IF EXISTS trigger_log_role_change ON profiles;
CREATE TRIGGER trigger_log_role_change
  AFTER UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION log_role_change();

-- Insert some sample activity log entries for testing
INSERT INTO activity_logs (user_id, user_role, action_type, resource_type, description, metadata)
SELECT 
  p.id,
  'admin',
  'system_init',
  'database',
  'Instructor system initialized',
  jsonb_build_object('version', '1.0', 'tables_created', 'activity_logs, room_messages')
FROM profiles p 
WHERE p.role = 'admin' 
LIMIT 1;

-- Enable RLS on new tables
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for activity_logs (only admins can see all logs)
CREATE POLICY "Admins can view all activity logs" ON activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Create RLS policies for room_messages
CREATE POLICY "Instructors can manage their room messages" ON room_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM instructors i
      JOIN profiles p ON i.profile_id = p.id
      WHERE p.id = auth.uid() 
      AND i.id = room_messages.instructor_id
    )
  );

CREATE POLICY "Admins can manage all room messages" ON room_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can view active room messages" ON room_messages
  FOR SELECT USING (
    is_active = true 
    AND (expires_at IS NULL OR expires_at > NOW())
  );
