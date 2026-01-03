-- Migration: 004_create_notifications_and_analytics.sql
-- Description: Notifications, analytics, and system monitoring

-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  recipient_type VARCHAR(20) NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  channel VARCHAR(20) NOT NULL, -- 'push', 'email', 'sms'
  status VARCHAR(20) DEFAULT 'pending',
  data JSONB DEFAULT '{}',
  sent_at TIMESTAMP,
  read_at TIMESTAMP,
  clicked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Support tickets table
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES users(id),
  subject VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'open',
  category VARCHAR(50),
  assigned_to UUID REFERENCES users(id),
  resolution TEXT,
  resolved_at TIMESTAMP,
  type VARCHAR(20) DEFAULT 'general',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Analytics tables
CREATE TABLE seller_analytics (
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

CREATE TABLE courier_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  courier_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  deliveries_completed INTEGER DEFAULT 0,
  total_earnings DECIMAL(10,2) DEFAULT 0,
  average_delivery_time INTEGER DEFAULT 0,
  customer_rating DECIMAL(3,2) DEFAULT 0,
  distance_traveled DECIMAL(10,2) DEFAULT 0,
  fuel_cost DECIMAL(10,2) DEFAULT 0,
  efficiency_score DECIMAL(5,4) DEFAULT 0,
  on_time_rate DECIMAL(5,4) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(courier_id, date)
);

CREATE TABLE supplier_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  orders_shipped INTEGER DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  production_capacity INTEGER DEFAULT 0,
  capacity_utilization DECIMAL(5,4) DEFAULT 0,
  quality_score DECIMAL(5,4) DEFAULT 0,
  on_time_delivery_rate DECIMAL(5,4) DEFAULT 0,
  defect_rate DECIMAL(5,4) DEFAULT 0,
  customer_satisfaction DECIMAL(3,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(supplier_id, date)
);

CREATE TABLE enabler_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enabler_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  tasks_completed INTEGER DEFAULT 0,
  sellers_onboarded INTEGER DEFAULT 0,
  trainings_delivered INTEGER DEFAULT 0,
  total_earnings DECIMAL(10,2) DEFAULT 0,
  performance_score DECIMAL(5,4) DEFAULT 0,
  customer_satisfaction DECIMAL(3,2) DEFAULT 0,
  response_time INTEGER DEFAULT 0,
  success_rate DECIMAL(5,4) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(enabler_id, date)
);

-- System metrics table
CREATE TABLE system_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(15,4) NOT NULL,
  metric_type VARCHAR(50) NOT NULL,
  tags JSONB DEFAULT '{}',
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tasks table (for enablers)
CREATE TABLE tasks (
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

-- Add indexes
CREATE INDEX idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_support_tickets_customer_id ON support_tickets(customer_id);
CREATE INDEX idx_support_tickets_seller_id ON support_tickets(seller_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX idx_seller_analytics_seller_id ON seller_analytics(seller_id);
CREATE INDEX idx_seller_analytics_date ON seller_analytics(date);
CREATE INDEX idx_courier_analytics_courier_id ON courier_analytics(courier_id);
CREATE INDEX idx_courier_analytics_date ON courier_analytics(date);
CREATE INDEX idx_supplier_analytics_supplier_id ON supplier_analytics(supplier_id);
CREATE INDEX idx_supplier_analytics_date ON supplier_analytics(date);
CREATE INDEX idx_enabler_analytics_enabler_id ON enabler_analytics(enabler_id);
CREATE INDEX idx_enabler_analytics_date ON enabler_analytics(date);
CREATE INDEX idx_system_metrics_name ON system_metrics(metric_name);
CREATE INDEX idx_system_metrics_timestamp ON system_metrics(timestamp);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_tasks_enabler_id ON tasks(enabler_id);
CREATE INDEX idx_tasks_seller_id ON tasks(seller_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_task_type ON tasks(task_type);

-- Add triggers
CREATE TRIGGER support_tickets_audit_trigger BEFORE INSERT OR UPDATE ON support_tickets FOR EACH ROW EXECUTE FUNCTION audit_trigger();
CREATE TRIGGER seller_analytics_audit_trigger BEFORE INSERT OR UPDATE ON seller_analytics FOR EACH ROW EXECUTE FUNCTION audit_trigger();
CREATE TRIGGER courier_analytics_audit_trigger BEFORE INSERT OR UPDATE ON courier_analytics FOR EACH ROW EXECUTE FUNCTION audit_trigger();
CREATE TRIGGER supplier_analytics_audit_trigger BEFORE INSERT OR UPDATE ON supplier_analytics FOR EACH ROW EXECUTE FUNCTION audit_trigger();
CREATE TRIGGER enabler_analytics_audit_trigger BEFORE INSERT OR UPDATE ON enabler_analytics FOR EACH ROW EXECUTE FUNCTION audit_trigger();
CREATE TRIGGER tasks_audit_trigger BEFORE INSERT OR UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- Add event triggers
CREATE TRIGGER notifications_event_trigger AFTER INSERT OR UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION publish_event();
CREATE TRIGGER support_tickets_event_trigger AFTER INSERT OR UPDATE ON support_tickets FOR EACH ROW EXECUTE FUNCTION publish_event();
CREATE TRIGGER tasks_event_trigger AFTER INSERT OR UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION publish_event();

-- Row Level Security policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE courier_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE enabler_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY notifications_select_own ON notifications FOR SELECT USING (auth.uid() = recipient_id);

-- Support tickets policies
CREATE POLICY support_tickets_select_own ON support_tickets FOR SELECT USING (
  auth.uid() = customer_id OR auth.uid() = seller_id OR auth.uid() = assigned_to
);
CREATE POLICY support_tickets_insert_customer ON support_tickets FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY support_tickets_update_assigned ON support_tickets FOR UPDATE USING (auth.uid() = assigned_to);

-- Analytics policies
CREATE POLICY seller_analytics_select_own ON seller_analytics FOR SELECT USING (auth.uid() = seller_id);
CREATE POLICY courier_analytics_select_own ON courier_analytics FOR SELECT USING (auth.uid() = courier_id);
CREATE POLICY supplier_analytics_select_own ON supplier_analytics FOR SELECT USING (auth.uid() = supplier_id);
CREATE POLICY enabler_analytics_select_own ON enabler_analytics FOR SELECT USING (auth.uid() = enabler_id);

-- Tasks policies
CREATE POLICY tasks_select_related ON tasks FOR SELECT USING (auth.uid() = enabler_id OR auth.uid() = seller_id);
CREATE POLICY tasks_update_enabler ON tasks FOR UPDATE USING (auth.uid() = enabler_id);