-- Fix Route Schema Migration
-- Run this script in Supabase SQL Editor to fix the routes table schema

-- Alter existing columns to allow decimal values for durations
-- This fixes the "invalid input syntax for type integer" error

ALTER TABLE routes
ALTER COLUMN estimated_duration TYPE DECIMAL(8,2);

ALTER TABLE routes
ALTER COLUMN actual_duration TYPE DECIMAL(8,2);

-- Verify the changes
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'routes'
ORDER BY ordinal_position;

-- Show current data to confirm migration worked
SELECT id, courier_id, status, total_distance, estimated_duration, actual_duration
FROM routes
ORDER BY created_at DESC
LIMIT 5;
