-- DIAGNOSTIC SCRIPT: Comprehensive Courier Availability Analysis
-- Run this in Database SQL Editor to diagnose why no couriers are found

-- STEP 1: Check if couriers table exists and has data
SELECT 'Couriers table info:' as info;
SELECT COUNT(*) as total_couriers FROM couriers;

-- STEP 2: Check all couriers (regardless of availability)
SELECT
  id,
  name,
  is_available,
  rating,
  completion_rate,
  current_lat,
  current_lng,
  current_address,
  vehicle_type
FROM couriers
ORDER BY id;

-- STEP 3: Check couriers that meet basic criteria
SELECT
  id,
  name,
  is_available,
  rating,
  completion_rate,
  current_lat,
  current_lng,
  current_address
FROM couriers
WHERE is_available = true
  AND rating >= 4.0
  AND completion_rate >= 0.90
  AND current_lat IS NOT NULL
  AND current_lng IS NOT NULL;

-- STEP 4: Test the exact query used by the repository
SELECT 'Repository query results:' as info;
SELECT
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
FROM couriers
WHERE is_available = true
  AND rating >= 4.0
  AND completion_rate >= 0.90
  AND current_lat IS NOT NULL
  AND current_lng IS NOT NULL;

-- STEP 5: Test distance calculation from API pickup location
-- API uses pickup location: lat=-6.7924, lng=39.2083 (Dar es Salaam CBD)
SELECT
  id,
  name,
  current_lat,
  current_lng,
  current_address,
  -- Calculate distance using local great-circle approximation (km)
  (6371 * acos(
    cos(radians(-6.7924)) * cos(radians(current_lat)) *
    cos(radians(current_lng) - radians(39.2083)) +
    sin(radians(-6.7924)) * sin(radians(current_lat))
  )) as distance_km,
  is_available,
  rating,
  completion_rate
FROM couriers
WHERE is_available = true
  AND rating >= 4.0
  AND completion_rate >= 0.90
  AND current_lat IS NOT NULL
  AND current_lng IS NOT NULL
ORDER BY distance_km;

-- STEP 6: Check if we have any couriers within 50km radius
SELECT
  id,
  name,
  current_lat,
  current_lng,
  current_address,
  (6371 * acos(
    cos(radians(-6.7924)) * cos(radians(current_lat)) *
    cos(radians(current_lng) - radians(39.2083)) +
    sin(radians(-6.7924)) * sin(radians(current_lat))
  )) as distance_km
FROM couriers
WHERE is_available = true
  AND rating >= 4.0
  AND completion_rate >= 0.90
  AND current_lat IS NOT NULL
  AND current_lng IS NOT NULL
  AND (6371 * acos(
    cos(radians(-6.7924)) * cos(radians(current_lat)) *
    cos(radians(current_lng) - radians(39.2083)) +
    sin(radians(-6.7924)) * sin(radians(current_lat))
  )) <= 50
ORDER BY distance_km;

