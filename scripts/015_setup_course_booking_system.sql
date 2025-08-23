-- Updated script to ensure all tables and data are created properly for course booking system
-- Creating complete course booking system with disciplines, instructors, classes and booking logic

-- Adding rooms table and data first
INSERT INTO rooms (id, name, capacity, location, equipment, is_active) VALUES
  (gen_random_uuid(), 'Dojo Principal', 25, 'Rez-de-chaussée', ARRAY['Tatamis', 'Miroirs', 'Sacs de frappe'], true),
  (gen_random_uuid(), 'Salle de Musculation', 15, '1er étage', ARRAY['Haltères', 'Machines', 'Barres'], true),
  (gen_random_uuid(), 'Studio Cardio', 20, '1er étage', ARRAY['Miroirs', 'Système audio', 'Tapis'], true),
  (gen_random_uuid(), 'Dojo Secondaire', 15, 'Sous-sol', ARRAY['Tatamis', 'Équipement grappling'], true)
ON CONFLICT (name) DO NOTHING;

-- Insert disciplines based on Yamabushi.ch
INSERT INTO disciplines (id, name, description, color_code) VALUES
  (gen_random_uuid(), 'Kickboxing', 'Le kick-boxing est une boxe pieds-poings développée au début des années 1960 par les américains', '#FF6B35'),
  (gen_random_uuid(), 'JJB', 'Le jiu-jitsu brésilien est un art martial, un sport de combat et un système de défense personnelle', '#4ECDC4'),
  (gen_random_uuid(), 'Muay Thai', 'La boxe thaïlandaise, ou muay-thaï, est une boxe pieds-poings trouvant ses origines en Thaïlande', '#45B7D1'),
  (gen_random_uuid(), 'Grappling', 'Le grappling désigne l''ensemble des techniques de contrôle, projection et soumission', '#96CEB4'),
  (gen_random_uuid(), 'MMA', 'Les arts martiaux mixtes (MMA) combinent différentes techniques de combat', '#FFEAA7'),
  (gen_random_uuid(), 'Boxe anglaise', 'La boxe anglaise, aussi appelée le noble art, est un sport de combat dans lequel deux adversaires s''affrontent', '#DDA0DD'),
  (gen_random_uuid(), 'Cross Training', 'Le Cross Training est une méthode de conditionnement physique de type entraînement croisé', '#74B9FF'),
  (gen_random_uuid(), 'Jiu-Jitsu', 'Le ju-jitsu regroupe des techniques de combat qui furent développées par les samouraïs', '#A29BFE'),
  (gen_random_uuid(), 'Cardio Boxing', 'Le cardio boxing consiste à reproduire des mouvements et enchaînements de boxe sur de la musique rythmée', '#FD79A8'),
  (gen_random_uuid(), 'Lutte', 'La lutte est un système de combat à mains nues au cours duquel les adversaires se mesurent au corps à corps', '#FDCB6E'),
  (gen_random_uuid(), 'Musculation', 'La condition physique est essentielle pour pratiquer un sport sans risque', '#6C5CE7'),
  (gen_random_uuid(), 'Judo', 'Sport de combat d''origine japonaise qui se pratique à mains nues, sans porter de coups', '#E17055')
ON CONFLICT (name) DO NOTHING;

-- Creating sample instructor profiles first
INSERT INTO profiles (id, first_name, last_name, email, phone, date_of_birth, address, city, postal_code, country, emergency_contact_name, emergency_contact_phone, photo_url, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  first_names.name,
  last_names.name,
  lower(first_names.name) || '.' || lower(last_names.name) || '@yamabushi.ch',
  '+41 79 ' || (random() * 900 + 100)::int || ' ' || (random() * 90 + 10)::int || ' ' || (random() * 90 + 10)::int,
  '1985-01-01'::date + (random() * 365 * 15)::int,
  'Rue de la Paix ' || (random() * 100 + 1)::int,
  'Genève',
  '1200',
  'Suisse',
  'Contact urgence',
  '+41 79 123 45 67',
  '/placeholder.svg?height=100&width=100',
  now(),
  now()
FROM (VALUES ('Jean'), ('Marie'), ('Pierre'), ('Sophie'), ('Luc')) AS first_names(name)
CROSS JOIN (VALUES ('Martin'), ('Dubois'), ('Moreau'), ('Laurent'), ('Simon')) AS last_names(name)
LIMIT 5
ON CONFLICT (email) DO NOTHING;

-- Insert sample instructors
INSERT INTO instructors (id, profile_id, bio, years_experience, certifications, specialties, is_active)
SELECT 
  gen_random_uuid(),
  p.id,
  'Instructeur expérimenté en arts martiaux avec ' || (5 + random() * 15)::int || ' années d''expérience',
  (5 + random() * 15)::int,
  ARRAY['Ceinture noire', 'Instructeur certifié'],
  CASE 
    WHEN row_number() OVER () % 3 = 1 THEN ARRAY['Kickboxing', 'Muay Thai', 'Boxe anglaise']
    WHEN row_number() OVER () % 3 = 2 THEN ARRAY['JJB', 'Grappling', 'Judo']
    ELSE ARRAY['Cross Training', 'Musculation', 'Cardio Boxing']
  END,
  true
FROM profiles p
WHERE p.email LIKE '%@yamabushi.ch'
LIMIT 5
ON CONFLICT DO NOTHING;

-- Insert sample classes for each discipline with room assignments
WITH discipline_data AS (
  SELECT id, name FROM disciplines
),
instructor_data AS (
  SELECT id FROM instructors LIMIT 5
),
room_data AS (
  SELECT id, name FROM rooms
)
INSERT INTO classes (id, name, discipline_id, instructor_id, room_id, level, description, max_capacity, duration_minutes, price, is_active)
SELECT 
  gen_random_uuid(),
  d.name || ' - ' || 
  CASE 
    WHEN row_number() OVER (PARTITION BY d.id ORDER BY i.id) = 1 THEN 'Débutant'
    WHEN row_number() OVER (PARTITION BY d.id ORDER BY i.id) = 2 THEN 'Intermédiaire'
    ELSE 'Avancé'
  END,
  d.id,
  i.id,
  CASE 
    WHEN d.name IN ('Musculation') THEN (SELECT id FROM room_data WHERE name = 'Salle de Musculation')
    WHEN d.name IN ('Cardio Boxing', 'Cross Training') THEN (SELECT id FROM room_data WHERE name = 'Studio Cardio')
    WHEN d.name IN ('JJB', 'Grappling') THEN (SELECT id FROM room_data WHERE name = 'Dojo Secondaire')
    ELSE (SELECT id FROM room_data WHERE name = 'Dojo Principal')
  END,
  CASE 
    WHEN row_number() OVER (PARTITION BY d.id ORDER BY i.id) = 1 THEN 'beginner'
    WHEN row_number() OVER (PARTITION BY d.id ORDER BY i.id) = 2 THEN 'intermediate'
    ELSE 'advanced'
  END,
  'Cours de ' || d.name || ' pour tous niveaux',
  CASE 
    WHEN d.name IN ('Musculation', 'Cross Training') THEN 15
    WHEN d.name IN ('JJB', 'Grappling', 'Judo', 'Lutte') THEN 12
    ELSE 20
  END,
  CASE 
    WHEN d.name = 'Cardio Boxing' THEN 45
    WHEN d.name IN ('Cross Training', 'Musculation') THEN 60
    ELSE 90
  END,
  CASE 
    WHEN d.name IN ('Cardio Boxing', 'Cross Training') THEN 25.00
    WHEN d.name = 'Musculation' THEN 20.00
    ELSE 35.00
  END,
  true
FROM discipline_data d
CROSS JOIN instructor_data i
WHERE row_number() OVER (PARTITION BY d.id ORDER BY i.id) <= 2
ON CONFLICT DO NOTHING;

-- Insert class schedules (recurring weekly schedules)
WITH class_data AS (
  SELECT id, name, max_capacity FROM classes
)
INSERT INTO class_schedules (id, class_id, day_of_week, start_time, end_time, is_active)
SELECT 
  gen_random_uuid(),
  c.id,
  CASE 
    WHEN row_number() OVER (PARTITION BY c.id ORDER BY c.name) % 6 = 0 THEN 1 -- Monday
    WHEN row_number() OVER (PARTITION BY c.id ORDER BY c.name) % 6 = 1 THEN 2 -- Tuesday
    WHEN row_number() OVER (PARTITION BY c.id ORDER BY c.name) % 6 = 2 THEN 3 -- Wednesday
    WHEN row_number() OVER (PARTITION BY c.id ORDER BY c.name) % 6 = 3 THEN 4 -- Thursday
    WHEN row_number() OVER (PARTITION BY c.id ORDER BY c.name) % 6 = 4 THEN 5 -- Friday
    ELSE 6 -- Saturday
  END,
  CASE 
    WHEN row_number() OVER (PARTITION BY c.id ORDER BY c.name) % 3 = 0 THEN '09:00'
    WHEN row_number() OVER (PARTITION BY c.id ORDER BY c.name) % 3 = 1 THEN '18:00'
    ELSE '20:00'
  END,
  CASE 
    WHEN row_number() OVER (PARTITION BY c.id ORDER BY c.name) % 3 = 0 THEN '10:30'
    WHEN row_number() OVER (PARTITION BY c.id ORDER BY c.name) % 3 = 1 THEN '19:30'
    ELSE '21:30'
  END,
  true
FROM class_data c
ON CONFLICT DO NOTHING;

-- Create function to generate class sessions with available_spots field
CREATE OR REPLACE FUNCTION generate_class_sessions()
RETURNS void AS $$
DECLARE
  schedule_record RECORD;
  session_date DATE;
  start_date DATE := CURRENT_DATE;
  end_date DATE := CURRENT_DATE + INTERVAL '30 days';
BEGIN
  -- Loop through each class schedule
  FOR schedule_record IN 
    SELECT cs.*, c.instructor_id, c.max_capacity, c.duration_minutes
    FROM class_schedules cs
    JOIN classes c ON cs.class_id = c.id
    WHERE cs.is_active = true
  LOOP
    -- Generate sessions for the next 30 days
    session_date := start_date;
    WHILE session_date <= end_date LOOP
      -- Check if this date matches the day of week (0=Sunday, 1=Monday, etc.)
      IF EXTRACT(DOW FROM session_date) = schedule_record.day_of_week THEN
        INSERT INTO class_sessions (
          id, class_id, instructor_id, session_date, 
          start_time, end_time, available_spots, status
        ) VALUES (
          gen_random_uuid(),
          schedule_record.class_id,
          schedule_record.instructor_id,
          session_date,
          schedule_record.start_time,
          schedule_record.end_time,
          schedule_record.max_capacity,
          'scheduled'
        )
        ON CONFLICT (class_id, session_date, start_time) DO NOTHING;
      END IF;
      session_date := session_date + INTERVAL '1 day';
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Generate initial class sessions
SELECT generate_class_sessions();

-- Create functions for booking management
CREATE OR REPLACE FUNCTION get_user_no_show_count(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  no_show_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO no_show_count
  FROM bookings b
  JOIN class_sessions cs ON b.session_id = cs.id
  LEFT JOIN attendance a ON b.id = a.booking_id
  WHERE b.member_id = user_id
    AND cs.session_date >= CURRENT_DATE - INTERVAL '30 days'
    AND cs.session_date < CURRENT_DATE
    AND b.status = 'confirmed'
    AND (a.id IS NULL OR a.status = 'no_show');
    
  RETURN COALESCE(no_show_count, 0);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION can_user_book(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_no_show_count(user_id) < 2;
END;
$$ LANGUAGE plpgsql;

-- Create RLS policies for bookings
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own bookings" ON bookings;
CREATE POLICY "Users can view their own bookings" ON bookings
  FOR SELECT USING (auth.uid() = member_id);

DROP POLICY IF EXISTS "Users can create their own bookings" ON bookings;
CREATE POLICY "Users can create their own bookings" ON bookings
  FOR INSERT WITH CHECK (auth.uid() = member_id);

DROP POLICY IF EXISTS "Users can update their own bookings" ON bookings;
CREATE POLICY "Users can update their own bookings" ON bookings
  FOR UPDATE USING (auth.uid() = member_id);

-- Create RLS policies for class_sessions (public read)
ALTER TABLE class_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view class sessions" ON class_sessions;
CREATE POLICY "Anyone can view class sessions" ON class_sessions
  FOR SELECT USING (true);

-- Create RLS policies for classes (public read)
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view classes" ON classes;
CREATE POLICY "Anyone can view classes" ON classes
  FOR SELECT USING (true);

-- Create RLS policies for disciplines (public read)
ALTER TABLE disciplines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view disciplines" ON disciplines;
CREATE POLICY "Anyone can view disciplines" ON disciplines
  FOR SELECT USING (true);

-- Create RLS policies for instructors (public read)
ALTER TABLE instructors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view instructors" ON instructors;
CREATE POLICY "Anyone can view instructors" ON instructors
  FOR SELECT USING (true);

-- Create RLS policies for rooms (public read)
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view rooms" ON rooms;
CREATE POLICY "Anyone can view rooms" ON rooms
  FOR SELECT USING (true);

-- Create RLS policies for class_schedules (public read)
ALTER TABLE class_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view class schedules" ON class_schedules;
CREATE POLICY "Anyone can view class schedules" ON class_schedules
  FOR SELECT USING (true);

-- Create RLS policies for attendance
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own attendance" ON attendance;
CREATE POLICY "Users can view their own attendance" ON attendance
  FOR SELECT USING (auth.uid() = member_id);

DROP POLICY IF EXISTS "Users can create their own attendance" ON attendance;
CREATE POLICY "Users can create their own attendance" ON attendance
  FOR INSERT WITH CHECK (auth.uid() = member_id);
