-- Migration: 002_create_products_and_catalog.sql
-- Description: Product catalog, categories, and inventory management

-- Categories table
CREATE TABLE categories (
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

-- Products table
CREATE TABLE products (
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

-- Product variants table
CREATE TABLE product_variants (
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

-- Inventory table
CREATE TABLE inventory (
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

-- Inventory reservations table
CREATE TABLE inventory_reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL,
  product_variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  warehouse_id UUID,
  quantity INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Product reviews table
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  order_id UUID,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(200),
  content TEXT,
  sentiment VARCHAR(20),
  status VARCHAR(20) DEFAULT 'published',
  helpful_count INTEGER DEFAULT 0,
  verified_purchase BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Review responses table
CREATE TABLE review_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'published',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_products_seller_id ON products(seller_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX idx_product_variants_sku ON product_variants(sku);
CREATE INDEX idx_inventory_variant_id ON inventory(product_variant_id);
CREATE INDEX idx_inventory_warehouse_id ON inventory(warehouse_id);
CREATE INDEX idx_inventory_reservations_order_id ON inventory_reservations(order_id);
CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_reviews_customer_id ON reviews(customer_id);
CREATE INDEX idx_review_responses_review_id ON review_responses(review_id);

-- Add triggers
CREATE TRIGGER categories_audit_trigger BEFORE INSERT OR UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION audit_trigger();
CREATE TRIGGER products_audit_trigger BEFORE INSERT OR UPDATE ON products FOR EACH ROW EXECUTE FUNCTION audit_trigger();
CREATE TRIGGER product_variants_audit_trigger BEFORE INSERT OR UPDATE ON product_variants FOR EACH ROW EXECUTE FUNCTION audit_trigger();
CREATE TRIGGER inventory_audit_trigger BEFORE INSERT OR UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION audit_trigger();
CREATE TRIGGER reviews_audit_trigger BEFORE INSERT OR UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION audit_trigger();
CREATE TRIGGER review_responses_audit_trigger BEFORE INSERT OR UPDATE ON review_responses FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- Add event triggers
CREATE TRIGGER products_event_trigger AFTER INSERT OR UPDATE OR DELETE ON products FOR EACH ROW EXECUTE FUNCTION publish_event();
CREATE TRIGGER inventory_event_trigger AFTER INSERT OR UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION publish_event();
CREATE TRIGGER reviews_event_trigger AFTER INSERT OR UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION publish_event();

-- Row Level Security policies
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_responses ENABLE ROW LEVEL SECURITY;

-- Categories are public
CREATE POLICY categories_select_all ON categories FOR SELECT USING (true);

-- Products policies
CREATE POLICY products_select_published ON products FOR SELECT USING (status = 'PUBLISHED');
CREATE POLICY products_select_own ON products FOR SELECT USING (auth.uid() = seller_id);
CREATE POLICY products_insert_own ON products FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY products_update_own ON products FOR UPDATE USING (auth.uid() = seller_id);

-- Reviews policies
CREATE POLICY reviews_select_published ON reviews FOR SELECT USING (status = 'published');
CREATE POLICY reviews_insert_own ON reviews FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY review_responses_select_all ON review_responses FOR SELECT USING (status = 'published');
CREATE POLICY review_responses_insert_seller ON review_responses FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM products p JOIN reviews r ON p.id = r.product_id 
          WHERE r.id = review_id AND p.seller_id = auth.uid())
);