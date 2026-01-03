-- Migration: 003_create_orders_and_transactions.sql
-- Description: Order management, payments, and transaction tracking

-- Orders table
CREATE TABLE orders (
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
  currency VARCHAR(3) DEFAULT 'USD',
  payment_status payment_status DEFAULT 'PENDING',
  shipping_address JSONB NOT NULL,
  billing_address JSONB,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Order items table
CREATE TABLE order_items (
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

-- Transactions table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id),
  sender_id UUID REFERENCES users(id),
  receiver_id UUID REFERENCES users(id),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
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

-- Shipments table
CREATE TABLE shipments (
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

-- Shipment tracking table
CREATE TABLE shipment_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_id UUID REFERENCES shipments(id) ON DELETE CASCADE,
  status delivery_status NOT NULL,
  location VARCHAR(200),
  coordinates POINT,
  notes TEXT,
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Returns table
CREATE TABLE returns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES order_items(id),
  customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reason VARCHAR(100) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'requested',
  refund_amount DECIMAL(10,2),
  return_shipping_cost DECIMAL(10,2) DEFAULT 0,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Commissions table
CREATE TABLE commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  recipient_type VARCHAR(20) NOT NULL,
  order_id UUID REFERENCES orders(id),
  transaction_id UUID REFERENCES transactions(id),
  amount DECIMAL(10,2) NOT NULL,
  percentage DECIMAL(5,4),
  commission_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  calculated_at TIMESTAMP DEFAULT NOW(),
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Payouts table
CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  recipient_type VARCHAR(20) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(20) DEFAULT 'pending',
  payout_method VARCHAR(50),
  bank_details JSONB,
  scheduled_date DATE,
  processed_at TIMESTAMP,
  gateway_payout_id VARCHAR(100),
  gateway_response JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX idx_orders_seller_id ON orders(seller_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_transactions_order_id ON transactions(order_id);
CREATE INDEX idx_transactions_sender_id ON transactions(sender_id);
CREATE INDEX idx_transactions_receiver_id ON transactions(receiver_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_shipments_order_id ON shipments(order_id);
CREATE INDEX idx_shipments_courier_id ON shipments(courier_id);
CREATE INDEX idx_shipments_tracking_number ON shipments(tracking_number);
CREATE INDEX idx_shipment_tracking_shipment_id ON shipment_tracking(shipment_id);
CREATE INDEX idx_returns_order_id ON returns(order_id);
CREATE INDEX idx_returns_customer_id ON returns(customer_id);
CREATE INDEX idx_commissions_recipient_id ON commissions(recipient_id);
CREATE INDEX idx_commissions_order_id ON commissions(order_id);
CREATE INDEX idx_payouts_recipient_id ON payouts(recipient_id);

-- Add triggers
CREATE TRIGGER orders_audit_trigger BEFORE INSERT OR UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION audit_trigger();
CREATE TRIGGER order_items_audit_trigger BEFORE INSERT OR UPDATE ON order_items FOR EACH ROW EXECUTE FUNCTION audit_trigger();
CREATE TRIGGER transactions_audit_trigger BEFORE INSERT OR UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION audit_trigger();
CREATE TRIGGER shipments_audit_trigger BEFORE INSERT OR UPDATE ON shipments FOR EACH ROW EXECUTE FUNCTION audit_trigger();
CREATE TRIGGER returns_audit_trigger BEFORE INSERT OR UPDATE ON returns FOR EACH ROW EXECUTE FUNCTION audit_trigger();
CREATE TRIGGER commissions_audit_trigger BEFORE INSERT OR UPDATE ON commissions FOR EACH ROW EXECUTE FUNCTION audit_trigger();
CREATE TRIGGER payouts_audit_trigger BEFORE INSERT OR UPDATE ON payouts FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- Add event triggers
CREATE TRIGGER orders_event_trigger AFTER INSERT OR UPDATE OR DELETE ON orders FOR EACH ROW EXECUTE FUNCTION publish_event();
CREATE TRIGGER transactions_event_trigger AFTER INSERT OR UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION publish_event();
CREATE TRIGGER shipments_event_trigger AFTER INSERT OR UPDATE ON shipments FOR EACH ROW EXECUTE FUNCTION publish_event();

-- Row Level Security policies
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

-- Orders policies
CREATE POLICY orders_select_own ON orders FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY orders_insert_buyer ON orders FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY orders_update_seller ON orders FOR UPDATE USING (auth.uid() = seller_id);

-- Transactions policies
CREATE POLICY transactions_select_own ON transactions FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Shipments policies
CREATE POLICY shipments_select_related ON shipments FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE id = order_id AND (buyer_id = auth.uid() OR seller_id = auth.uid()))
  OR auth.uid() = courier_id
);
CREATE POLICY shipments_update_courier ON shipments FOR UPDATE USING (auth.uid() = courier_id);

-- Commissions and payouts policies
CREATE POLICY commissions_select_own ON commissions FOR SELECT USING (auth.uid() = recipient_id);
CREATE POLICY payouts_select_own ON payouts FOR SELECT USING (auth.uid() = recipient_id);