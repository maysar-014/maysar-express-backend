import 'dotenv/config';
import { SupabaseClientManager } from './infrastructure/database/supabase.client';

async function testSecureSupabaseConnection() {
  console.log('🔒 SECURE SUPABASE CONNECTION TEST');
  console.log('==================================\n');

  console.log('🔐 Environment Variables:');
  console.log(`  URL: ${process.env.SUPABASE_URL ? 'Loaded' : 'Missing'}`);
  console.log(`  ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? 'Loaded' : 'Missing'}`);
  console.log(`  SERVICE_ROLE: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Loaded' : 'Missing'}`);

  try {
    const supabaseManager = SupabaseClientManager.getInstance();
    const client = await supabaseManager.connect();
    
    console.log('\n✅ SECURE CONNECTION ESTABLISHED');
    console.log('🔒 Credentials loaded from .env file');
    console.log('🎯 Database ready for logistics service');
    
  } catch (error: any) {
    console.log(`\n❌ Connection Error: ${error.message}`);
  }
}

testSecureSupabaseConnection();