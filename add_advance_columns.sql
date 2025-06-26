-- Migration script to add advance_pay and is_advance columns to member table
-- Run this script on your database to add the required columns

-- Add advance_pay column (DECIMAL to store monetary values)
ALTER TABLE member ADD COLUMN IF NOT EXISTS advance_pay DECIMAL(10,2) DEFAULT 0.00;

-- Add is_advance column (BOOLEAN to indicate if member has advance payment)
ALTER TABLE member ADD COLUMN IF NOT EXISTS is_advance BOOLEAN DEFAULT FALSE;

-- Add comments to document the columns
COMMENT ON COLUMN member.advance_pay IS 'Amount of advance payment made by the member (positive value when member is in credit)';
COMMENT ON COLUMN member.is_advance IS 'Boolean flag indicating if member has made advance payments (true when member is in credit)';

-- Update existing records to have default values
UPDATE member SET advance_pay = 0.00 WHERE advance_pay IS NULL;
UPDATE member SET is_advance = FALSE WHERE is_advance IS NULL;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'member' 
AND column_name IN ('advance_pay', 'is_advance'); 