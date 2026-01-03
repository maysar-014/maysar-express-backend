-- MAYSAR PLATFORM - COMPLETE DATABASE SCHEMA
-- Execute this in Supabase SQL Editor to create all tables

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create custom types
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('ADMIN', 'SELLER', 'COURIER', 'SUPPLIER', 'ENABLER', 'CUSTOMER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE product_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED', 'OUT_OF_STOCK');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE kyc_status AS ENUM ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE delivery_status AS ENUM ('ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_at = NOW();
    NEW.updated_at = NOW();
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.updated_at = NOW();
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create event publishing function
CREATE OR REPLACE FUNCTION publish_event()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'table_changes',
    json_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'data', row_to_json(NEW)
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- USERS AND AUTH TABLES
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  role user_role NOT NULL,
  status user_status DEFAULT 'PENDING',
  profile JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  avatar_url TEXT,
  address JSONB,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kyc_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL,
  document_url TEXT NOT NULL,
  status kyc_status DEFAULT 'PENDING',
  verification_data JSONB DEFAULT '{}',
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- PRODUCT CATALOG TABLES
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES categories(id),
  image_url TEXT,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(500) NOT NULL,
  slug VARCHAR(500) UNIQUE NOT NULL,
  description TEXT,
  short_description TEXT,
  category_id UUID REFERENCES categories(id),
  brand VARCHAR(100),
  sku VARCHAR(100),
  status product_status DEFAULT 'DRAFT',
  images JSONB DEFAULT '[]',
  specifications JSONB DEFAULT '{}',
  seo_data JSONB DEFAULT '{}',
  tags TEXT[],
  weight DECIMAL(10,3),
  dimensions JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  name VARCHAR(200),
  sku VARCHAR(100) UNIQUE NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  compare_at_price DECIMAL(10,2),
  cost_price DECIMAL(10,2),
  attributes JSONB DEFAULT '{}',
  images JSONB DEFAULT '[]',
  weight DECIMAL(10,3),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  warehouse_id UUID,
  quantity INTEGER NOT NULL DEFAULT 0,
  available_quantity INTEGER NOT NULL DEFAULT 0,
  reserved_quantity INTEGER NOT NULL DEFAULT 0,
  reorder_point INTEGER DEFAULT 10,
  reorder_quantity INTEGER DEFAULT 50,
  location VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ORDERS AND TRANSACTIONS TABLES
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  buyer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status order_status DEFAULT 'PENDING',
  total_amount DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  shipping_amount DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'TZS',
  payment_status payment_status DEFAULT 'PENDING',
  shipping_address JSONB NOT NULL,
  billing_address JSONB,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_variant_id UUID REFERENCES product_variants(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  product_snapshot JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  shipped_at TIMESTAMP,
  delivered_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  cancellation_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id),
  sender_id UUID REFERENCES users(id),
  receiver_id UUID REFERENCES users(id),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'TZS',
  transaction_type VARCHAR(50) NOT NULL,
  status payment_status DEFAULT 'PENDING',
  payment_method VARCHAR(50),
  payment_gateway VARCHAR(50),
  gateway_transaction_id VARCHAR(100),
  gateway_response JSONB DEFAULT '{}',
  fees DECIMAL(10,2) DEFAULT 0,
  net_amount DECIMAL(10,2),
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  courier_id UUID REFERENCES users(id),
  tracking_number VARCHAR(100) UNIQUE,
  carrier VARCHAR(50),
  service_type VARCHAR(50),
  status delivery_status DEFAULT 'ASSIGNED',
  pickup_address JSONB NOT NULL,
  delivery_address JSONB NOT NULL,
  estimated_delivery TIMESTAMP,
  actual_delivery TIMESTAMP,
  delivery_notes TEXT,
  proof_of_delivery JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ANALYTICS AND NOTIFICATIONS TABLES
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  recipient_type VARCHAR(20) NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  channel VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  data JSONB DEFAULT '{}',
  sent_at TIMESTAMP,
  read_at TIMESTAMP,
  clicked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS seller_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_orders INTEGER DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  total_customers INTEGER DEFAULT 0,
  average_order_value DECIMAL(10,2) DEFAULT 0,
  conversion_rate DECIMAL(5,4) DEFAULT 0,
  return_rate DECIMAL(5,4) DEFAULT 0,
  customer_satisfaction DECIMAL(3,2) DEFAULT 0,
  page_views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(seller_id, date)
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enabler_id UUID REFERENCES users(id),
  seller_id UUID REFERENCES users(id),
  task_type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'pending',
  territory VARCHAR(100),
  estimated_duration INTEGER,
  actual_duration INTEGER,
  completion_notes TEXT,
  evidence JSONB DEFAULT '{}',
  assigned_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  due_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_shipments_courier_id ON shipments(courier_id);
CREATE INDEX IF NOT EXISTS idx_tasks_enabler_id ON tasks(enabler_id);

-- INSERT SAMPLE DATA
INSERT INTO users (id, email, role, status) VALUES
  ('11111111-1111-1111-1111-111111111111', 'admin@maysar.com', 'ADMIN', 'ACTIVE'),
  ('22222222-2222-2222-2222-222222222222', 'seller@maysar.com', 'SELLER', 'ACTIVE'),
  ('33333333-3333-3333-3333-333333333333', 'courier@maysar.com', 'COURIER', 'ACTIVE'),
  ('44444444-4444-4444-4444-444444444444', 'supplier@maysar.com', 'SUPPLIER', 'ACTIVE'),
  ('55555555-5555-5555-5555-555555555555', 'enabler@maysar.com', 'ENABLER', 'ACTIVE'),
  ('66666666-6666-6666-6666-666666666666', 'customer@maysar.com', 'CUSTOMER', 'ACTIVE')
ON CONFLICT (email) DO NOTHING;

INSERT INTO categories (id, name, slug, description) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Electronics', 'electronics', 'Electronic devices and accessories'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Clothing', 'clothing', 'Fashion and apparel'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Home & Garden', 'home-garden', 'Home improvement and garden supplies')
ON CONFLICT (slug) DO NOTHING;

-- Migration completed successfully
SELECT 'Database schema created successfully!' as result;