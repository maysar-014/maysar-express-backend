-- Sample Data Generation Script
-- Description: Realistic sample data for development and testing

-- Insert sample categories
INSERT INTO categories (id, name, slug, description, is_active) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Electronics', 'electronics', 'Electronic devices and accessories', true),
  ('550e8400-e29b-41d4-a716-446655440002', 'Clothing', 'clothing', 'Fashion and apparel', true),
  ('550e8400-e29b-41d4-a716-446655440003', 'Home & Garden', 'home-garden', 'Home improvement and garden supplies', true),
  ('550e8400-e29b-41d4-a716-446655440004', 'Books', 'books', 'Books and educational materials', true),
  ('550e8400-e29b-41d4-a716-446655440005', 'Sports', 'sports', 'Sports equipment and accessories', true);

-- Insert sample users
INSERT INTO users (id, email, role, status, profile) VALUES
  -- Admins
  ('550e8400-e29b-41d4-a716-446655440010', 'admin@maysar.com', 'ADMIN', 'ACTIVE', '{"name": "System Admin", "department": "Operations"}'),
  
  -- Sellers
  ('550e8400-e29b-41d4-a716-446655440020', 'seller1@example.com', 'SELLER', 'ACTIVE', '{"businessName": "Tech Store", "businessType": "Electronics"}'),
  ('550e8400-e29b-41d4-a716-446655440021', 'seller2@example.com', 'SELLER', 'ACTIVE', '{"businessName": "Fashion Hub", "businessType": "Clothing"}'),
  ('550e8400-e29b-41d4-a716-446655440022', 'seller3@example.com', 'SELLER', 'ACTIVE', '{"businessName": "Home Essentials", "businessType": "Home & Garden"}'),
  
  -- Customers
  ('550e8400-e29b-41d4-a716-446655440030', 'customer1@example.com', 'CUSTOMER', 'ACTIVE', '{"name": "John Doe", "preferences": {"notifications": true}}'),
  ('550e8400-e29b-41d4-a716-446655440031', 'customer2@example.com', 'CUSTOMER', 'ACTIVE', '{"name": "Jane Smith", "preferences": {"notifications": true}}'),
  ('550e8400-e29b-41d4-a716-446655440032', 'customer3@example.com', 'CUSTOMER', 'ACTIVE', '{"name": "Bob Johnson", "preferences": {"notifications": false}}'),
  
  -- Couriers
  ('550e8400-e29b-41d4-a716-446655440040', 'courier1@example.com', 'COURIER', 'ACTIVE', '{"name": "Mike Wilson", "vehicle": "Motorcycle", "territory": "Downtown"}'),
  ('550e8400-e29b-41d4-a716-446655440041', 'courier2@example.com', 'COURIER', 'ACTIVE', '{"name": "Sarah Davis", "vehicle": "Van", "territory": "Suburbs"}'),
  
  -- Suppliers
  ('550e8400-e29b-41d4-a716-446655440050', 'supplier1@example.com', 'SUPPLIER', 'ACTIVE', '{"companyName": "Electronics Manufacturer", "capacity": 10000}'),
  ('550e8400-e29b-41d4-a716-446655440051', 'supplier2@example.com', 'SUPPLIER', 'ACTIVE', '{"companyName": "Textile Factory", "capacity": 5000}'),
  
  -- Enablers
  ('550e8400-e29b-41d4-a716-446655440060', 'enabler1@example.com', 'ENABLER', 'ACTIVE', '{"name": "Alice Brown", "skills": ["training", "onboarding"], "territory": "North"}'),
  ('550e8400-e29b-41d4-a716-446655440061', 'enabler2@example.com', 'ENABLER', 'ACTIVE', '{"name": "David Lee", "skills": ["support", "logistics"], "territory": "South"}');

-- Insert sample user profiles
INSERT INTO user_profiles (user_id, first_name, last_name, phone, address) VALUES
  ('550e8400-e29b-41d4-a716-446655440020', 'Tech', 'Store', '+1234567890', '{"street": "123 Tech St", "city": "San Francisco", "state": "CA", "zip": "94105"}'),
  ('550e8400-e29b-41d4-a716-446655440021', 'Fashion', 'Hub', '+1234567891', '{"street": "456 Fashion Ave", "city": "New York", "state": "NY", "zip": "10001"}'),
  ('550e8400-e29b-41d4-a716-446655440030', 'John', 'Doe', '+1234567892', '{"street": "789 Main St", "city": "Chicago", "state": "IL", "zip": "60601"}'),
  ('550e8400-e29b-41d4-a716-446655440031', 'Jane', 'Smith', '+1234567893', '{"street": "321 Oak Ave", "city": "Los Angeles", "state": "CA", "zip": "90210"}');

-- Insert sample products
INSERT INTO products (id, seller_id, name, slug, description, category_id, status, images, specifications, price) VALUES
  ('550e8400-e29b-41d4-a716-446655440100', '550e8400-e29b-41d4-a716-446655440020', 'iPhone 15 Pro', 'iphone-15-pro', 'Latest iPhone with advanced features', '550e8400-e29b-41d4-a716-446655440001', 'PUBLISHED', '["https://example.com/iphone1.jpg", "https://example.com/iphone2.jpg"]', '{"storage": "256GB", "color": "Space Black", "warranty": "1 year"}', 999.99),
  ('550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440020', 'MacBook Air M3', 'macbook-air-m3', 'Powerful laptop for professionals', '550e8400-e29b-41d4-a716-446655440001', 'PUBLISHED', '["https://example.com/macbook1.jpg"]', '{"processor": "M3", "ram": "16GB", "storage": "512GB"}', 1299.99),
  ('550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440021', 'Designer T-Shirt', 'designer-t-shirt', 'Premium cotton t-shirt', '550e8400-e29b-41d4-a716-446655440002', 'PUBLISHED', '["https://example.com/tshirt1.jpg"]', '{"material": "100% Cotton", "fit": "Regular"}', 29.99),
  ('550e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440022', 'Garden Tool Set', 'garden-tool-set', 'Complete gardening toolkit', '550e8400-e29b-41d4-a716-446655440003', 'PUBLISHED', '["https://example.com/tools1.jpg"]', '{"pieces": 10, "material": "Stainless Steel"}', 89.99);

-- Insert sample product variants
INSERT INTO product_variants (id, product_id, name, sku, price, attributes) VALUES
  ('550e8400-e29b-41d4-a716-446655440200', '550e8400-e29b-41d4-a716-446655440100', 'iPhone 15 Pro 256GB Space Black', 'IPH15P-256-SB', 999.99, '{"storage": "256GB", "color": "Space Black"}'),
  ('550e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440100', 'iPhone 15 Pro 512GB Space Black', 'IPH15P-512-SB', 1199.99, '{"storage": "512GB", "color": "Space Black"}'),
  ('550e8400-e29b-41d4-a716-446655440202', '550e8400-e29b-41d4-a716-446655440102', 'Designer T-Shirt Medium', 'DTS-M-BLK', 29.99, '{"size": "M", "color": "Black"}'),
  ('550e8400-e29b-41d4-a716-446655440203', '550e8400-e29b-41d4-a716-446655440102', 'Designer T-Shirt Large', 'DTS-L-BLK', 29.99, '{"size": "L", "color": "Black"}');

-- Insert sample inventory
INSERT INTO inventory (product_variant_id, quantity, available_quantity, reorder_point, reorder_quantity) VALUES
  ('550e8400-e29b-41d4-a716-446655440200', 50, 45, 10, 25),
  ('550e8400-e29b-41d4-a716-446655440201', 30, 28, 5, 15),
  ('550e8400-e29b-41d4-a716-446655440202', 100, 95, 20, 50),
  ('550e8400-e29b-41d4-a716-446655440203', 80, 75, 15, 40);

-- Insert sample orders
INSERT INTO orders (id, order_number, buyer_id, seller_id, status, total_amount, subtotal, shipping_amount, currency, shipping_address, billing_address) VALUES
  ('550e8400-e29b-41d4-a716-446655440300', 'ORD-2024-001', '550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440020', 'DELIVERED', 1009.99, 999.99, 10.00, 'USD', 
   '{"name": "John Doe", "street": "789 Main St", "city": "Chicago", "state": "IL", "zip": "60601"}',
   '{"name": "John Doe", "street": "789 Main St", "city": "Chicago", "state": "IL", "zip": "60601"}'),
  ('550e8400-e29b-41d4-a716-446655440301', 'ORD-2024-002', '550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440021', 'SHIPPED', 39.99, 29.99, 10.00, 'USD',
   '{"name": "Jane Smith", "street": "321 Oak Ave", "city": "Los Angeles", "state": "CA", "zip": "90210"}',
   '{"name": "Jane Smith", "street": "321 Oak Ave", "city": "Los Angeles", "state": "CA", "zip": "90210"}');

-- Insert sample order items
INSERT INTO order_items (order_id, product_id, product_variant_id, quantity, unit_price, total_price, product_snapshot, status) VALUES
  ('550e8400-e29b-41d4-a716-446655440300', '550e8400-e29b-41d4-a716-446655440100', '550e8400-e29b-41d4-a716-446655440200', 1, 999.99, 999.99, 
   '{"name": "iPhone 15 Pro", "sku": "IPH15P-256-SB", "attributes": {"storage": "256GB", "color": "Space Black"}}', 'delivered'),
  ('550e8400-e29b-41d4-a716-446655440301', '550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440202', 1, 29.99, 29.99,
   '{"name": "Designer T-Shirt", "sku": "DTS-M-BLK", "attributes": {"size": "M", "color": "Black"}}', 'shipped');

-- Insert sample transactions
INSERT INTO transactions (id, order_id, sender_id, receiver_id, amount, currency, transaction_type, status, payment_method) VALUES
  ('550e8400-e29b-41d4-a716-446655440400', '550e8400-e29b-41d4-a716-446655440300', '550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440020', 1009.99, 'USD', 'order_payment', 'COMPLETED', 'credit_card'),
  ('550e8400-e29b-41d4-a716-446655440401', '550e8400-e29b-41d4-a716-446655440301', '550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440021', 39.99, 'USD', 'order_payment', 'COMPLETED', 'paymentGateway');

-- Insert sample shipments
INSERT INTO shipments (id, order_id, courier_id, tracking_number, carrier, status, pickup_address, delivery_address) VALUES
  ('550e8400-e29b-41d4-a716-446655440500', '550e8400-e29b-41d4-a716-446655440300', '550e8400-e29b-41d4-a716-446655440040', 'TRK123456789', 'FedEx', 'DELIVERED',
   '{"name": "Tech Store", "street": "123 Tech St", "city": "San Francisco", "state": "CA", "zip": "94105"}',
   '{"name": "John Doe", "street": "789 Main St", "city": "Chicago", "state": "IL", "zip": "60601"}'),
  ('550e8400-e29b-41d4-a716-446655440501', '550e8400-e29b-41d4-a716-446655440301', '550e8400-e29b-41d4-a716-446655440041', 'TRK987654321', 'UPS', 'IN_TRANSIT',
   '{"name": "Fashion Hub", "street": "456 Fashion Ave", "city": "New York", "state": "NY", "zip": "10001"}',
   '{"name": "Jane Smith", "street": "321 Oak Ave", "city": "Los Angeles", "state": "CA", "zip": "90210"}');

-- Insert sample reviews
INSERT INTO reviews (product_id, customer_id, order_id, rating, title, content, sentiment, status) VALUES
  ('550e8400-e29b-41d4-a716-446655440100', '550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440300', 5, 'Excellent phone!', 'Love the new features and camera quality. Highly recommended!', 'positive', 'published'),
  ('550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440301', 4, 'Good quality shirt', 'Nice material and fit. Good value for money.', 'positive', 'published');

-- Insert sample notifications
INSERT INTO notifications (recipient_id, recipient_type, type, title, message, channel, status) VALUES
  ('550e8400-e29b-41d4-a716-446655440030', 'customer', 'order_shipped', 'Order Shipped', 'Your order #ORD-2024-001 has been shipped', 'email', 'sent'),
  ('550e8400-e29b-41d4-a716-446655440020', 'seller', 'new_order', 'New Order Received', 'You have received a new order #ORD-2024-002', 'push', 'sent'),
  ('550e8400-e29b-41d4-a716-446655440040', 'courier', 'delivery_assigned', 'New Delivery Assignment', 'You have been assigned delivery #TRK123456789', 'push', 'sent');

-- Insert sample tasks (for enablers)
INSERT INTO tasks (enabler_id, seller_id, task_type, title, description, priority, status, territory) VALUES
  ('550e8400-e29b-41d4-a716-446655440060', '550e8400-e29b-41d4-a716-446655440020', 'seller_onboarding', 'Onboard Tech Store', 'Help new seller complete registration and first product listing', 'high', 'completed', 'North'),
  ('550e8400-e29b-41d4-a716-446655440061', '550e8400-e29b-41d4-a716-446655440021', 'training_delivery', 'Product Photography Training', 'Deliver training on product photography best practices', 'medium', 'in_progress', 'South');

-- Insert sample analytics data
INSERT INTO seller_analytics (seller_id, date, total_orders, total_revenue, total_customers, average_order_value, conversion_rate) VALUES
  ('550e8400-e29b-41d4-a716-446655440020', CURRENT_DATE - INTERVAL '1 day', 5, 2500.00, 4, 500.00, 0.08),
  ('550e8400-e29b-41d4-a716-446655440021', CURRENT_DATE - INTERVAL '1 day', 8, 800.00, 6, 100.00, 0.12),
  ('550e8400-e29b-41d4-a716-446655440020', CURRENT_DATE, 3, 1500.00, 3, 500.00, 0.06),
  ('550e8400-e29b-41d4-a716-446655440021', CURRENT_DATE, 5, 450.00, 4, 90.00, 0.10);

INSERT INTO courier_analytics (courier_id, date, deliveries_completed, total_earnings, average_delivery_time, customer_rating, distance_traveled) VALUES
  ('550e8400-e29b-41d4-a716-446655440040', CURRENT_DATE - INTERVAL '1 day', 12, 180.00, 25, 4.8, 85.5),
  ('550e8400-e29b-41d4-a716-446655440041', CURRENT_DATE - INTERVAL '1 day', 8, 120.00, 30, 4.6, 65.2),
  ('550e8400-e29b-41d4-a716-446655440040', CURRENT_DATE, 10, 150.00, 22, 4.9, 75.3),
  ('550e8400-e29b-41d4-a716-446655440041', CURRENT_DATE, 6, 90.00, 28, 4.7, 55.8);

INSERT INTO enabler_analytics (enabler_id, date, tasks_completed, sellers_onboarded, trainings_delivered, total_earnings, performance_score) VALUES
  ('550e8400-e29b-41d4-a716-446655440060', CURRENT_DATE - INTERVAL '1 day', 3, 2, 1, 125.00, 0.92),
  ('550e8400-e29b-41d4-a716-446655440061', CURRENT_DATE - INTERVAL '1 day', 2, 1, 2, 100.00, 0.88),
  ('550e8400-e29b-41d4-a716-446655440060', CURRENT_DATE, 2, 1, 1, 75.00, 0.95),
  ('550e8400-e29b-41d4-a716-446655440061', CURRENT_DATE, 3, 2, 1, 110.00, 0.90);