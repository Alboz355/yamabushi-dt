-- Yamabushi Martial Arts Academy Database Schema
-- This script creates all necessary tables for the academy management system

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  date_of_birth DATE,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  membership_type TEXT CHECK (membership_type IN ('monthly', 'quarterly', 'annual', 'drop_in')) DEFAULT 'monthly',
  membership_status TEXT CHECK (membership_status IN ('active', 'inactive', 'suspended', 'expired')) DEFAULT 'active',
  belt_level TEXT,
  join_date DATE DEFAULT CURRENT_DATE,
  profile_image_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create martial arts disciplines table
CREATE TABLE IF NOT EXISTS public.disciplines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color_code TEXT DEFAULT '#be123c',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create instructors table
CREATE TABLE IF NOT EXISTS public.instructors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  bio TEXT,
  certifications TEXT[],
  specialties TEXT[],
  years_experience INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create classes table
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  discipline_id UUID REFERENCES public.disciplines(id) ON DELETE CASCADE,
  instructor_id UUID REFERENCES public.instructors(id) ON DELETE SET NULL,
  description TEXT,
  level TEXT CHECK (level IN ('beginner', 'intermediate', 'advanced', 'all_levels')) DEFAULT 'all_levels',
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  max_capacity INTEGER NOT NULL DEFAULT 20,
  price DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create class schedules table
CREATE TABLE IF NOT EXISTS public.class_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 6 = Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create class sessions table (specific instances of classes)
CREATE TABLE IF NOT EXISTS public.class_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  instructor_id UUID REFERENCES public.instructors(id) ON DELETE SET NULL,
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')) DEFAULT 'scheduled',
  actual_capacity INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_session_id UUID REFERENCES public.class_sessions(id) ON DELETE CASCADE,
  booking_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT CHECK (status IN ('confirmed', 'cancelled', 'no_show', 'attended')) DEFAULT 'confirmed',
  payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'refunded')) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(member_id, class_session_id)
);

-- Create attendance table
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_session_id UUID REFERENCES public.class_sessions(id) ON DELETE CASCADE,
  check_in_time TIMESTAMP WITH TIME ZONE,
  check_out_time TIMESTAMP WITH TIME ZONE,
  status TEXT CHECK (status IN ('present', 'absent', 'late')) DEFAULT 'present',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create member progress table
CREATE TABLE IF NOT EXISTS public.member_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  discipline_id UUID REFERENCES public.disciplines(id) ON DELETE CASCADE,
  current_belt TEXT,
  belt_earned_date DATE,
  next_belt_target TEXT,
  skills_learned TEXT[],
  goals TEXT,
  instructor_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_type TEXT CHECK (payment_type IN ('membership', 'class', 'equipment', 'other')) DEFAULT 'class',
  payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'online')) DEFAULT 'card',
  status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'refunded')) DEFAULT 'pending',
  transaction_id TEXT,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disciplines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Create RLS policies for disciplines (public read, admin write)
CREATE POLICY "Anyone can view disciplines" ON public.disciplines FOR SELECT TO authenticated USING (true);

-- Create RLS policies for instructors (public read for active instructors)
CREATE POLICY "Anyone can view active instructors" ON public.instructors FOR SELECT TO authenticated USING (is_active = true);

-- Create RLS policies for classes (public read for active classes)
CREATE POLICY "Anyone can view active classes" ON public.classes FOR SELECT TO authenticated USING (is_active = true);

-- Create RLS policies for class schedules (public read for active schedules)
CREATE POLICY "Anyone can view active class schedules" ON public.class_schedules FOR SELECT TO authenticated USING (is_active = true);

-- Create RLS policies for class sessions (public read for future sessions)
CREATE POLICY "Anyone can view future class sessions" ON public.class_sessions FOR SELECT TO authenticated USING (session_date >= CURRENT_DATE);

-- Create RLS policies for bookings (users can only see their own bookings)
CREATE POLICY "Users can view their own bookings" ON public.bookings FOR SELECT USING (auth.uid() = member_id);
CREATE POLICY "Users can create their own bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = member_id);
CREATE POLICY "Users can update their own bookings" ON public.bookings FOR UPDATE USING (auth.uid() = member_id);

-- Create RLS policies for attendance (users can only see their own attendance)
CREATE POLICY "Users can view their own attendance" ON public.attendance FOR SELECT USING (auth.uid() = member_id);

-- Create RLS policies for member progress (users can only see their own progress)
CREATE POLICY "Users can view their own progress" ON public.member_progress FOR SELECT USING (auth.uid() = member_id);

-- Create RLS policies for payments (users can only see their own payments)
CREATE POLICY "Users can view their own payments" ON public.payments FOR SELECT USING (auth.uid() = member_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_membership_status ON public.profiles(membership_status);
CREATE INDEX IF NOT EXISTS idx_class_sessions_date ON public.class_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_bookings_member_session ON public.bookings(member_id, class_session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_member_session ON public.attendance(member_id, class_session_id);
CREATE INDEX IF NOT EXISTS idx_payments_member_date ON public.payments(member_id, payment_date);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_member_progress_updated_at BEFORE UPDATE ON public.member_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
