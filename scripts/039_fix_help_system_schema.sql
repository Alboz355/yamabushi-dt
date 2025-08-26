-- Fix help system and subscription management schema
-- This script ensures all necessary tables and policies exist correctly

-- First, ensure help_requests table has correct structure (it already exists)
-- The table uses user_email and user_name instead of user_id

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own help requests" ON help_requests;
DROP POLICY IF EXISTS "Admins can view all help requests" ON help_requests;
DROP POLICY IF EXISTS "Users can create help requests" ON help_requests;
DROP POLICY IF EXISTS "Admins can update help requests" ON help_requests;

-- Create RLS policies for help_requests
CREATE POLICY "Users can view their own help requests" ON help_requests
    FOR SELECT USING (user_email = auth.email());

CREATE POLICY "Admins can view all help requests" ON help_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        ) OR auth.email() = 'admin@admin.com'
    );

CREATE POLICY "Users can create help requests" ON help_requests
    FOR INSERT WITH CHECK (user_email = auth.email());

CREATE POLICY "Admins can update help requests" ON help_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        ) OR auth.email() = 'admin@admin.com'
    );

-- Enable RLS on help_requests
ALTER TABLE help_requests ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_help_requests_user_email ON help_requests(user_email);
CREATE INDEX IF NOT EXISTS idx_help_requests_status ON help_requests(status);
CREATE INDEX IF NOT EXISTS idx_help_requests_created_at ON help_requests(created_at);

-- Ensure subscriptions table has proper structure
-- Check if we need to add any missing columns to subscriptions table
DO $$
BEGIN
    -- Add payment_frequency column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'subscriptions' AND column_name = 'payment_frequency') THEN
        ALTER TABLE subscriptions ADD COLUMN payment_frequency text DEFAULT 'monthly';
    END IF;
    
    -- Add notes column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'subscriptions' AND column_name = 'notes') THEN
        ALTER TABLE subscriptions ADD COLUMN notes text;
    END IF;
END $$;

-- Create RLS policies for subscriptions management
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON subscriptions;

CREATE POLICY "Users can view their own subscriptions" ON subscriptions
    FOR SELECT USING (member_id = auth.uid());

CREATE POLICY "Admins can manage all subscriptions" ON subscriptions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        ) OR auth.email() = 'admin@admin.com'
    );

-- Enable RLS on subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Create function to safely update subscription status
CREATE OR REPLACE FUNCTION update_subscription_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update profile subscription status when subscription changes
    UPDATE profiles 
    SET 
        membership_status = CASE 
            WHEN NEW.status = 'active' THEN 'active'
            WHEN NEW.status = 'cancelled' THEN 'inactive'
            ELSE 'inactive'
        END,
        subscription_expires_at = NEW.end_date,
        updated_at = NOW()
    WHERE id = NEW.member_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for subscription updates
DROP TRIGGER IF EXISTS subscription_status_update ON subscriptions;
CREATE TRIGGER subscription_status_update
    AFTER INSERT OR UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_subscription_status();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON help_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON subscriptions TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_member_id ON subscriptions(member_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON subscriptions(end_date);
</sql>
