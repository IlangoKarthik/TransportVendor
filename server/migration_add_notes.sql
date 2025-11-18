-- Migration script to add notes column to vendors table
-- Run this script if you have an existing database without the notes column

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vendors' AND column_name = 'notes'
  ) THEN
    ALTER TABLE vendors ADD COLUMN notes TEXT;
    RAISE NOTICE 'Notes column added successfully';
  ELSE
    RAISE NOTICE 'Notes column already exists';
  END IF;
END $$;

