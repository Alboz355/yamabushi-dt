-- Create table for targeted message recipients
CREATE TABLE IF NOT EXISTS targeted_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'info',
  priority INTEGER DEFAULT 1,
  
  -- Targeting criteria
  target_belt_levels TEXT[], -- Array of belt levels
  target_disciplines TEXT[], -- Array of discipline names
  target_frequency_min INTEGER, -- Minimum courses per month
  target_frequency_max INTEGER, -- Maximum courses per month
  target_last_activity_days INTEGER, -- Days since last activity
  target_membership_type TEXT, -- Membership type filter
  target_age_category TEXT, -- Age category filter
  
  -- Message settings
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  send_immediately BOOLEAN DEFAULT false,
  scheduled_send_at TIMESTAMP WITH TIME ZONE,
  
  -- Tracking
  recipients_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for message delivery tracking
CREATE TABLE IF NOT EXISTS message_deliveries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES targeted_messages(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delivered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  is_read BOOLEAN DEFAULT false,
  UNIQUE(message_id, recipient_id)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_targeted_messages_active ON targeted_messages(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_message_deliveries_recipient ON message_deliveries(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_message_deliveries_message ON message_deliveries(message_id);

-- Enable RLS
ALTER TABLE targeted_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_deliveries ENABLE ROW LEVEL SECURITY;

-- RLS policies for targeted_messages
CREATE POLICY "Admins can manage targeted messages" ON targeted_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can view messages sent to them" ON targeted_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM message_deliveries 
      WHERE message_deliveries.message_id = targeted_messages.id 
      AND message_deliveries.recipient_id = auth.uid()
    )
  );

-- RLS policies for message_deliveries
CREATE POLICY "Users can view their own deliveries" ON message_deliveries
  FOR SELECT USING (auth.uid() = recipient_id);

CREATE POLICY "Users can update their own delivery status" ON message_deliveries
  FOR UPDATE USING (auth.uid() = recipient_id);

CREATE POLICY "Admins can manage all deliveries" ON message_deliveries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Create function to calculate recipient count based on criteria
CREATE OR REPLACE FUNCTION calculate_recipients_count(
  p_target_belt_levels TEXT[] DEFAULT NULL,
  p_target_disciplines TEXT[] DEFAULT NULL,
  p_target_frequency_min INTEGER DEFAULT NULL,
  p_target_frequency_max INTEGER DEFAULT NULL,
  p_target_last_activity_days INTEGER DEFAULT NULL,
  p_target_membership_type TEXT DEFAULT NULL,
  p_target_age_category TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  recipient_count INTEGER;
BEGIN
  WITH filtered_users AS (
    SELECT DISTINCT p.id
    FROM profiles p
    LEFT JOIN member_progress mp ON p.id = mp.member_id
    LEFT JOIN course_attendance ca ON p.id = ca.user_id
    LEFT JOIN (
      SELECT 
        user_id,
        COUNT(*) as monthly_courses,
        MAX(course_date) as last_activity
      FROM course_attendance 
      WHERE course_date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY user_id
    ) activity ON p.id = activity.user_id
    WHERE 1=1
      -- Belt level filter
      AND (p_target_belt_levels IS NULL OR mp.current_belt = ANY(p_target_belt_levels))
      -- Discipline filter
      AND (p_target_disciplines IS NULL OR ca.course_name = ANY(p_target_disciplines))
      -- Frequency filter
      AND (p_target_frequency_min IS NULL OR COALESCE(activity.monthly_courses, 0) >= p_target_frequency_min)
      AND (p_target_frequency_max IS NULL OR COALESCE(activity.monthly_courses, 0) <= p_target_frequency_max)
      -- Last activity filter
      AND (p_target_last_activity_days IS NULL OR 
           (activity.last_activity IS NOT NULL AND 
            activity.last_activity >= CURRENT_DATE - INTERVAL '1 day' * p_target_last_activity_days))
      -- Membership type filter
      AND (p_target_membership_type IS NULL OR p.membership_type = p_target_membership_type)
      -- Age category filter
      AND (p_target_age_category IS NULL OR p.age_category = p_target_age_category)
  )
  SELECT COUNT(*) INTO recipient_count FROM filtered_users;
  
  RETURN recipient_count;
END;
$$;
