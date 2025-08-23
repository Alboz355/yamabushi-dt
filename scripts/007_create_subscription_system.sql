-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('monthly', 'six_months', 'annual')),
  price DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'pending')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  auto_renew BOOLEAN DEFAULT true,
  payment_method TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create subscription plans table for pricing
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_type TEXT NOT NULL UNIQUE CHECK (plan_type IN ('monthly', 'six_months', 'annual')),
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  duration_months INTEGER NOT NULL,
  features TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert subscription plans
INSERT INTO subscription_plans (plan_type, name, price, duration_months, features) VALUES
('monthly', 'Abonnement Mensuel', 89.00, 1, ARRAY['Accès à tous les cours', 'Suivi de progression basique', 'Réservation de cours']),
('six_months', 'Abonnement 6 Mois', 600.00, 6, ARRAY['Accès à tous les cours', 'Suivi de progression avancé', 'Réservation prioritaire', 'Analyses détaillées', 'Objectifs personnalisés']),
('annual', 'Abonnement Annuel', 1000.00, 12, ARRAY['Accès à tous les cours', 'Suivi de progression premium', 'Réservation prioritaire', 'Analyses détaillées', 'Objectifs personnalisés', 'Séances privées incluses', 'Rapports d\'évolution']);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Create policies for subscriptions
CREATE POLICY "Users can view their own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = member_id);

CREATE POLICY "Users can insert their own subscriptions" ON subscriptions
  FOR INSERT WITH CHECK (auth.uid() = member_id);

CREATE POLICY "Users can update their own subscriptions" ON subscriptions
  FOR UPDATE USING (auth.uid() = member_id);

-- Create policies for subscription plans (public read)
CREATE POLICY "Anyone can view subscription plans" ON subscription_plans
  FOR SELECT USING (true);

-- Create function to check active subscription
CREATE OR REPLACE FUNCTION has_active_subscription(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM subscriptions 
    WHERE member_id = user_id 
    AND status = 'active' 
    AND end_date >= CURRENT_DATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get subscription tier
CREATE OR REPLACE FUNCTION get_subscription_tier(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  tier TEXT;
BEGIN
  SELECT plan_type INTO tier
  FROM subscriptions 
  WHERE member_id = user_id 
  AND status = 'active' 
  AND end_date >= CURRENT_DATE
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN COALESCE(tier, 'none');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update profiles table to include subscription info
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'none';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_expires_at DATE;
