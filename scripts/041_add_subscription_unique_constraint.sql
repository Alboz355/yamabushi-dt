-- Add unique constraint to prevent duplicate subscriptions per user
-- First, remove any duplicate subscriptions keeping only the most recent one

-- Delete duplicate subscriptions, keeping only the most recent one per member_id
DELETE FROM subscriptions 
WHERE id NOT IN (
    SELECT DISTINCT ON (member_id) id
    FROM subscriptions 
    ORDER BY member_id, created_at DESC
);

-- Add unique constraint to prevent future duplicates
ALTER TABLE subscriptions 
ADD CONSTRAINT subscriptions_member_id_unique UNIQUE (member_id);

-- Update the subscription creation API to use upsert instead of insert
COMMENT ON CONSTRAINT subscriptions_member_id_unique ON subscriptions IS 'Ensures one subscription per user';
