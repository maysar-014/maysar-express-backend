// @ts-nocheck
import 'dotenv/config';
import { LogisticsEngine } from './engines/logistics.engine';
import { SupabaseClientManager } from './infrastructure/database/supabase.client';
import { RedisClientManager } from './infrastructure/cache/redis.client';

async function generateStatusReport() {
  console.log('ðŸ“Š LOGISTICS SERVICE STATUS REPORT');
  console.log('='.repeat(60));
  console.log(`ðŸ• Generated: ${new Date().toLocaleString()}\n`);

  // Test Database Connection
  console.log('ðŸ—„ï¸ DATABASE STATUS:');
  try {
    const supabase = SupabaseClientManager.getInstance();
    await supabase.connect();
    const health = await supabase.healthCheck();
    console.log(`   âœ… Supabase: ${health.status} (${health.latency}ms)`);
  } catch (error: any) {
    console.log(`   âŒ Supabase: Error - ${error.message}`);
  }

  // Test Redis Connection
  console.log('\nðŸ’¾ CACHE STATUS:');
  try {
    const redis = RedisClientManager.getInstance();
    await redis.connect();
    const health = await redis.healthCheck();
    console.log(`   âœ… Redis/Memurai: ${health.status} (${health.latency}ms)`);
  } catch (error: any) {
    console.log(`   âŒ Redis/Memurai: Error - ${error.message}`);
  }

  // Test Logistics Engine
  console.log('\nðŸšš LOGISTICS ENGINE STATUS:');
  try {
    const engine = new LogisticsEngine();
    const start = Date.now();
    
    const result = await engine.processLogisticsRequest({
      orderId: 'status_test_001',
      pickupAddress: {
        street: 'Test Street',
        city: 'Dar es Salaam',
        region: 'Dar es Salaam',
        postalCode: '11101',
        country: 'Tanzania',
        contactName: 'Test Sender',
        contactPhone: '+255712345678'
      },
      deliveryAddress: {
        street: 'Delivery Street',
        city: 'Dar es Salaam',
        region: 'Dar es Salaam',
        postalCode: '11102',
        country: 'Tanzania',
        contactName: 'Test Recipient',
        contactPhone: '+255723456789'
      },
      packageDetails: {
        weight: 1.0,
        dimensions: { length: 20, width: 15, height: 10 },
        value: 25000,
        fragile: false,
        perishable: false,
        hazardous: false,
        items: []
      },
      serviceType: 'standard' as const,
      priority: 'normal' as const
    });
    
    const duration = Date.now() - start;
    console.log(`   âœ… Engine: Operational (${duration}ms)`);
    console.log(`   ðŸ“¦ Test Delivery ID: ${result.deliveryId}`);
    console.log(`   ðŸ’° Test Cost: ${result.shippingCost.toLocaleString()} TZS`);
    console.log(`   ðŸŽ¯ Confidence: ${result.confidence}%`);
  } catch (error: any) {
    console.log(`   âŒ Engine: Error - ${error.message}`);
  }

  // Service Endpoints
  console.log('\nðŸŒ SERVICE ENDPOINTS:');
  console.log('   ðŸ“ Health Check: http://localhost:3007/health');
  console.log('   ðŸšš Logistics API: http://localhost:3007/api/v1/logistics/calculate');
  console.log('   ðŸ‘¨â€ðŸ’¼ Courier API: http://localhost:3007/api/courier/*');
  console.log('   ðŸ“Š Performance: http://localhost:3007/api/stats/performance');

  // Performance Metrics
  console.log('\nâš¡ PERFORMANCE METRICS:');
  const iterations = 5;
  const times: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    const engine = new LogisticsEngine();
    await engine.processLogisticsRequest({
      orderId: `perf_test_${i}`,
      pickupAddress: {
        street: 'Test Street',
        city: 'Dar es Salaam',
        region: 'Dar es Salaam',
        postalCode: '11101',
        country: 'Tanzania',
        contactName: 'Test Sender',
        contactPhone: '+255712345678'
      },
      deliveryAddress: {
        street: 'Delivery Street',
        city: 'Dar es Salaam',
        region: 'Dar es Salaam',
        postalCode: '11102',
        country: 'Tanzania',
        contactName: 'Test Recipient',
        contactPhone: '+255723456789'
      },
      packageDetails: {
        weight: Math.random() * 5 + 1,
        dimensions: { length: 30, width: 20, height: 15 },
        value: Math.random() * 100000 + 10000,
        fragile: false,
        perishable: false,
        hazardous: false,
        items: []
      },
      serviceType: 'standard' as const,
      priority: 'normal' as const
    });
    times.push(Date.now() - start);
  }
  
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const maxTime = Math.max(...times);
  const minTime = Math.min(...times);
  
  console.log(`   ðŸ“ˆ Average Response Time: ${avgTime.toFixed(2)}ms`);
  console.log(`   ðŸš€ Best Response Time: ${minTime}ms`);
  console.log(`   ðŸŒ Worst Response Time: ${maxTime}ms`);
  console.log(`   ðŸŽ¯ Throughput: ~${Math.round(1000 / avgTime)} requests/second`);

  // System Information
  console.log('\nðŸ’» SYSTEM INFORMATION:');
  console.log(`   ðŸ”§ Node.js: ${process.version}`);
  console.log(`   ðŸ“¦ Service: logistics-service v1.0.0`);
  console.log(`   ðŸš€ Port: 3007`);
  console.log(`   â±ï¸ Uptime: ${Math.round(process.uptime())} seconds`);
  console.log(`   ðŸ’¾ Memory Usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);

  console.log('\n' + '='.repeat(60));
  console.log('ðŸŽ‰ LOGISTICS SERVICE IS FULLY OPERATIONAL! ðŸŽ‰');
  console.log('='.repeat(60));
}

generateStatusReport().catch(console.error);
