-- Create help system and subscription management tables with proper error handling

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own help requests" ON help_requests;
DROP POLICY IF EXISTS "Users can create help requests" ON help_requests;
DROP POLICY IF EXISTS "Admins can view all help requests" ON help_requests;
DROP POLICY IF EXISTS "Admins can update help requests" ON help_requests;

-- Create help_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS help_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  category text NOT NULL CHECK (category IN ('technical', 'billing', 'booking', 'general')),
  message text NOT NULL,
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  admin_response text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on help_requests
ALTER TABLE help_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for help_requests
CREATE POLICY "Users can view their own help requests" ON help_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create help requests" ON help_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all help requests" ON help_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update help requests" ON help_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for help_requests
DROP TRIGGER IF EXISTS update_help_requests_updated_at ON help_requests;
CREATE TRIGGER update_help_requests_updated_at
    BEFORE UPDATE ON help_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON help_requests TO authenticated;
GRANT ALL ON help_requests TO service_role;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS help_requests_user_id_idx ON help_requests(user_id);
CREATE INDEX IF NOT EXISTS help_requests_status_idx ON help_requests(status);
CREATE INDEX IF NOT EXISTS help_requests_created_at_idx ON help_requests(created_at DESC);

COMMIT;
