-- Maysar Logistics Service - Routes Table Schema
-- Run this script in Supabase SQL Editor to add routes functionality

-- Create routes table
CREATE TABLE IF NOT EXISTS routes (
  id VARCHAR(50) PRIMARY KEY,
  courier_id VARCHAR(50) REFERENCES couriers(id) NOT NULL,
  status VARCHAR(20) DEFAULT 'planned',
  total_distance DECIMAL(8,2) NOT NULL,
  estimated_duration DECIMAL(8,2) NOT NULL, -- Allow fractional minutes
  actual_duration DECIMAL(8,2), -- Allow fractional minutes
  waypoints JSONB NOT NULL, -- Array of {lat, lng, address}
  progress JSONB NOT NULL, -- {completed_stops, total_stops, current_lat, current_lng, current_address, last_update_time, estimated_completion_time, notes}
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_routes_courier_id ON routes(courier_id);
CREATE INDEX IF NOT EXISTS idx_routes_status ON routes(status);
CREATE INDEX IF NOT EXISTS idx_routes_created_at ON routes(created_at);

-- Insert sample route data for testing
INSERT INTO routes (
  id,
  courier_id,
  status,
  total_distance,
  estimated_duration,
  waypoints,
  progress,
  created_at,
  updated_at
) VALUES
(
  'route_001',
  'courier_001',
  'in_progress',
  15.3,
  28,
  '[
    {"lat": -6.7924, "lng": 39.2083, "address": "Dar es Salaam CBD"},
    {"lat": -6.8, "lng": 39.21, "address": "Samora Avenue"},
    {"lat": -6.805, "lng": 39.215, "address": "Uhuru Street"}
  ]'::jsonb,
  '{
    "completed_stops": 1,
    "total_stops": 3,
    "current_lat": -6.8,
    "current_lng": 39.21,
    "current_address": "Samora Avenue",
    "last_update_time": "2026-01-10T06:16:26.000Z",
    "progress_percentage": 33.33
  }'::jsonb,
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '1 hour'
),
(
  'route_002',
  'courier_002',
  'completed',
  8.7,
  15,
  '[
    {"lat": -6.7924, "lng": 39.2083, "address": "Dar es Salaam CBD"},
    {"lat": -6.795, "lng": 39.205, "address": "Koinange Street"}
  ]'::jsonb,
  '{
    "completed_stops": 2,
    "total_stops": 2,
    "current_lat": -6.795,
    "current_lng": 39.205,
    "current_address": "Koinange Street",
    "last_update_time": "2026-01-10T02:16:26.000Z",
    "progress_percentage": 100
  }'::jsonb,
  NOW() - INTERVAL '4 hours',
  NOW() - INTERVAL '3 hours'
)
ON CONFLICT (id) DO NOTHING;

-- Insert route for courier_013 (test data)
INSERT INTO routes (
  id,
  courier_id,
  status,
  total_distance,
  estimated_duration,
  waypoints,
  progress,
  created_at,
  updated_at
) VALUES
(
  'route_003',
  'courier_013',
  'planned',
  12.5,
  22,
  '[
    {"lat": -6.7924, "lng": 39.2083, "address": "Dar es Salaam CBD"},
    {"lat": -6.81, "lng": 39.22, "address": "Masaki Peninsula"}
  ]'::jsonb,
  '{
    "completed_stops": 0,
    "total_stops": 2,
    "current_lat": -6.7924,
    "current_lng": 39.2083,
    "current_address": "Dar es Salaam CBD",
    "last_update_time": "2026-01-11T00:22:21.000Z",
    "progress_percentage": 0
  }'::jsonb,
  NOW() - INTERVAL '30 minutes',
  NOW() - INTERVAL '15 minutes'
)
ON CONFLICT (id) DO NOTHING;

-- Verify routes table created successfully
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'routes'
ORDER BY ordinal_position;

-- Show sample data
SELECT id, courier_id, status, total_distance, estimated_duration, created_at
FROM routes
ORDER BY created_at DESC;
