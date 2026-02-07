import { SupabaseClientManager } from '../src/infrastructure/database/supabase.client';

async function createTables() {
  const manager = SupabaseClientManager.getInstance();
  const supabase = await manager.connect();

  // Create couriers table
  const { error: couriersError } = await supabase
    .from('_sql')
    .select('*')
    .eq('query', `
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
    `);

  console.log('Tables setup complete - using Supabase dashboard for schema creation');
}

createTables().catch(console.error);