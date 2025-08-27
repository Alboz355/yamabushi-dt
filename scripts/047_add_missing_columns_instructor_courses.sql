-- Add missing columns to instructor_courses table
-- Adding duration, level, description, max_participants, location, price, instructor_name, and status columns

ALTER TABLE instructor_courses 
ADD COLUMN IF NOT EXISTS duration INTEGER,
ADD COLUMN IF NOT EXISTS level TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS max_participants INTEGER,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS price DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS instructor_name TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Update existing records to have default values
UPDATE instructor_courses 
SET 
  duration = 60 WHERE duration IS NULL,
  level = 'Débutant' WHERE level IS NULL,
  description = '' WHERE description IS NULL,
  max_participants = 20 WHERE max_participants IS NULL,
  location = 'Dojo Principal' WHERE location IS NULL,
  price = 0 WHERE price IS NULL,
  status = 'active' WHERE status IS NULL;
