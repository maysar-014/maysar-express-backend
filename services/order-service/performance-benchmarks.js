#!/usr/bin/env node

/**
 * Performance Benchmarking Script
 * Measures API performance and generates benchmark reports
 */

const http = require('http');
const https = require('https');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3002';
const CONCURRENT_REQUESTS = parseInt(process.env.BENCHMARK_CONCURRENCY || '10');
const TOTAL_REQUESTS = parseInt(process.env.BENCHMARK_REQUESTS || '100');
const WARMUP_REQUESTS = parseInt(process.env.BENCHMARK_WARMUP || '10');

// Parse API URL
const url = new URL(API_BASE_URL);
const isHttps = url.protocol === 'https:';
const httpClient = isHttps ? https : http;

/**
 * HTTP Request wrapper
 */
function makeRequest(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: endpoint,
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'OrderService-Benchmark/1.0'
      }
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body));
    }

    const req = httpClient.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          duration: Date.now() - req.startTime
        });
      });
    });

    req.startTime = Date.now();

    req.on('error', (error) => {
      reject({
        error: error.message,
        duration: Date.now() - req.startTime
      });
    });

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

/**
 * Generate sample order data for benchmarking
 */
function generateSampleOrder(orderId = null) {
  return {
    buyerId: `bench_buyer_${orderId || Math.random().toString(36).substr(2, 9)}`,
    sellerId: `bench_seller_${orderId || Math.random().toString(36).substr(2, 9)}`,
    items: [{
      productId: `prod_${Math.random().toString(36).substr(2, 9)}`,
      quantity: Math.floor(Math.random() * 5) + 1,
      price: {
        amount: Math.floor(Math.random() * 100000) + 10000, // 10k - 110k TZS
        currency: 'TZS'
      },
      weight: Math.random() * 5 + 0.5 // 0.5 - 5.5 kg
    }],
    currency: 'TZS',
    deliveryAddress: {
      street: `${Math.floor(Math.random() * 1000)} Benchmark St`,
      city: 'Dar es Salaam',
      postalCode: `${Math.floor(Math.random() * 90000) + 10000}`,
      country: 'TZ'
    },
    paymentMethod: ['COD', 'CARD', 'MOBILE'][Math.floor(Math.random() * 3)]
  };
}

/**
 * Run benchmark for specific endpoint
 */
async function benchmarkEndpoint(name, endpoint, method = 'GET', bodyGenerator = null) {
  console.log(`\n🏃 Running benchmark: ${name}`);
  console.log(`Endpoint: ${method} ${endpoint}`);
  console.log(`Concurrency: ${CONCURRENT_REQUESTS}, Total Requests: ${TOTAL_REQUESTS}`);

  const results = [];
  let completedRequests = 0;
  let failedRequests = 0;

  // Warmup phase
  console.log(`🔥 Warming up with ${WARMUP_REQUESTS} requests...`);
  for (let i = 0; i < WARMUP_REQUESTS; i++) {
    try {
      const body = bodyGenerator ? bodyGenerator(i) : null;
      await makeRequest(endpoint, method, body);
    } catch (error) {
      // Ignore warmup errors
    }
  }

  console.log('⚡ Starting benchmark...');

  // Benchmark phase
  const startTime = Date.now();

  // Run requests with controlled concurrency
  for (let batch = 0; batch < Math.ceil(TOTAL_REQUESTS / CONCURRENT_REQUESTS); batch++) {
    const batchPromises = [];

    for (let i = 0; i < CONCURRENT_REQUESTS && completedRequests < TOTAL_REQUESTS; i++) {
      const requestPromise = (async () => {
        try {
          const body = bodyGenerator ? bodyGenerator(completedRequests) : null;
          const result = await makeRequest(endpoint, method, body);

          results.push({
            statusCode: result.statusCode,
            duration: result.duration,
            success: result.statusCode >= 200 && result.statusCode < 300
          });

          if (!result.success) {
            failedRequests++;
          }
        } catch (error) {
          results.push({
            error: error.error || error.message,
            duration: error.duration || 0,
            success: false
          });
          failedRequests++;
        }

        completedRequests++;
      })();

      batchPromises.push(requestPromise);
    }

    await Promise.all(batchPromises);

    // Progress indicator
    const progress = Math.min(100, Math.round((completedRequests / TOTAL_REQUESTS) * 100));
    process.stdout.write(`\r📊 Progress: ${completedRequests}/${TOTAL_REQUESTS} (${progress}%)`);
  }

  const totalDuration = Date.now() - startTime;
  console.log('\n✅ Benchmark completed!');

  return analyzeResults(name, results, totalDuration);
}

/**
 * Analyze benchmark results
 */
function analyzeResults(name, results, totalDuration) {
  const successfulResults = results.filter(r => r.success);
  const failedResults = results.filter(r => !r.success);

  const durations = successfulResults.map(r => r.duration);
  const sortedDurations = [...durations].sort((a, b) => a - b);

  const analysis = {
    name,
    totalRequests: results.length,
    successfulRequests: successfulResults.length,
    failedRequests: failedResults.length,
    successRate: ((successfulResults.length / results.length) * 100).toFixed(2),
    totalDuration,
    requestsPerSecond: (results.length / (totalDuration / 1000)).toFixed(2),
    averageResponseTime: durations.length > 0 ?
      (durations.reduce((sum, d) => sum + d, 0) / durations.length).toFixed(2) : 'N/A',
    minResponseTime: sortedDurations.length > 0 ? sortedDurations[0] : 'N/A',
    maxResponseTime: sortedDurations.length > 0 ? sortedDurations[sortedDurations.length - 1] : 'N/A',
    medianResponseTime: sortedDurations.length > 0 ?
      sortedDurations[Math.floor(sortedDurations.length / 2)] : 'N/A',
    p95ResponseTime: sortedDurations.length > 0 ?
      sortedDurations[Math.floor(sortedDurations.length * 0.95)] : 'N/A',
    p99ResponseTime: sortedDurations.length > 0 ?
      sortedDurations[Math.floor(sortedDurations.length * 0.99)] : 'N/A'
  };

  return analysis;
}

/**
 * Generate performance report
 */
function generatePerformanceReport(results) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 PERFORMANCE BENCHMARK REPORT');
  console.log('='.repeat(80));
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Configuration: ${CONCURRENT_REQUESTS} concurrent, ${TOTAL_REQUESTS} total requests`);
  console.log('');

  results.forEach(result => {
    console.log(`🏷️  ${result.name}`);
    console.log(`   Requests: ${result.totalRequests} (${result.successRate}% success rate)`);
    console.log(`   Throughput: ${result.requestsPerSecond} req/sec`);
    console.log(`   Response Time (ms):`);
    console.log(`     • Average: ${result.averageResponseTime}`);
    console.log(`     • Min: ${result.minResponseTime}`);
    console.log(`     • Max: ${result.maxResponseTime}`);
    console.log(`     • Median: ${result.medianResponseTime}`);
    console.log(`     • P95: ${result.p95ResponseTime}`);
    console.log(`     • P99: ${result.p99ResponseTime}`);
    console.log('');
  });

  // Performance assessment
  const healthCheckResult = results.find(r => r.name === 'Health Check');
  const orderCreationResult = results.find(r => r.name === 'Order Creation');

  console.log('🏥 HEALTH ASSESSMENT');
  if (healthCheckResult) {
    const healthReqPerSec = parseFloat(healthCheckResult.requestsPerSecond);
    const healthAvgResponse = parseFloat(healthCheckResult.averageResponseTime);

    if (healthReqPerSec > 100 && healthAvgResponse < 50) {
      console.log('✅ Health check performance: EXCELLENT');
    } else if (healthReqPerSec > 50 && healthAvgResponse < 100) {
      console.log('✅ Health check performance: GOOD');
    } else if (healthReqPerSec > 20 && healthAvgResponse < 200) {
      console.log('⚠️  Health check performance: ACCEPTABLE');
    } else {
      console.log('❌ Health check performance: POOR');
    }
  }

  if (orderCreationResult) {
    const orderReqPerSec = parseFloat(orderCreationResult.requestsPerSecond);
    const orderAvgResponse = parseFloat(orderCreationResult.averageResponseTime);

    console.log('');
    console.log('📦 ORDER CREATION ASSESSMENT');
    if (orderReqPerSec > 50 && orderAvgResponse < 200) {
      console.log('✅ Order creation performance: EXCELLENT');
    } else if (orderReqPerSec > 20 && orderAvgResponse < 500) {
      console.log('✅ Order creation performance: GOOD');
    } else if (orderReqPerSec > 10 && orderAvgResponse < 1000) {
      console.log('⚠️  Order creation performance: ACCEPTABLE');
    } else {
      console.log('❌ Order creation performance: POOR');
    }
  }

  console.log('='.repeat(80));

  return results;
}

/**
 * Save results to file
 */
function saveResults(results) {
  const fs = require('fs');
  const path = require('path');

  const report = {
    timestamp: new Date().toISOString(),
    configuration: {
      apiBaseUrl: API_BASE_URL,
      concurrentRequests: CONCURRENT_REQUESTS,
      totalRequests: TOTAL_REQUESTS,
      warmupRequests: WARMUP_REQUESTS
    },
    results
  };

  const reportsDir = path.join(__dirname, 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const filename = `performance-benchmark-${Date.now()}.json`;
  const filepath = path.join(reportsDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
  console.log(`📄 Detailed results saved to: ${filepath}`);
}

/**
 * Main benchmark execution
 */
async function runBenchmarks() {
  console.log('🚀 Starting Performance Benchmarks\n');

  try {
    const results = [];

    // Benchmark health check endpoint
    const healthResult = await benchmarkEndpoint(
      'Health Check',
      '/api/health',
      'GET'
    );
    results.push(healthResult);

    // Benchmark order creation
    const orderCreationResult = await benchmarkEndpoint(
      'Order Creation',
      '/api/orders',
      'POST',
      (index) => generateSampleOrder(`bench_${index}`)
    );
    results.push(orderCreationResult);

    // Benchmark order retrieval (using a fixed order ID)
    const orderRetrievalResult = await benchmarkEndpoint(
      'Order Retrieval',
      '/api/orders/order_123',
      'GET'
    );
    results.push(orderRetrievalResult);

    // Generate and save report
    const finalResults = generatePerformanceReport(results);
    saveResults(finalResults);

    console.log('\n🎉 Performance benchmarking completed successfully!');

  } catch (error) {
    console.error('❌ Benchmark failed:', error.message);
    process.exit(1);
  }
}

/**
 * Show usage information
 */
function showUsage() {
  console.log(`
Performance Benchmarking Script

Usage:
  node performance-benchmarks.js

Environment Variables:
  API_BASE_URL         - Base URL of the API to test (default: http://localhost:3002)
  BENCHMARK_CONCURRENCY - Number of concurrent requests (default: 10)
  BENCHMARK_REQUESTS   - Total number of requests per endpoint (default: 100)
  BENCHMARK_WARMUP     - Number of warmup requests (default: 10)

Examples:
  API_BASE_URL=https://api.example.com BENCHMARK_CONCURRENCY=20 node performance-benchmarks.js
  BENCHMARK_REQUESTS=500 node performance-benchmarks.js
  `);
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    showUsage();
  } else {
    runBenchmarks();
  }
}

module.exports = {
  benchmarkEndpoint,
  analyzeResults,
  generatePerformanceReport,
  runBenchmarks
};
