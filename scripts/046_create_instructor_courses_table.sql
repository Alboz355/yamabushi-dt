-- Creating instructor_courses table for course management
CREATE TABLE IF NOT EXISTS public.instructor_courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  instructor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  discipline VARCHAR(100) NOT NULL,
  location VARCHAR(255) NOT NULL,
  max_participants INTEGER, -- NULL means unlimited
  is_unlimited_participants BOOLEAN DEFAULT FALSE,
  recurrence_type VARCHAR(20) CHECK (recurrence_type IN ('none', 'weekly', 'daily')),
  recurrence_days INTEGER[], -- Array of weekdays (0=Sunday, 1=Monday, etc.)
  start_date DATE NOT NULL,
  end_date DATE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Creating course_sessions table for individual sessions
CREATE TABLE IF NOT EXISTS public.course_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES public.instructor_courses(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  max_participants INTEGER,
  current_participants INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(course_id, session_date, start_time)
);

-- Creating course_registrations table for "J'y serai" functionality
CREATE TABLE IF NOT EXISTS public.course_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.course_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'registered' CHECK (status IN ('registered', 'confirmed', 'rejected', 'cancelled')),
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  confirmed_by UUID REFERENCES auth.users(id),
  UNIQUE(session_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.instructor_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_registrations ENABLE ROW LEVEL SECURITY;

-- RLS policies for instructor_courses
CREATE POLICY "Instructors can manage their own courses" ON public.instructor_courses
  FOR ALL USING (instructor_id = auth.uid());

CREATE POLICY "Everyone can view active courses" ON public.instructor_courses
  FOR SELECT USING (is_active = true);

-- RLS policies for course_sessions
CREATE POLICY "Instructors can manage sessions of their courses" ON public.course_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.instructor_courses 
      WHERE id = course_sessions.course_id 
      AND instructor_id = auth.uid()
    )
  );

CREATE POLICY "Everyone can view scheduled sessions" ON public.course_sessions
  FOR SELECT USING (status = 'scheduled');

-- RLS policies for course_registrations
CREATE POLICY "Users can manage their own registrations" ON public.course_registrations
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Instructors can view registrations for their courses" ON public.course_registrations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.course_sessions cs
      JOIN public.instructor_courses ic ON cs.course_id = ic.id
      WHERE cs.id = course_registrations.session_id 
      AND ic.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can update registration status" ON public.course_registrations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.course_sessions cs
      JOIN public.instructor_courses ic ON cs.course_id = ic.id
      WHERE cs.id = course_registrations.session_id 
      AND ic.instructor_id = auth.uid()
    )
  );
