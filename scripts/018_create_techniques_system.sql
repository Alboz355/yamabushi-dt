-- Create table for belt techniques defined by instructors
CREATE TABLE IF NOT EXISTS belt_techniques (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  discipline_id UUID NOT NULL REFERENCES disciplines(id) ON DELETE CASCADE,
  belt_level TEXT NOT NULL,
  technique_name TEXT NOT NULL,
  technique_description TEXT,
  difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
  is_required BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for member technique mastery tracking
CREATE TABLE IF NOT EXISTS member_techniques (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  technique_id UUID NOT NULL REFERENCES belt_techniques(id) ON DELETE CASCADE,
  is_mastered BOOLEAN DEFAULT false,
  mastered_date DATE,
  instructor_validated BOOLEAN DEFAULT false,
  validated_by UUID REFERENCES auth.users(id),
  validated_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(member_id, technique_id)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_belt_techniques_discipline_belt ON belt_techniques(discipline_id, belt_level);
CREATE INDEX IF NOT EXISTS idx_member_techniques_member ON member_techniques(member_id);
CREATE INDEX IF NOT EXISTS idx_member_techniques_technique ON member_techniques(technique_id);

-- Enable RLS
ALTER TABLE belt_techniques ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_techniques ENABLE ROW LEVEL SECURITY;

-- RLS policies for belt_techniques
CREATE POLICY "Everyone can view belt techniques" ON belt_techniques
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage belt techniques" ON belt_techniques
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- RLS policies for member_techniques
CREATE POLICY "Users can view their own technique progress" ON member_techniques
  FOR SELECT USING (auth.uid() = member_id);

CREATE POLICY "Users can update their own technique progress" ON member_techniques
  FOR INSERT WITH CHECK (auth.uid() = member_id);

CREATE POLICY "Users can modify their own technique progress" ON member_techniques
  FOR UPDATE USING (auth.uid() = member_id);

CREATE POLICY "Instructors can validate techniques" ON member_techniques
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.role = 'admin' OR profiles.role = 'instructor')
    )
  );

-- Insert sample techniques for different disciplines and belt levels
INSERT INTO belt_techniques (discipline_id, belt_level, technique_name, technique_description, difficulty_level, is_required) 
SELECT 
  d.id,
  'Ceinture Blanche',
  technique_name,
  technique_description,
  difficulty_level,
  is_required
FROM disciplines d,
(VALUES 
  ('Garde fermée', 'Position de base en garde fermée avec contrôle des bras', 1, true),
  ('Échappement de montée', 'Technique pour échapper à la position de montée', 2, true),
  ('Soumission par étranglement', 'Étranglement de base depuis la garde', 3, true),
  ('Balayage de base', 'Balayage depuis la garde fermée', 2, true)
) AS techniques(technique_name, technique_description, difficulty_level, is_required)
WHERE d.name ILIKE '%jiu%' OR d.name ILIKE '%jjb%';

INSERT INTO belt_techniques (discipline_id, belt_level, technique_name, technique_description, difficulty_level, is_required) 
SELECT 
  d.id,
  'Ceinture Bleue',
  technique_name,
  technique_description,
  difficulty_level,
  is_required
FROM disciplines d,
(VALUES 
  ('Garde araignée', 'Contrôle avancé avec les pieds sur les biceps', 3, true),
  ('Passage de garde', 'Techniques pour passer la garde adverse', 3, true),
  ('Triangle depuis la garde', 'Soumission par triangle depuis la garde fermée', 4, true),
  ('Renversement technique', 'Renversement depuis la position inférieure', 3, true)
) AS techniques(technique_name, technique_description, difficulty_level, is_required)
WHERE d.name ILIKE '%jiu%' OR d.name ILIKE '%jjb%';

-- Add techniques for Kickboxing
INSERT INTO belt_techniques (discipline_id, belt_level, technique_name, technique_description, difficulty_level, is_required) 
SELECT 
  d.id,
  'Débutant',
  technique_name,
  technique_description,
  difficulty_level,
  is_required
FROM disciplines d,
(VALUES 
  ('Jab', 'Coup de poing direct du bras avant', 1, true),
  ('Cross', 'Coup de poing direct du bras arrière', 1, true),
  ('Crochet', 'Coup de poing circulaire', 2, true),
  ('Coup de pied frontal', 'Coup de pied direct vers l''avant', 2, true),
  ('Garde de base', 'Position défensive fondamentale', 1, true)
) AS techniques(technique_name, technique_description, difficulty_level, is_required)
WHERE d.name ILIKE '%kick%';

INSERT INTO belt_techniques (discipline_id, belt_level, technique_name, technique_description, difficulty_level, is_required) 
SELECT 
  d.id,
  'Intermédiaire',
  technique_name,
  technique_description,
  difficulty_level,
  is_required
FROM disciplines d,
(VALUES 
  ('Low kick', 'Coup de pied circulaire bas', 3, true),
  ('High kick', 'Coup de pied circulaire haut', 4, true),
  ('Combinaisons 3 coups', 'Enchaînements de trois techniques', 3, true),
  ('Esquive et contre-attaque', 'Mouvement défensif suivi d''une riposte', 3, true),
  ('Clinch de base', 'Corps à corps et techniques associées', 3, true)
) AS techniques(technique_name, technique_description, difficulty_level, is_required)
WHERE d.name ILIKE '%kick%';
