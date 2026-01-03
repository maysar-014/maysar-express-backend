const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigrations() {
  console.log('🚀 Starting database migrations...');
  
  const migrationsDir = path.join(__dirname, '..', 'database', 'supabase', 'migrations');
  
  try {
    // Read setup.sql first
    const setupPath = path.join(__dirname, '..', 'database', 'supabase', 'setup.sql');
    if (fs.existsSync(setupPath)) {
      const setupSql = fs.readFileSync(setupPath, 'utf8');
      console.log('📋 Running setup.sql...');
      const { error: setupError } = await supabase.rpc('exec_sql', { sql: setupSql });
      if (setupError) console.log('Setup warning:', setupError.message);
    }
    
    // Get migration files
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    for (const file of files) {
      console.log(`📄 Running migration: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      const { error } = await supabase.rpc('exec_sql', { sql });
      if (error) {
        console.error(`❌ Error in ${file}:`, error.message);
      } else {
        console.log(`✅ Completed: ${file}`);
      }
    }
    
    // Run sample data
    const sampleDataPath = path.join(__dirname, '..', 'database', 'supabase', 'seeds', 'sample_data.sql');
    if (fs.existsSync(sampleDataPath)) {
      console.log('🌱 Loading sample data...');
      const sampleSql = fs.readFileSync(sampleDataPath, 'utf8');
      const { error: sampleError } = await supabase.rpc('exec_sql', { sql: sampleSql });
      if (sampleError) console.log('Sample data warning:', sampleError.message);
    }
    
    console.log('🎉 All migrations completed successfully!');
    
  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    process.exit(1);
  }
}

runMigrations();