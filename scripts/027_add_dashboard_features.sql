-- Create club messages table for announcements
CREATE TABLE IF NOT EXISTS club_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'info' CHECK (message_type IN ('info', 'warning', 'success', 'error')),
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 1,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on club_messages
ALTER TABLE club_messages ENABLE ROW LEVEL SECURITY;

-- Create policy for club_messages (all authenticated users can read)
CREATE POLICY "Users can read active club messages" ON club_messages
  FOR SELECT TO authenticated
  USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));

-- Insert some sample club messages
INSERT INTO club_messages (title, message, message_type, priority) VALUES
('Cours annulé', 'Cours de Kickboxing annulé mercredi 18 décembre prochain', 'warning', 3),
('Nouveau planning', 'Le nouveau planning de janvier est disponible !', 'info', 2),
('Promotion spéciale', 'Réduction de 20% sur les cours privés ce mois-ci', 'success', 1);

-- Fixed ambiguous column reference by adding table alias
CREATE OR REPLACE FUNCTION get_user_course_recommendations(user_uuid UUID)
RETURNS TABLE (
  course_id TEXT,
  course_name TEXT,
  discipline_name TEXT,
  course_date DATE,
  course_time TIME,
  instructor TEXT,
  club_name TEXT,
  recommendation_score INTEGER,
  reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_preferences AS (
    -- Get user's most attended disciplines and preferred times
    SELECT 
      ca.course_name,
      COUNT(*) as attendance_count,
      EXTRACT(HOUR FROM ca.course_time) as preferred_hour,
      EXTRACT(DOW FROM ca.course_date) as preferred_day
    FROM course_attendance ca
    WHERE ca.user_id = user_uuid
    GROUP BY ca.course_name, EXTRACT(HOUR FROM ca.course_time), EXTRACT(DOW FROM ca.course_date)
  ),
  discipline_preferences AS (
    -- Get user's favorite disciplines
    SELECT 
      SPLIT_PART(up.course_name, ' ', 1) as discipline,
      SUM(up.attendance_count) as total_attendance
    FROM user_preferences up
    GROUP BY SPLIT_PART(up.course_name, ' ', 1)
    ORDER BY total_attendance DESC
    LIMIT 3
  )
  SELECT 
    'yamabushi-' || TO_CHAR(CURRENT_DATE + INTERVAL '1 day' + (generate_series(0, 6) || ' days')::INTERVAL, 'YYYY-MM-DD') || '-' || 
    EXTRACT(DOW FROM CURRENT_DATE + INTERVAL '1 day' + (generate_series(0, 6) || ' days')::INTERVAL)::TEXT || '-0-0' as course_id,
    dp.discipline || ' - Cours recommandé' as course_name,
    dp.discipline as discipline_name,
    (CURRENT_DATE + INTERVAL '1 day' + (generate_series(0, 6) || ' days')::INTERVAL)::DATE as course_date,
    '18:00:00'::TIME as course_time,
    'Instructeur Yamabushi' as instructor,
    'Yamabushi Genève' as club_name,
    (dp.total_attendance * 10)::INTEGER as recommendation_score,
    'Basé sur vos ' || dp.total_attendance || ' participations en ' || dp.discipline as reason
  FROM discipline_preferences dp
  LIMIT 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_course_recommendations(UUID) TO authenticated;
