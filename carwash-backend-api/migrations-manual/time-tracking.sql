-- Fix migration: Add time tracking columns without breaking foreign keys
-- Execute this SQL to fix the issue

-- First, check if columns already exist and drop them if needed
DO $$ 
BEGIN
    -- Drop columns if they exist (to start fresh)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'started_at') THEN
        ALTER TABLE orders DROP COLUMN started_at;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'completed_at') THEN
        ALTER TABLE orders DROP COLUMN completed_at;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'duration') THEN
        ALTER TABLE orders DROP COLUMN duration;
    END IF;
END $$;

-- Now add the columns fresh
ALTER TABLE orders 
ADD COLUMN started_at TIMESTAMP NULL,
ADD COLUMN completed_at TIMESTAMP NULL,
ADD COLUMN duration INTEGER NULL;

-- Add comments
COMMENT ON COLUMN orders.started_at IS 'Timestamp when order status changed to IN_PROGRESS';
COMMENT ON COLUMN orders.completed_at IS 'Timestamp when order status changed to WAITING_PAYMENT';
COMMENT ON COLUMN orders.duration IS 'Duration of wash in minutes';

-- Verify
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('started_at', 'completed_at', 'duration')
ORDER BY column_name;
