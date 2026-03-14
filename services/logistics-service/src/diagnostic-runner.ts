// @ts-nocheck
import 'dotenv/config';
import { Logger } from './utils/logger';
import { AppConfiguration } from './config/app.config';
import { PrismaClientManager } from './infrastructure/database/prisma.client';
import { RedisClientManager } from './infrastructure/cache/redis.client';
import { LogisticsEngine } from './engines/logistics.engine';

interface DiagnosticResult {
  component: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
  details?: any;
  duration?: number;
}

class LogisticsDiagnosticRunner {
  private logger: Logger;
  private results: DiagnosticResult[] = [];

  constructor() {
    this.logger = Logger.getInstance();
  }

  async runFullDiagnostics(): Promise<void> {
    console.log('🔍 Starting Logistics Service Diagnostics...\n');
    
    await this.checkConfiguration();
    await this.checkDatabaseConnection();
    await this.checkRedisConnection();
    await this.checkLogisticsEngine();
    await this.runPerformanceTests();
    
    this.displayResults();
  }

  private async checkConfiguration(): Promise<void> {
    const start = Date.now();
    try {
      const config = AppConfiguration.getInstance();
      const serviceInfo = config.getServiceInfo();
      const appConfig = config.getConfig();
      
      this.results.push({
        component: 'Configuration',
        status: 'healthy',
        message: `Service: ${serviceInfo.name} v${serviceInfo.version}`,
        details: {
          port: appConfig.port,
          environment: appConfig.environment,
          cors: appConfig.cors
        },
        duration: Date.now() - start
      });
    } catch (error: any) {
      this.results.push({
        component: 'Configuration',
        status: 'error',
        message: error.message,
        duration: Date.now() - start
      });
    }
  }

  private async checkDatabaseConnection(): Promise<void> {
    const start = Date.now();
    try {
      const prisma = PrismaClientManager.getInstance();
      await prisma.connect();
      
      const health = await prisma.healthCheck();
      
      this.results.push({
        component: 'Database',
        status: health.status === 'healthy' ? 'healthy' : 'error',
        message: health.status === 'healthy' ? 'Database connection successful' : 'Database connection failed',
        details: { latency: health.latency },
        duration: Date.now() - start
      });
    } catch (error: any) {
      this.results.push({
        component: 'Database',
        status: 'error',
        message: error.message,
        duration: Date.now() - start
      });
    }
  }

  private async checkRedisConnection(): Promise<void> {
    const start = Date.now();
    try {
      const redis = RedisClientManager.getInstance();
      await redis.connect();
      
      const health = await redis.healthCheck();
      
      this.results.push({
        component: 'Redis Cache',
        status: health.status === 'healthy' ? 'healthy' : 'error',
        message: health.status === 'healthy' ? 'Redis connection successful' : 'Redis connection failed',
        details: { latency: health.latency },
        duration: Date.now() - start
      });
    } catch (error: any) {
      this.results.push({
        component: 'Redis Cache',
        status: 'error',
        message: error.message,
        duration: Date.now() - start
      });
    }
  }

  private async checkLogisticsEngine(): Promise<void> {
    const start = Date.now();
    try {
      const engine = new LogisticsEngine();
      
      // Test logistics calculation
      const testInput = {
        orderId: 'test_order_001',
        pickupAddress: {
          street: 'Uhuru Street',
          city: 'Dar es Salaam',
          region: 'Dar es Salaam',
          postalCode: '11101',
          country: 'Tanzania',
          contactName: 'Test Sender',
          contactPhone: '+255712345678'
        },
        deliveryAddress: {
          street: 'Samora Avenue',
          city: 'Dar es Salaam',
          region: 'Dar es Salaam',
          postalCode: '11102',
          country: 'Tanzania',
          contactName: 'Test Recipient',
          contactPhone: '+255723456789'
        },
        packageDetails: {
          weight: 2.5,
          dimensions: { length: 30, width: 20, height: 15 },
          value: 50000,
          fragile: false,
          perishable: false,
          hazardous: false,
          items: []
        },
        serviceType: 'standard' as const,
        priority: 'normal' as const
      };

      const result = await engine.processLogisticsRequest(testInput);
      
      this.results.push({
        component: 'Logistics Engine',
        status: result.success ? 'healthy' : 'error',
        message: result.success ? 'Engine calculation successful' : 'Engine calculation failed',
        details: {
          deliveryId: result.deliveryId,
          shippingCost: result.shippingCost,
          confidence: result.confidence,
          processingTime: result.processingTime,
          warnings: result.warnings,
          recommendations: result.recommendations
        },
        duration: Date.now() - start
      });
    } catch (error: any) {
      this.results.push({
        component: 'Logistics Engine',
        status: 'error',
        message: error.message,
        duration: Date.now() - start
      });
    }
  }

  private async runPerformanceTests(): Promise<void> {
    const start = Date.now();
    try {
      const engine = new LogisticsEngine();
      const iterations = 10;
      const times: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const testStart = Date.now();
        
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
            weight: Math.random() * 10 + 1,
            dimensions: { length: 30, width: 20, height: 15 },
            value: Math.random() * 100000 + 10000,
            fragile: Math.random() > 0.5,
            perishable: false,
            hazardous: false,
            items: []
          },
          serviceType: 'standard' as const,
          priority: 'normal' as const
        });
        
        times.push(Date.now() - testStart);
      }
      
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      
      const status = avgTime < 200 ? 'healthy' : avgTime < 500 ? 'warning' : 'error';
      
      this.results.push({
        component: 'Performance Test',
        status,
        message: `Average response time: ${avgTime.toFixed(2)}ms`,
        details: {
          iterations,
          averageTime: avgTime,
          maxTime,
          minTime,
          times
        },
        duration: Date.now() - start
      });
    } catch (error: any) {
      this.results.push({
        component: 'Performance Test',
        status: 'error',
        message: error.message,
        duration: Date.now() - start
      });
    }
  }

  private displayResults(): void {
    console.log('\n📊 Diagnostic Results:');
    console.log('='.repeat(80));
    
    let healthyCount = 0;
    let warningCount = 0;
    let errorCount = 0;
    
    this.results.forEach((result, index) => {
      const statusIcon = {
        healthy: '✅',
        warning: '⚠️',
        error: '❌'
      }[result.status];
      
      console.log(`\n${index + 1}. ${statusIcon} ${result.component}`);
      console.log(`   Status: ${result.status.toUpperCase()}`);
      console.log(`   Message: ${result.message}`);
      if (result.duration) {
        console.log(`   Duration: ${result.duration}ms`);
      }
      
      if (result.details) {
        console.log('   Details:');
        Object.entries(result.details).forEach(([key, value]) => {
          if (typeof value === 'object') {
            console.log(`     ${key}: ${JSON.stringify(value, null, 2).replace(/\n/g, '\n       ')}`);
          } else {
            console.log(`     ${key}: ${value}`);
          }
        });
      }
      
      switch (result.status) {
        case 'healthy': healthyCount++; break;
        case 'warning': warningCount++; break;
        case 'error': errorCount++; break;
      }
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('📈 Summary:');
    console.log(`   ✅ Healthy: ${healthyCount}`);
    console.log(`   ⚠️  Warnings: ${warningCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📊 Total Components: ${this.results.length}`);
    
    const overallStatus = errorCount > 0 ? 'CRITICAL' : warningCount > 0 ? 'WARNING' : 'HEALTHY';
    console.log(`\n🎯 Overall Status: ${overallStatus}`);
    
    if (overallStatus === 'HEALTHY') {
      console.log('\n🚀 Logistics Service is ready for operation!');
    } else if (overallStatus === 'WARNING') {
      console.log('\n⚠️  Logistics Service has warnings but can operate');
    } else {
      console.log('\n❌ Logistics Service has critical issues that need attention');
    }
  }
}

// Run diagnostics
const runner = new LogisticsDiagnosticRunner();
runner.runFullDiagnostics().catch(console.error);

