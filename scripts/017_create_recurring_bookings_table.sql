-- Create table for recurring course bookings
CREATE TABLE IF NOT EXISTS recurring_bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_pattern TEXT NOT NULL, -- e.g., "yamabushi-*-*-1-0-0" for every Monday at specific time
  discipline_name TEXT NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 1=Monday, etc.
  time_slot TEXT NOT NULL, -- e.g., "18:00-19:30"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_recurring_bookings_user_active ON recurring_bookings(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_recurring_bookings_day_time ON recurring_bookings(day_of_week, time_slot);

-- Enable RLS
ALTER TABLE recurring_bookings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own recurring bookings" ON recurring_bookings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recurring bookings" ON recurring_bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recurring bookings" ON recurring_bookings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recurring bookings" ON recurring_bookings
  FOR DELETE USING (auth.uid() = user_id);
