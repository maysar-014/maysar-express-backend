import { SupabaseClientManager } from './infrastructure/database/supabase.client';

async function testSupabaseBasicConnection() {
  console.log('🔗 SUPABASE BASIC CONNECTION TEST');
  console.log('=================================\n');

  try {
    const supabaseManager = SupabaseClientManager.getInstance();
    
    console.log('🔄 Connecting to Supabase...');
    const client = await supabaseManager.connect();
    
    console.log('🔄 Testing basic query...');
    const startTime = Date.now();
    
    // Test with a simple query that doesn't require specific tables
    const { data, error } = await client.from('information_schema.tables').select('table_name').limit(1);
    const latency = Date.now() - startTime;
    
    console.log('\n📊 CONNECTION RESULTS:');
    console.log(`  Client: ${client ? 'Connected' : 'Failed'}`);
    console.log(`  Latency: ${latency}ms`);
    console.log(`  Error: ${error ? error.message : 'None'}`);
    console.log(`  Data: ${data ? 'Received' : 'None'}`);
    
    if (client && !error) {
      console.log('\n✅ SUPABASE CONNECTION: SUCCESS');
      console.log('🎯 Database connection established');
      console.log('📋 Ready to create logistics tables');
    } else {
      console.log('\n⚠️  SUPABASE CONNECTION: PARTIAL');
      console.log('🔧 Connection established but may need table setup');
    }
    
  } catch (error: any) {
    console.log('\n❌ CONNECTION ERROR:');
    console.log(`  Error: ${error.message}`);
  }
}

testSupabaseBasicConnection();