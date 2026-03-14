-- Maysar Logistics Service Database Schema
-- Run this script in Database SQL Editor

-- Create couriers table
CREATE TABLE IF NOT EXISTS couriers (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  vehicle_type VARCHAR(50) NOT NULL,
  max_weight DECIMAL(8,2) DEFAULT 10.00,
  max_volume DECIMAL(8,2) DEFAULT 0.05,
  max_items INTEGER DEFAULT 5,
  rating DECIMAL(3,2) DEFAULT 4.50,
  completion_rate DECIMAL(5,4) DEFAULT 0.9000,
  current_lat DECIMAL(10,8),
  current_lng DECIMAL(11,8),
  current_address TEXT,
  is_available BOOLEAN DEFAULT true,
  traffic_experience DECIMAL(3,2) DEFAULT 0.80,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create deliveries table
CREATE TABLE IF NOT EXISTS deliveries (
  id VARCHAR(50) PRIMARY KEY,
  order_id VARCHAR(50) NOT NULL,
  courier_id VARCHAR(50) REFERENCES couriers(id),
  status VARCHAR(20) DEFAULT 'assigned',
  pickup_lat DECIMAL(10,8) NOT NULL,
  pickup_lng DECIMAL(11,8) NOT NULL,
  pickup_address TEXT NOT NULL,
  delivery_lat DECIMAL(10,8) NOT NULL,
  delivery_lng DECIMAL(11,8) NOT NULL,
  delivery_address TEXT NOT NULL,
  estimated_pickup_time TIMESTAMP NOT NULL,
  actual_pickup_time TIMESTAMP,
  estimated_delivery_time TIMESTAMP NOT NULL,
  actual_delivery_time TIMESTAMP,
  weight DECIMAL(8,2) DEFAULT 1.00,
  priority VARCHAR(20) DEFAULT 'standard',
  special_requirements JSONB DEFAULT '[]',
  route_distance DECIMAL(8,2) DEFAULT 0.00,
  route_duration INTEGER DEFAULT 0,
  total_cost DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create tracking table
CREATE TABLE IF NOT EXISTS tracking (
  id VARCHAR(50) PRIMARY KEY,
  delivery_id VARCHAR(50) REFERENCES deliveries(id),
  courier_id VARCHAR(50) REFERENCES couriers(id),
  location_lat DECIMAL(10,8) NOT NULL,
  location_lng DECIMAL(11,8) NOT NULL,
  location_address TEXT,
  speed DECIMAL(5,2) DEFAULT 0.00,
  heading INTEGER DEFAULT 0,
  timestamp TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'moving',
  battery_level DECIMAL(5,2),
  accuracy DECIMAL(5,2) DEFAULT 5.00
);

-- Create earnings table
CREATE TABLE IF NOT EXISTS earnings (
  id VARCHAR(50) PRIMARY KEY,
  courier_id VARCHAR(50) REFERENCES couriers(id),
  delivery_id VARCHAR(50) REFERENCES deliveries(id),
  base_fee DECIMAL(10,2) NOT NULL,
  distance_bonus DECIMAL(10,2) DEFAULT 0.00,
  time_bonus DECIMAL(10,2) DEFAULT 0.00,
  tip_amount DECIMAL(10,2) DEFAULT 0.00,
  total_amount DECIMAL(10,2) NOT NULL,
  commission DECIMAL(10,2) DEFAULT 0.00,
  net_earnings DECIMAL(10,2) DEFAULT 0.00,
  payment_status VARCHAR(20) DEFAULT 'pending',
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_couriers_status ON couriers(is_available);
CREATE INDEX IF NOT EXISTS idx_deliveries_courier_id ON deliveries(courier_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
CREATE INDEX IF NOT EXISTS idx_tracking_courier_id ON tracking(courier_id);
CREATE INDEX IF NOT EXISTS idx_tracking_delivery_id ON tracking(delivery_id);
CREATE INDEX IF NOT EXISTS idx_tracking_timestamp ON tracking(timestamp);
CREATE INDEX IF NOT EXISTS idx_earnings_courier_id ON earnings(courier_id);
CREATE INDEX IF NOT EXISTS idx_earnings_payment_status ON earnings(payment_status);

-- Insert sample data for testing
INSERT INTO couriers (id, name, phone, vehicle_type, current_lat, current_lng, current_address) VALUES
('courier_001', 'John Mwangi', '+255712345678', 'motorcycle', -6.7924, 39.2083, 'Dar es Salaam CBD'),
('courier_002', 'Amina Hassan', '+255723456789', 'bicycle', -6.7924, 39.2083, 'Dar es Salaam CBD')
ON CONFLICT (id) DO NOTHING;

INSERT INTO deliveries (id, order_id, courier_id, pickup_lat, pickup_lng, pickup_address, delivery_lat, delivery_lng, delivery_address, estimated_pickup_time, estimated_delivery_time) VALUES
('del_001', 'order_001', 'courier_001', -6.7924, 39.2083, 'Dar es Salaam CBD', -6.7924, 39.2083, 'Dar es Salaam CBD', NOW(), NOW() + INTERVAL '1 hour')
ON CONFLICT (id) DO NOTHING;

-- Verify tables created successfully
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('couriers', 'deliveries', 'tracking', 'earnings')
ORDER BY table_name, ordinal_position;

