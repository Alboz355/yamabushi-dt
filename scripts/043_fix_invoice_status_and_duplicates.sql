-- Fix invoice status constraint and remove duplicate invoices

-- First, let's check and fix the status constraint
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'invoices_status_check' 
        AND table_name = 'invoices'
    ) THEN
        ALTER TABLE invoices DROP CONSTRAINT invoices_status_check;
    END IF;
END $$;

-- Add proper status constraint with all valid values
ALTER TABLE invoices 
ADD CONSTRAINT invoices_status_check 
CHECK (status IN ('paid', 'unpaid', 'pending', 'cancelled', 'refunded', 'overdue', 'draft'));

-- Remove duplicate invoices keeping only the earliest one per member/month/year
WITH duplicate_invoices AS (
    SELECT 
        id,
        member_id,
        month,
        year,
        ROW_NUMBER() OVER (
            PARTITION BY member_id, month, year 
            ORDER BY created_at ASC
        ) as row_num
    FROM invoices
),
invoices_to_delete AS (
    SELECT id 
    FROM duplicate_invoices 
    WHERE row_num > 1
)
DELETE FROM invoices 
WHERE id IN (SELECT id FROM invoices_to_delete);

-- Add unique constraint to prevent future duplicates
ALTER TABLE invoices 
ADD CONSTRAINT unique_member_month_year 
UNIQUE (member_id, month, year);

-- Log the cleanup results
DO $$
DECLARE
    total_invoices INTEGER;
    total_users INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_invoices FROM invoices;
    SELECT COUNT(DISTINCT member_id) INTO total_users FROM invoices;
    
    RAISE NOTICE 'Invoice cleanup completed. Total invoices: %, Total users with invoices: %', total_invoices, total_users;
END $$;
