-- Maysar Logistics Service Database Schema
-- Run this script in Supabase SQL Editor

-- Create couriers table
CREATE TABLE IF NOT EXISTS couriers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) NOT NULL,
  vehicle_type VARCHAR(50) NOT NULL,
  vehicle_number VARCHAR(50) NOT NULL,
  license_number VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  rating DECIMAL(3,2) DEFAULT 0.00,
  total_deliveries INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create deliveries table
CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_id UUID REFERENCES couriers(id),
  order_id UUID NOT NULL,
  pickup_address TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  pickup_lat DECIMAL(10,8),
  pickup_lng DECIMAL(11,8),
  delivery_lat DECIMAL(10,8),
  delivery_lng DECIMAL(11,8),
  status VARCHAR(20) DEFAULT 'pending',
  scheduled_pickup TIMESTAMP,
  actual_pickup TIMESTAMP,
  estimated_delivery TIMESTAMP,
  actual_delivery TIMESTAMP,
  distance_km DECIMAL(8,2),
  delivery_fee DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create location_history table
CREATE TABLE IF NOT EXISTS location_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_id UUID REFERENCES couriers(id),
  delivery_id UUID REFERENCES deliveries(id),
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  speed DECIMAL(5,2),
  heading INTEGER
);

-- Create earnings table
CREATE TABLE IF NOT EXISTS earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_id UUID REFERENCES couriers(id),
  delivery_id UUID REFERENCES deliveries(id),
  base_fee DECIMAL(10,2) NOT NULL,
  distance_bonus DECIMAL(10,2) DEFAULT 0.00,
  time_bonus DECIMAL(10,2) DEFAULT 0.00,
  tip_amount DECIMAL(10,2) DEFAULT 0.00,
  total_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_couriers_email ON couriers(email);
CREATE INDEX IF NOT EXISTS idx_couriers_status ON couriers(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_courier_id ON deliveries(courier_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
CREATE INDEX IF NOT EXISTS idx_location_history_courier_id ON location_history(courier_id);
CREATE INDEX IF NOT EXISTS idx_location_history_timestamp ON location_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_earnings_courier_id ON earnings(courier_id);
CREATE INDEX IF NOT EXISTS idx_earnings_status ON earnings(status);

-- Insert sample data for testing
INSERT INTO couriers (user_id, name, email, phone, vehicle_type, vehicle_number, license_number) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'John Mwangi', 'john.mwangi@example.com', '+255712345678', 'motorcycle', 'TZS 123 AB', 'DL123456789'),
('550e8400-e29b-41d4-a716-446655440001', 'Amina Hassan', 'amina.hassan@example.com', '+255723456789', 'bicycle', 'TZS 456 CD', 'DL987654321')
ON CONFLICT (email) DO NOTHING;

-- Verify tables created successfully
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('couriers', 'deliveries', 'location_history', 'earnings')
ORDER BY table_name, ordinal_position;