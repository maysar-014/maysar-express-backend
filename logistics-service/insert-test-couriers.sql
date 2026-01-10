-- Insert test couriers for development and testing
-- Run this script in Supabase SQL Editor to populate test data

INSERT INTO couriers (
  id,
  name,
  phone,
  vehicle_type,
  max_weight,
  max_volume,
  max_items,
  rating,
  completion_rate,
  current_lat,
  current_lng,
  current_address,
  is_available,
  traffic_experience,
  created_at,
  updated_at
) VALUES
('courier_001', 'John Mwangi', '+255712345678', 'motorcycle', 10.00, 0.05, 5, 4.50, 0.9500, -6.7924, 39.2083, 'Dar es Salaam CBD', true, 0.80, NOW(), NOW()),
('courier_002', 'Amina Hassan', '+255723456789', 'bicycle', 8.00, 0.03, 3, 4.20, 0.9200, -6.7924, 39.2100, 'Dar es Salaam CBD', true, 0.75, NOW(), NOW()),
('courier_003', 'David Kiprop', '+255734567890', 'car', 25.00, 0.15, 10, 4.80, 0.9800, -6.7900, 39.2050, 'Dar es Salaam City Center', true, 0.90, NOW(), NOW()),
('courier_004', 'Grace Wanjiku', '+255745678901', 'motorcycle', 12.00, 0.08, 6, 4.60, 0.9400, -6.7950, 39.2120, 'Dar es Salaam Kariakoo', true, 0.85, NOW(), NOW()),
('courier_005', 'Michael Oduya', '+255756789012', 'van', 50.00, 0.30, 20, 4.70, 0.9600, -6.7880, 39.2000, 'Dar es Salaam Industrial Area', true, 0.88, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  vehicle_type = EXCLUDED.vehicle_type,
  max_weight = EXCLUDED.max_weight,
  max_volume = EXCLUDED.max_volume,
  max_items = EXCLUDED.max_items,
  rating = EXCLUDED.rating,
  completion_rate = EXCLUDED.completion_rate,
  current_lat = EXCLUDED.current_lat,
  current_lng = EXCLUDED.current_lng,
  current_address = EXCLUDED.current_address,
  is_available = EXCLUDED.is_available,
  traffic_experience = EXCLUDED.traffic_experience,
  updated_at = NOW();

-- Verify the couriers were inserted
SELECT
  id,
  name,
  vehicle_type,
  rating,
  completion_rate,
  is_available,
  current_lat,
  current_lng,
  current_address
FROM couriers
WHERE is_available = true
ORDER BY id;
