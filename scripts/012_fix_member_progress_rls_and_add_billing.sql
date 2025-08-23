-- Fix RLS policies for member_progress table
CREATE POLICY "Users can view their own progress" ON member_progress
  FOR SELECT USING (auth.uid() = member_id);

CREATE POLICY "Users can insert their own progress" ON member_progress
  FOR INSERT WITH CHECK (auth.uid() = member_id);

CREATE POLICY "Users can update their own progress" ON member_progress
  FOR UPDATE USING (auth.uid() = member_id);

-- Create billing/invoice system
CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  invoice_number TEXT UNIQUE NOT NULL,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS policies for invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own invoices" ON invoices
  FOR SELECT USING (auth.uid() = member_id);

CREATE POLICY "Users can update their own invoice payments" ON invoices
  FOR UPDATE USING (auth.uid() = member_id);

-- Add payment plan options to subscriptions
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS payment_plan TEXT DEFAULT 'full' CHECK (payment_plan IN ('full', 'monthly'));
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS next_payment_date DATE;

-- Function to generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  year_month TEXT;
  sequence_num INTEGER;
BEGIN
  year_month := TO_CHAR(NOW(), 'YYYYMM');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 8) AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM invoices
  WHERE invoice_number LIKE year_month || '%';
  
  RETURN year_month || LPAD(sequence_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to create monthly invoices
CREATE OR REPLACE FUNCTION create_monthly_invoice(
  p_member_id UUID,
  p_subscription_id UUID,
  p_amount DECIMAL,
  p_billing_start DATE,
  p_billing_end DATE
)
RETURNS UUID AS $$
DECLARE
  invoice_id UUID;
BEGIN
  INSERT INTO invoices (
    member_id,
    subscription_id,
    amount,
    due_date,
    invoice_number,
    billing_period_start,
    billing_period_end
  ) VALUES (
    p_member_id,
    p_subscription_id,
    p_amount,
    p_billing_start,
    generate_invoice_number(),
    p_billing_start,
    p_billing_end
  ) RETURNING id INTO invoice_id;
  
  RETURN invoice_id;
END;
$$ LANGUAGE plpgsql;
