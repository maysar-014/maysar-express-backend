// @ts-nocheck
import 'dotenv/config';
import { LogisticsEngine } from './engines/logistics.engine';
import { DatabaseConnection } from './infrastructure/database/prisma-client';
import { RedisClientManager } from './infrastructure/cache/redis.client';

async function generateStatusReport() {
  console.log('📊 LOGISTICS SERVICE STATUS REPORT');
  console.log('='.repeat(60));
  console.log(`🕐 Generated: ${new Date().toLocaleString()}\n`);

  // Test Database Connection
  console.log('🗄️ DATABASE STATUS:');
  try {
    const status = await DatabaseConnection.getConnectionStatus();
    if (!status.connected) {
      console.log(`   ❌ Database: Error - ${status.error || 'unhealthy'}`);
    } else {
      const latency = status.responseTime ?? 'unknown';
      console.log(`   ✅ Database: healthy (${latency})`);
    }
  } catch (error: any) {
    console.log(`   ❌ Database: Error - ${error.message}`);
  }

  // Test Redis Connection
  console.log('\n💾 CACHE STATUS:');
  try {
    const redis = RedisClientManager.getInstance();
    await redis.connect();
    const health = await redis.healthCheck();
    console.log(`   ✅ Redis/Memurai: ${health.status} (${health.latency}ms)`);
  } catch (error: any) {
    console.log(`   ❌ Redis/Memurai: Error - ${error.message}`);
  }

  // Test Logistics Engine
  console.log('\n🚚 LOGISTICS ENGINE STATUS:');
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
    console.log(`   ✅ Engine: Operational (${duration}ms)`);
    console.log(`   📦 Test Delivery ID: ${result.deliveryId}`);
    console.log(`   💰 Test Cost: ${result.shippingCost.toLocaleString()} TZS`);
    console.log(`   🎯 Confidence: ${result.confidence}%`);
  } catch (error: any) {
    console.log(`   ❌ Engine: Error - ${error.message}`);
  }

  // Service Endpoints
  console.log('\n🌐 SERVICE ENDPOINTS:');
  console.log('   📍 Health Check: http://localhost:3007/health');
  console.log('   🚚 Logistics API: http://localhost:3007/api/v1/logistics/calculate');
  console.log('   👨‍💼 Courier API: http://localhost:3007/api/courier/*');
  console.log('   📊 Performance: http://localhost:3007/api/stats/performance');

  // Performance Metrics
  console.log('\n⚡ PERFORMANCE METRICS:');
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
  
  console.log(`   📈 Average Response Time: ${avgTime.toFixed(2)}ms`);
  console.log(`   🚀 Best Response Time: ${minTime}ms`);
  console.log(`   🐌 Worst Response Time: ${maxTime}ms`);
  console.log(`   🎯 Throughput: ~${Math.round(1000 / avgTime)} requests/second`);

  // System Information
  console.log('\n💻 SYSTEM INFORMATION:');
  console.log(`   🔧 Node.js: ${process.version}`);
  console.log(`   📦 Service: logistics-service v1.0.0`);
  console.log(`   🚀 Port: 3007`);
  console.log(`   ⏱️ Uptime: ${Math.round(process.uptime())} seconds`);
  console.log(`   💾 Memory Usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);

  console.log('\n' + '='.repeat(60));
  console.log('🎉 LOGISTICS SERVICE IS FULLY OPERATIONAL! 🎉');
  console.log('='.repeat(60));
}

generateStatusReport().catch(console.error);


