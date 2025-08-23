-- Seed courses and sessions for testing

-- First, let's create some instructors (we'll need to update these with real profile IDs later)
-- For now, we'll create placeholder instructor records

-- Insert sample classes
INSERT INTO public.classes (name, discipline_id, description, level, duration_minutes, max_capacity, price, is_active) 
SELECT 
  'JJB Débutant',
  d.id,
  'Cours de Brazilian Jiu-Jitsu pour débutants. Apprentissage des bases, positions et techniques fondamentales.',
  'beginner',
  90,
  15,
  25.00,
  true
FROM public.disciplines d WHERE d.name = 'Brazilian Jiu-Jitsu';

INSERT INTO public.classes (name, discipline_id, description, level, duration_minutes, max_capacity, price, is_active) 
SELECT 
  'JJB Intermédiaire',
  d.id,
  'Cours de Brazilian Jiu-Jitsu niveau intermédiaire. Techniques avancées et sparring.',
  'intermediate',
  90,
  12,
  30.00,
  true
FROM public.disciplines d WHERE d.name = 'Brazilian Jiu-Jitsu';

INSERT INTO public.classes (name, discipline_id, description, level, duration_minutes, max_capacity, price, is_active) 
SELECT 
  'Grappling Open Mat',
  d.id,
  'Session de grappling libre. Entraînement technique et sparring pour tous niveaux.',
  'all_levels',
  60,
  20,
  20.00,
  true
FROM public.disciplines d WHERE d.name = 'Grappling';

INSERT INTO public.classes (name, discipline_id, description, level, duration_minutes, max_capacity, price, is_active) 
SELECT 
  'Boxe Technique',
  d.id,
  'Cours de boxe axé sur la technique. Travail des coups, déplacements et défense.',
  'all_levels',
  60,
  16,
  22.00,
  true
FROM public.disciplines d WHERE d.name = 'Boxing';

INSERT INTO public.classes (name, discipline_id, description, level, duration_minutes, max_capacity, price, is_active) 
SELECT 
  'Kickboxing Cardio',
  d.id,
  'Cours de kickboxing intensif. Excellent pour le cardio et la condition physique.',
  'all_levels',
  45,
  20,
  20.00,
  true
FROM public.disciplines d WHERE d.name = 'Kickboxing';

-- Insert class schedules (recurring weekly schedule)
-- JJB Débutant: Lundi et Mercredi 19h-20h30
INSERT INTO public.class_schedules (class_id, day_of_week, start_time, end_time, is_active)
SELECT c.id, 1, '19:00:00', '20:30:00', true
FROM public.classes c WHERE c.name = 'JJB Débutant';

INSERT INTO public.class_schedules (class_id, day_of_week, start_time, end_time, is_active)
SELECT c.id, 3, '19:00:00', '20:30:00', true
FROM public.classes c WHERE c.name = 'JJB Débutant';

-- JJB Intermédiaire: Mardi et Jeudi 20h-21h30
INSERT INTO public.class_schedules (class_id, day_of_week, start_time, end_time, is_active)
SELECT c.id, 2, '20:00:00', '21:30:00', true
FROM public.classes c WHERE c.name = 'JJB Intermédiaire';

INSERT INTO public.class_schedules (class_id, day_of_week, start_time, end_time, is_active)
SELECT c.id, 4, '20:00:00', '21:30:00', true
FROM public.classes c WHERE c.name = 'JJB Intermédiaire';

-- Grappling Open Mat: Samedi 14h-15h
INSERT INTO public.class_schedules (class_id, day_of_week, start_time, end_time, is_active)
SELECT c.id, 6, '14:00:00', '15:00:00', true
FROM public.classes c WHERE c.name = 'Grappling Open Mat';

-- Boxe Technique: Lundi et Vendredi 18h-19h
INSERT INTO public.class_schedules (class_id, day_of_week, start_time, end_time, is_active)
SELECT c.id, 1, '18:00:00', '19:00:00', true
FROM public.classes c WHERE c.name = 'Boxe Technique';

INSERT INTO public.class_schedules (class_id, day_of_week, start_time, end_time, is_active)
SELECT c.id, 5, '18:00:00', '19:00:00', true
FROM public.classes c WHERE c.name = 'Boxe Technique';

-- Kickboxing Cardio: Mercredi et Samedi 17h-17h45
INSERT INTO public.class_schedules (class_id, day_of_week, start_time, end_time, is_active)
SELECT c.id, 3, '17:00:00', '17:45:00', true
FROM public.classes c WHERE c.name = 'Kickboxing Cardio';

INSERT INTO public.class_schedules (class_id, day_of_week, start_time, end_time, is_active)
SELECT c.id, 6, '17:00:00', '17:45:00', true
FROM public.classes c WHERE c.name = 'Kickboxing Cardio';

-- Generate class sessions for the next 4 weeks
-- This is a simplified version - in a real app, you'd have a more sophisticated scheduling system

DO $$
DECLARE
    schedule_record RECORD;
    current_date DATE;
    session_date DATE;
    week_offset INTEGER;
BEGIN
    current_date := CURRENT_DATE;
    
    -- Generate sessions for the next 4 weeks
    FOR week_offset IN 0..3 LOOP
        FOR schedule_record IN 
            SELECT cs.*, c.name as class_name
            FROM public.class_schedules cs
            JOIN public.classes c ON cs.class_id = c.id
            WHERE cs.is_active = true
        LOOP
            -- Calculate the date for this day of the week in the current week
            session_date := current_date + (week_offset * 7) + (schedule_record.day_of_week - EXTRACT(DOW FROM current_date)::INTEGER);
            
            -- Only create sessions for future dates
            IF session_date >= current_date THEN
                INSERT INTO public.class_sessions (
                    class_id,
                    session_date,
                    start_time,
                    end_time,
                    status
                ) VALUES (
                    schedule_record.class_id,
                    session_date,
                    schedule_record.start_time,
                    schedule_record.end_time,
                    'scheduled'
                );
            END IF;
        END LOOP;
    END LOOP;
END $$;
