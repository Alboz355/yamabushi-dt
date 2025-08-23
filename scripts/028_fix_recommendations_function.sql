-- Create a simplified course recommendations function without ambiguous column references
DROP FUNCTION IF EXISTS get_user_course_recommendations(uuid);

CREATE OR REPLACE FUNCTION get_user_course_recommendations(user_uuid uuid)
RETURNS TABLE (
  course_id text,
  course_name text,
  discipline_name text,
  course_date text,
  course_time text,
  instructor text,
  club_name text,
  recommendation_score integer,
  reason text
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH user_preferences AS (
    -- Get user's most attended disciplines
    SELECT 
      ca.course_name,
      COUNT(*) as attendance_count,
      EXTRACT(HOUR FROM ca.course_time) as preferred_hour,
      EXTRACT(DOW FROM ca.course_date) as preferred_day
    FROM course_attendance ca
    WHERE ca.user_id = user_uuid
    GROUP BY ca.course_name, EXTRACT(HOUR FROM ca.course_time), EXTRACT(DOW FROM ca.course_date)
    ORDER BY attendance_count DESC
    LIMIT 5
  ),
  recommended_courses AS (
    SELECT 
      'yamabushi-' || CURRENT_DATE || '-' || ROW_NUMBER() OVER() as course_id,
      up.course_name,
      up.course_name as discipline_name,
      (CURRENT_DATE + INTERVAL '1 day')::text as course_date,
      (up.preferred_hour || ':00:00')::text as course_time,
      'Instructeur recommandé' as instructor,
      'Club Yamabushi' as club_name,
      (up.attendance_count * 10)::integer as recommendation_score,
      CASE 
        WHEN up.attendance_count >= 3 THEN 'Vous avez assisté à ' || up.attendance_count || ' cours de cette discipline'
        WHEN up.attendance_count >= 2 THEN 'Discipline que vous appréciez'
        ELSE 'Nouvelle discipline à découvrir'
      END as reason
    FROM user_preferences up
  )
  SELECT 
    rc.course_id,
    rc.course_name,
    rc.discipline_name,
    rc.course_date,
    rc.course_time,
    rc.instructor,
    rc.club_name,
    rc.recommendation_score,
    rc.reason
  FROM recommended_courses rc
  ORDER BY rc.recommendation_score DESC
  LIMIT 5;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_course_recommendations(uuid) TO authenticated;
