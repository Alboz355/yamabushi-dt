-- Insert sample course data for Yamabushi booking system
-- This script populates the tables with real data so the booking page works

-- Insert disciplines
INSERT INTO disciplines (id, name, description, color_code) VALUES
  (gen_random_uuid(), 'Boxe anglaise', 'Boxe traditionnelle avec gants', '#ef4444'),
  (gen_random_uuid(), 'Cardio Boxing', 'Boxe fitness pour le cardio', '#f97316'),
  (gen_random_uuid(), 'Cross Training', 'Entraînement fonctionnel croisé', '#eab308'),
  (gen_random_uuid(), 'Grappling', 'Lutte au sol sans kimono', '#22c55e'),
  (gen_random_uuid(), 'Jiu-Jitsu', 'Art martial japonais traditionnel', '#06b6d4'),
  (gen_random_uuid(), 'JJB', 'Jiu-Jitsu Brésilien (BJJ)', '#3b82f6'),
  (gen_random_uuid(), 'Judo', 'Art martial japonais olympique', '#6366f1'),
  (gen_random_uuid(), 'Kickboxing', 'Boxe avec coups de pieds', '#8b5cf6'),
  (gen_random_uuid(), 'Lutte', 'Sport de combat olympique', '#a855f7'),
  (gen_random_uuid(), 'MMA', 'Arts martiaux mixtes', '#d946ef'),
  (gen_random_uuid(), 'Muay Thai', 'Boxe thaïlandaise traditionnelle', '#ec4899'),
  (gen_random_uuid(), 'Musculation', 'Renforcement musculaire', '#f43f5e')
ON CONFLICT (name) DO NOTHING;

-- Insert instructors
INSERT INTO instructors (id, profile_id, bio, specialties, certifications, years_experience, is_active) VALUES
  (gen_random_uuid(), gen_random_uuid(), 'Expert en arts martiaux avec plus de 15 ans d''expérience', ARRAY['Kickboxing', 'Muay Thai'], ARRAY['Instructeur certifié Muay Thai', 'Ceinture noire Kickboxing'], 15, true),
  (gen_random_uuid(), gen_random_uuid(), 'Champion de JJB et instructeur passionné', ARRAY['JJB', 'Grappling'], ARRAY['Ceinture noire JJB', 'Instructeur IBJJF'], 12, true),
  (gen_random_uuid(), gen_random_uuid(), 'Spécialiste en boxe anglaise et cardio boxing', ARRAY['Boxe anglaise', 'Cardio Boxing'], ARRAY['Instructeur de boxe certifié', 'Coach fitness'], 10, true),
  (gen_random_uuid(), gen_random_uuid(), 'Expert en cross training et musculation', ARRAY['Cross Training', 'Musculation'], ARRAY['CrossFit Level 2', 'Personal Trainer'], 8, true),
  (gen_random_uuid(), gen_random_uuid(), 'Maître de Judo et Jiu-Jitsu traditionnel', ARRAY['Judo', 'Jiu-Jitsu'], ARRAY['Ceinture noire 3e dan Judo', 'Instructeur fédéral'], 20, true)
ON CONFLICT (id) DO NOTHING;

-- Insert classes
WITH discipline_ids AS (
  SELECT id, name FROM disciplines
),
instructor_ids AS (
  SELECT id FROM instructors LIMIT 5
)
INSERT INTO classes (id, name, description, discipline_id, instructor_id, max_capacity, duration_minutes, level, price, is_active)
SELECT 
  gen_random_uuid(),
  d.name || ' - Cours ' || (CASE WHEN random() < 0.5 THEN 'Débutant' ELSE 'Avancé' END),
  'Cours de ' || d.name || ' adapté à tous les niveaux',
  d.id,
  (SELECT id FROM instructor_ids ORDER BY random() LIMIT 1),
  (CASE 
    WHEN d.name IN ('Musculation', 'Cross Training') THEN 15
    WHEN d.name IN ('MMA', 'Grappling') THEN 12
    ELSE 20
  END),
  90,
  (CASE WHEN random() < 0.5 THEN 'Débutant' ELSE 'Avancé' END),
  30.00,
  true
FROM discipline_ids d
ON CONFLICT (id) DO NOTHING;

-- Insert class sessions for the next 7 days
WITH class_ids AS (
  SELECT id, name FROM classes WHERE is_active = true
),
time_slots AS (
  SELECT unnest(ARRAY['08:00:00', '10:00:00', '12:00:00', '14:00:00', '16:00:00', '18:00:00', '20:00:00']) as start_time
),
dates AS (
  SELECT (CURRENT_DATE + interval '1 day' * generate_series(0, 6))::date as session_date
)
INSERT INTO class_sessions (id, class_id, session_date, start_time, end_time, instructor_id, status, actual_capacity)
SELECT 
  gen_random_uuid(),
  c.id,
  d.session_date,
  t.start_time::time,
  (t.start_time::time + interval '90 minutes')::time,
  (SELECT instructor_id FROM classes WHERE id = c.id),
  'scheduled',
  0
FROM class_ids c
CROSS JOIN dates d
CROSS JOIN time_slots t
WHERE random() < 0.3  -- Only create 30% of possible combinations to avoid too many courses
ON CONFLICT (id) DO NOTHING;

-- Enable RLS policies
ALTER TABLE disciplines ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public read access
CREATE POLICY "Allow public read access to disciplines" ON disciplines FOR SELECT USING (true);
CREATE POLICY "Allow public read access to instructors" ON instructors FOR SELECT USING (true);
CREATE POLICY "Allow public read access to classes" ON classes FOR SELECT USING (true);
CREATE POLICY "Allow public read access to class_sessions" ON class_sessions FOR SELECT USING (true);
