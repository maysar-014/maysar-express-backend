-- Logistics Service Database Schema
-- Migration: 001_create_logistics_tables.sql

-- Couriers table
CREATE TABLE IF NOT EXISTS couriers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'busy', 'offline')),
    vehicle_type VARCHAR(20) NOT NULL CHECK (vehicle_type IN ('motorcycle', 'bicycle', 'van', 'car')),
    vehicle_license_plate VARCHAR(20) NOT NULL,
    vehicle_capacity DECIMAL(8,2) NOT NULL,
    vehicle_fuel_type VARCHAR(20) NOT NULL CHECK (vehicle_fuel_type IN ('petrol', 'electric', 'hybrid')),
    current_latitude DECIMAL(10,8),
    current_longitude DECIMAL(11,8),
    location_accuracy DECIMAL(5,2),
    location_timestamp TIMESTAMP,
    on_time_delivery_rate DECIMAL(5,2) DEFAULT 0,
    customer_rating DECIMAL(3,2) DEFAULT 0,
    completed_deliveries INTEGER DEFAULT 0,
    total_earnings DECIMAL(12,2) DEFAULT 0,
    average_delivery_time INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Deliveries table
CREATE TABLE IF NOT EXISTS deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    courier_id UUID REFERENCES couriers(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'cancelled')),
    tracking_number VARCHAR(50) UNIQUE,
    
    -- Pickup address
    pickup_street VARCHAR(255) NOT NULL,
    pickup_city VARCHAR(100) NOT NULL,
    pickup_region VARCHAR(100) NOT NULL,
    pickup_postal_code VARCHAR(20),
    pickup_latitude DECIMAL(10,8) NOT NULL,
    pickup_longitude DECIMAL(11,8) NOT NULL,
    pickup_contact_name VARCHAR(255) NOT NULL,
    pickup_contact_phone VARCHAR(20) NOT NULL,
    
    -- Delivery address
    delivery_street VARCHAR(255) NOT NULL,
    delivery_city VARCHAR(100) NOT NULL,
    delivery_region VARCHAR(100) NOT NULL,
    delivery_postal_code VARCHAR(20),
    delivery_latitude DECIMAL(10,8) NOT NULL,
    delivery_longitude DECIMAL(11,8) NOT NULL,
    delivery_contact_name VARCHAR(255) NOT NULL,
    delivery_contact_phone VARCHAR(20) NOT NULL,
    
    -- Package details
    package_weight DECIMAL(8,2) NOT NULL,
    package_length DECIMAL(8,2) NOT NULL,
    package_width DECIMAL(8,2) NOT NULL,
    package_height DECIMAL(8,2) NOT NULL,
    package_value DECIMAL(12,2) NOT NULL,
    package_fragile BOOLEAN DEFAULT FALSE,
    package_perishable BOOLEAN DEFAULT FALSE,
    package_items JSONB,
    
    -- Timestamps
    estimated_delivery_time TIMESTAMP,
    actual_delivery_time TIMESTAMP,
    assigned_at TIMESTAMP,
    picked_up_at TIMESTAMP,
    in_transit_at TIMESTAMP,
    out_for_delivery_at TIMESTAMP,
    delivered_at TIMESTAMP,
    failed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Location history table
CREATE TABLE IF NOT EXISTS location_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    courier_id UUID NOT NULL REFERENCES couriers(id),
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    accuracy DECIMAL(5,2),
    speed DECIMAL(5,2),
    heading DECIMAL(5,2),
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Earnings table
CREATE TABLE IF NOT EXISTS earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    courier_id UUID NOT NULL REFERENCES couriers(id),
    delivery_id UUID REFERENCES deliveries(id),
    date DATE NOT NULL,
    base_earnings DECIMAL(10,2) DEFAULT 0,
    distance_bonus DECIMAL(10,2) DEFAULT 0,
    time_bonus DECIMAL(10,2) DEFAULT 0,
    performance_bonus DECIMAL(10,2) DEFAULT 0,
    penalties DECIMAL(10,2) DEFAULT 0,
    tips DECIMAL(10,2) DEFAULT 0,
    total_earnings DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'TZS',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    courier_id UUID NOT NULL REFERENCES couriers(id),
    date DATE NOT NULL,
    deliveries_completed INTEGER DEFAULT 0,
    on_time_deliveries INTEGER DEFAULT 0,
    total_distance DECIMAL(10,2) DEFAULT 0,
    total_duration INTEGER DEFAULT 0,
    customer_ratings JSONB,
    efficiency_score DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(courier_id, date)
);

-- Routes table
CREATE TABLE IF NOT EXISTS routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    courier_id UUID NOT NULL REFERENCES couriers(id),
    delivery_ids UUID[] NOT NULL,
    optimized_waypoints JSONB NOT NULL,
    total_distance DECIMAL(10,2) NOT NULL,
    estimated_duration INTEGER NOT NULL,
    actual_duration INTEGER,
    fuel_efficiency DECIMAL(8,2),
    traffic_conditions VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_couriers_status ON couriers(status);
CREATE INDEX IF NOT EXISTS idx_couriers_location ON couriers(current_latitude, current_longitude);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_courier ON deliveries(courier_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_created ON deliveries(created_at);
CREATE INDEX IF NOT EXISTS idx_location_history_courier_time ON location_history(courier_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_earnings_courier_date ON earnings(courier_id, date);
CREATE INDEX IF NOT EXISTS idx_performance_courier_date ON performance_metrics(courier_id, date);