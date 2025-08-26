-- Reload PostgREST schema cache to fix relationship detection issues
NOTIFY pgrst, 'reload schema';

-- Add foreign key constraint between subscriptions and profiles if it doesn't exist
DO $$
BEGIN
    -- Check if foreign key constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'subscriptions_member_id_fkey'
        AND table_name = 'subscriptions'
    ) THEN
        -- Add foreign key constraint
        ALTER TABLE subscriptions 
        ADD CONSTRAINT subscriptions_member_id_fkey 
        FOREIGN KEY (member_id) REFERENCES profiles(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Added foreign key constraint between subscriptions and profiles';
    ELSE
        RAISE NOTICE 'Foreign key constraint already exists';
    END IF;
END $$;

-- Reload schema cache again after adding constraint
NOTIFY pgrst, 'reload schema';
