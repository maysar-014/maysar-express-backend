-- Initialize separate databases for each service
CREATE DATABASE maysar_auth;
CREATE DATABASE maysar_order;
CREATE DATABASE maysar_payment;
CREATE DATABASE maysar_admin;
CREATE DATABASE maysar_seller;
CREATE DATABASE maysar_catalog;
CREATE DATABASE maysar_inventory;
CREATE DATABASE maysar_logistics;
CREATE DATABASE maysar_commission;
CREATE DATABASE maysar_trust;
CREATE DATABASE maysar_notification;
CREATE DATABASE maysar_analytics;
CREATE DATABASE maysar_community;

-- Grant permissions to the user
GRANT ALL PRIVILEGES ON DATABASE maysar_auth TO maysar_user;
GRANT ALL PRIVILEGES ON DATABASE maysar_order TO maysar_user;
GRANT ALL PRIVILEGES ON DATABASE maysar_payment TO maysar_user;
GRANT ALL PRIVILEGES ON DATABASE maysar_admin TO maysar_user;
GRANT ALL PRIVILEGES ON DATABASE maysar_seller TO maysar_user;
GRANT ALL PRIVILEGES ON DATABASE maysar_catalog TO maysar_user;
GRANT ALL PRIVILEGES ON DATABASE maysar_inventory TO maysar_user;
GRANT ALL PRIVILEGES ON DATABASE maysar_logistics TO maysar_user;
GRANT ALL PRIVILEGES ON DATABASE maysar_commission TO maysar_user;
GRANT ALL PRIVILEGES ON DATABASE maysar_trust TO maysar_user;
GRANT ALL PRIVILEGES ON DATABASE maysar_notification TO maysar_user;
GRANT ALL PRIVILEGES ON DATABASE maysar_analytics TO maysar_user;
GRANT ALL PRIVILEGES ON DATABASE maysar_community TO maysar_user;

-- Enable UUID extension for all databases
\c maysar_auth;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c maysar_order;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c maysar_payment;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c maysar_admin;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c maysar_seller;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c maysar_catalog;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c maysar_inventory;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c maysar_logistics;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c maysar_commission;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c maysar_trust;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c maysar_notification;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c maysar_analytics;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c maysar_community;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Switch to seller database and create schema
\c maysar_seller;

-- Seller Service Database Schema
CREATE TABLE sellers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    business_type VARCHAR(100),
    registration_number VARCHAR(100) UNIQUE,
    tax_id VARCHAR(100),
    business_address JSONB NOT NULL,
    contact_details JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    verification_status VARCHAR(50) DEFAULT 'unverified',
    risk_score DECIMAL(3,2) DEFAULT 0.5,
    performance_score DECIMAL(3,2) DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE kyc_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    document_number VARCHAR(100) NOT NULL,
    document_url VARCHAR(500) NOT NULL,
    verification_status VARCHAR(50) DEFAULT 'pending',
    verified_by UUID,
    verified_at TIMESTAMP WITH TIME ZONE,
    expiry_date DATE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE seller_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    badge_type VARCHAR(50) NOT NULL,
    awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    criteria_met JSONB,
    awarded_by UUID
);

-- Switch to catalog database and create schema
\c maysar_catalog;

-- Catalog Service Database Schema
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    seo_metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category_id UUID NOT NULL REFERENCES categories(id),
    brand VARCHAR(100),
    model VARCHAR(100),
    status VARCHAR(50) DEFAULT 'draft',
    visibility VARCHAR(50) DEFAULT 'public',
    seo_metadata JSONB,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255),
    price DECIMAL(10,2) NOT NULL,
    compare_at_price DECIMAL(10,2),
    cost_price DECIMAL(10,2),
    inventory_policy VARCHAR(50) DEFAULT 'deny',
    weight DECIMAL(8,3),
    dimensions JSONB,
    attributes JSONB,
    images JSONB,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE media_refs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    media_type VARCHAR(50) NOT NULL,
    url VARCHAR(500) NOT NULL,
    alt_text VARCHAR(255),
    display_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT false,
    metadata JSONB,
    uploaded_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Switch to logistics database and create schema
\c maysar_logistics;

-- Logistics Service Database Schema
CREATE TABLE shipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL,
    tracking_number VARCHAR(100) UNIQUE NOT NULL,
    carrier VARCHAR(100) NOT NULL,
    service_type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    origin_address JSONB NOT NULL,
    destination_address JSONB NOT NULL,
    estimated_delivery TIMESTAMP WITH TIME ZONE,
    actual_delivery TIMESTAMP WITH TIME ZONE,
    weight DECIMAL(8,3),
    dimensions JSONB,
    insurance_amount DECIMAL(10,2),
    shipping_cost DECIMAL(8,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE tracking_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    description TEXT,
    location JSONB,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    carrier_status_code VARCHAR(50),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE proof_of_delivery (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    recipient_name VARCHAR(255),
    recipient_signature TEXT,
    recipient_photo_url VARCHAR(500),
    delivery_notes TEXT,
    delivery_coordinates JSONB,
    delivery_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    delivered_by UUID NOT NULL,
    verified_by UUID,
    verification_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Switch to commission database and create schema
\c maysar_commission;

-- Commission Service Database Schema
CREATE TABLE commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL,
    seller_id UUID NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    rate DECIMAL(5,4) NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    paid_at TIMESTAMP WITH TIME ZONE,
    payout_id UUID,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID NOT NULL,
    referee_id UUID NOT NULL,
    referral_code VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    reward_amount DECIMAL(8,2),
    reward_paid BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,
    amount DECIMAL(8,2) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'earned',
    expires_at TIMESTAMP WITH TIME ZONE,
    redeemed_at TIMESTAMP WITH TIME ZONE,
    reference_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Switch to trust database and create schema
\c maysar_trust;

-- Trust Service Database Schema
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL,
    reviewer_id UUID NOT NULL,
    seller_id UUID NOT NULL,
    product_id UUID NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    comment TEXT,
    images JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    moderated_by UUID,
    moderated_at TIMESTAMP WITH TIME ZONE,
    helpful_votes INTEGER DEFAULT 0,
    total_votes INTEGER DEFAULT 0,
    verified_purchase BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE trust_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    overall_score DECIMAL(3,2) NOT NULL CHECK (overall_score >= 0 AND overall_score <= 5),
    review_count INTEGER DEFAULT 0,
    quality_score DECIMAL(3,2),
    delivery_score DECIMAL(3,2),
    communication_score DECIMAL(3,2),
    last_calculated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL,
    buyer_id UUID NOT NULL,
    seller_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'opened',
    priority VARCHAR(50) DEFAULT 'normal',
    description TEXT NOT NULL,
    buyer_evidence JSONB,
    seller_evidence JSONB,
    admin_evidence JSONB,
    decision VARCHAR(50),
    refund_amount DECIMAL(10,2),
    resolution_notes TEXT,
    resolved_by UUID,
    resolved_at TIMESTAMP WITH TIME ZONE,
    sla_deadline TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Switch to notification database and create schema
\c maysar_notification;

-- Notification Service Database Schema
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL,
    subject VARCHAR(255),
    content TEXT NOT NULL,
    variables JSONB,
    locale VARCHAR(10) DEFAULT 'en',
    status VARCHAR(50) DEFAULT 'active',
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    template_id UUID REFERENCES templates(id),
    type VARCHAR(50) NOT NULL,
    priority VARCHAR(50) DEFAULT 'normal',
    subject VARCHAR(255),
    content TEXT,
    data JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    failure_reason TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE delivery_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_message_id VARCHAR(255),
    status VARCHAR(50) NOT NULL,
    status_code VARCHAR(10),
    response_body TEXT,
    error_message TEXT,
    delivery_cost DECIMAL(6,4),
    user_agent TEXT,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_shipments_order_id ON shipments(order_id);
CREATE INDEX idx_shipments_tracking_number ON shipments(tracking_number);
CREATE INDEX idx_shipments_status ON shipments(status);

CREATE INDEX idx_tracking_events_shipment_id ON tracking_events(shipment_id);
CREATE INDEX idx_tracking_events_timestamp ON tracking_events(timestamp);

CREATE INDEX idx_reviews_order_id ON reviews(order_id);
CREATE INDEX idx_reviews_seller_id ON reviews(seller_id);
CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_reviews_status ON reviews(status);

CREATE INDEX idx_trust_scores_entity ON trust_scores(entity_type, entity_id);

CREATE INDEX idx_disputes_order_id ON disputes(order_id);
CREATE INDEX idx_disputes_status ON disputes(status);
CREATE INDEX idx_disputes_priority ON disputes(priority);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_type ON notifications(type);

CREATE INDEX idx_delivery_logs_notification_id ON delivery_logs(notification_id);
CREATE INDEX idx_delivery_logs_provider ON delivery_logs(provider);
