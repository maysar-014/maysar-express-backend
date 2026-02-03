import { SupabaseClientManager } from './infrastructure/database/supabase.client';

async function testSupabaseConnection() {
  console.log('🔗 TESTING SUPABASE CONNECTION');
  console.log('==============================\n');

  try {
    const supabaseManager = SupabaseClientManager.getInstance();
    
    console.log('🔄 Connecting to Supabase...');
    const client = await supabaseManager.connect();
    
    console.log('🔄 Running health check...');
    const healthCheck = await supabaseManager.healthCheck();
    
    console.log('\n📊 CONNECTION RESULTS:');
    console.log(`  Status: ${healthCheck.status}`);
    console.log(`  Latency: ${healthCheck.latency}ms`);
    console.log(`  Client: ${client ? 'Connected' : 'Failed'}`);
    
    if (healthCheck.status === 'healthy') {
      console.log('\n✅ SUPABASE CONNECTION: SUCCESS');
      console.log('🎯 Database is ready for logistics service');
    } else {
      console.log('\n❌ SUPABASE CONNECTION: FAILED');
      console.log('⚠️  Check database configuration');
    }
    
  } catch (error: any) {
    console.log('\n❌ CONNECTION ERROR:');
    console.log(`  Error: ${error.message}`);
    console.log('⚠️  Supabase connection failed');
  }
}

testSupabaseConnection();