#!/usr/bin/env node

/**
 * Database Connection Test Script
 * Tests both Prisma and Supabase connections for the Order Service
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');

async function testDatabaseConnections() {
  console.log('🧪 Testing Order Service Database Connections...\n');

  let prismaHealthy = false;
  let supabaseHealthy = false;

  // Test Prisma Connection
  console.log('📊 Testing Prisma Connection...');
  try {
    const prisma = new PrismaClient({
      datasourceUrl: process.env.DATABASE_URL,
      log: ['error', 'warn']
    });

    await prisma.$connect();
    console.log('✅ Prisma: Connection established');

    // Test basic query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Prisma: Query executed successfully');

    // Test order table
    const orderCount = await prisma.order.count();
    console.log(`✅ Prisma: Found ${orderCount} orders in database`);

    await prisma.$disconnect();
    console.log('✅ Prisma: Connection closed\n');
    prismaHealthy = true;

  } catch (error) {
    console.error('❌ Prisma Connection Failed:');
    console.error(`   Error: ${error.message}`);
    if (error.code) console.error(`   Code: ${error.code}`);
    console.log('');
  }

  // Test Supabase Connection
  console.log('🔄 Testing Supabase Connection...');
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    // Test basic connectivity
    const { data, error } = await supabase
      .from('orders')
      .select('count', { count: 'exact', head: true });

    if (error) throw error;

    console.log('✅ Supabase: Connection established');
    console.log(`✅ Supabase: Found ${data || 0} orders in database\n`);
    supabaseHealthy = true;

  } catch (error) {
    console.error('❌ Supabase Connection Failed:');
    console.error(`   Error: ${error.message}`);
    if (error.code) console.error(`   Code: ${error.code}`);
    console.log('');
  }

  // Summary
  console.log('📋 Connection Test Summary:');
  console.log(`   Prisma: ${prismaHealthy ? '✅ HEALTHY' : '❌ FAILED'}`);
  console.log(`   Supabase: ${supabaseHealthy ? '✅ HEALTHY' : '❌ FAILED'}`);

  if (prismaHealthy && supabaseHealthy) {
    console.log('\n🎉 All database connections are healthy!');
    console.log('🚀 Order Service is ready for production use.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some database connections failed.');
    console.log('📝 Please check your environment variables:');
    console.log('   - DATABASE_URL (for Prisma)');
    console.log('   - SUPABASE_URL (for Supabase)');
    console.log('   - SUPABASE_KEY (for Supabase)');
    process.exit(1);
  }
}

// Environment validation
function validateEnvironment() {
  const required = ['DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_KEY'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.log('\n📄 Please copy .env.example to .env and fill in the values.');
    process.exit(1);
  }
}

// Run the tests
if (require.main === module) {
  validateEnvironment();
  testDatabaseConnections().catch(error => {
    console.error('💥 Unexpected error during testing:', error);
    process.exit(1);
  });
}

module.exports = { testDatabaseConnections };
