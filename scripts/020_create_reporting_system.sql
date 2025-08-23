-- Create tables for automated reporting system
CREATE TABLE IF NOT EXISTS report_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  report_type VARCHAR(50) NOT NULL, -- 'weekly', 'monthly', 'quarterly'
  frequency VARCHAR(20) NOT NULL, -- 'weekly', 'monthly'
  recipients TEXT[] NOT NULL, -- Array of email addresses
  is_active BOOLEAN DEFAULT true,
  last_sent_at TIMESTAMP WITH TIME ZONE,
  next_send_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID REFERENCES report_schedules(id) ON DELETE CASCADE,
  report_period_start DATE NOT NULL,
  report_period_end DATE NOT NULL,
  file_path TEXT,
  sent_to TEXT[] NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default weekly and monthly report schedules
INSERT INTO report_schedules (name, report_type, frequency, recipients, next_send_at) VALUES
('Rapport Hebdomadaire', 'weekly', 'weekly', ARRAY['admin@yamabushi.com'], NOW() + INTERVAL '1 week'),
('Rapport Mensuel', 'monthly', 'monthly', ARRAY['admin@yamabushi.com'], NOW() + INTERVAL '1 month');
