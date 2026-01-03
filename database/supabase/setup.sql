-- Supabase Project Configuration
-- Development Project: maysar-dev
-- Staging Project: maysar-staging
-- Production Project: maysar-prod

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create custom types
CREATE TYPE user_role AS ENUM ('ADMIN', 'SELLER', 'COURIER', 'SUPPLIER', 'ENABLER', 'CUSTOMER');
CREATE TYPE user_status AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED');
CREATE TYPE order_status AS ENUM ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED');
CREATE TYPE payment_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED');
CREATE TYPE product_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED', 'OUT_OF_STOCK');
CREATE TYPE kyc_status AS ENUM ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED');
CREATE TYPE delivery_status AS ENUM ('ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'FAILED');

-- Enable Row Level Security on all tables
ALTER DATABASE postgres SET row_security = on;

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