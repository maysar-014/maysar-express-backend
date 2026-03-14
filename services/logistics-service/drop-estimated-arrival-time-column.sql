-- Migration Script: Remove estimated_arrival_time column from couriers table
-- Run this script in Database SQL Editor after deploying the code changes

-- Step 1: Drop the estimated_arrival_time column from couriers table
-- WARNING: This will permanently remove the column and all its data
ALTER TABLE couriers DROP COLUMN IF EXISTS estimated_arrival_time;

-- Step 2: Verify the column was removed
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'couriers'
  AND column_name = 'estimated_arrival_time';

-- If the query returns no rows, the column was successfully removed

-- Step 3: Show remaining columns in couriers table for verification
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'couriers'
ORDER BY ordinal_position;

