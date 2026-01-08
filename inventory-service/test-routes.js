#!/usr/bin/env node

/**
 * Route Testing Script for Inventory Service
 * Tests that the API routes are properly registered and functional
 */

const http = require('http');

const BASE_URL = 'http://localhost:3005';
const API_BASE = `${BASE_URL}/api/v1`;

console.log('🧪 Testing Inventory Service API Routes...\n');

// Test endpoints
const testEndpoints = [
  {
    name: 'Health Check',
    method: 'GET',
    url: `${BASE_URL}/health`,
    expectStatus: 200
  },
  {
    name: 'Stock Level (GET /stock/:variantId)',
    method: 'GET',
    url: `${API_BASE}/stock/test-variant-123`,
    expectStatus: 404, // Expected to fail since variant doesn't exist, but route should be found
    expectRouteMatch: true
  },
  {
    name: 'Stock Adjustment (PUT /stock/:variantId/:warehouseId)',
    method: 'PUT',
    url: `${API_BASE}/stock/test-variant-123/warehouse-456`,
    expectStatus: 404, // Expected to fail since variant doesn't exist, but route should be found
    expectRouteMatch: true
  },
  {
    name: 'Create Reservation (POST /reservations)',
    method: 'POST',
    url: `${API_BASE}/reservations`,
    expectStatus: 400, // Should reach handler (route found)
    expectRouteMatch: true
  },
  {
    name: 'Get Warehouses (GET /warehouses)',
    method: 'GET',
    url: `${API_BASE}/warehouses`,
    expectStatus: 200, // Should return empty array or warehouses
    expectRouteMatch: true
  }
];

async function testEndpoint(testCase) {
  return new Promise((resolve) => {
    const url = new URL(testCase.url);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: testCase.method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (testCase.method === 'POST') {
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify({}));
    }

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const result = {
          name: testCase.name,
          statusCode: res.statusCode,
          expectedStatus: testCase.expectStatus,
          routeMatched: res.statusCode !== 404, // 404 means route not found
          success: testCase.expectRouteMatch ?
            (res.statusCode !== 404) : // Route should be found
            (res.statusCode === testCase.expectStatus) // Exact status match
        };
        resolve(result);
      });
    });

    req.on('error', (err) => {
      resolve({
        name: testCase.name,
        error: err.message,
        success: false
      });
    });

    if (testCase.method === 'POST') {
      req.write(JSON.stringify({}));
    }

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        name: testCase.name,
        error: 'Request timeout',
        success: false
      });
    });

    req.end();
  });
}

async function runTests() {
  console.log('🔗 Testing API Route Registration...\n');

  const results = [];

  for (const testCase of testEndpoints) {
    console.log(`Testing: ${testCase.name}`);
    const result = await testEndpoint(testCase);
    results.push(result);

    if (result.success) {
      console.log(`✅ PASS - ${result.statusCode} ${result.routeMatched ? '(Route Found)' : ''}\n`);
    } else if (result.error) {
      console.log(`❌ FAIL - Error: ${result.error}\n`);
    } else {
      console.log(`❌ FAIL - Expected: ${result.expectedStatus}, Got: ${result.statusCode}\n`);
    }
  }

  // Summary
  const passed = results.filter(r => r.success).length;
  const total = results.length;

  console.log('📊 Test Summary:');
  console.log(`   Passed: ${passed}/${total}`);
  console.log(`   Failed: ${total - passed}/${total}`);

  if (passed === total) {
    console.log('\n🎉 All route tests passed! API routes are properly registered.');
    console.log('   Note: 404 responses are expected for non-existent resources.');
    console.log('   The important thing is that routes are being matched (not 404 for route not found).');
  } else {
    console.log('\n⚠️  Some tests failed. Check the route definitions.');
  }

  console.log('\n🔍 Next Steps:');
  console.log('   1. Start the inventory service: npm run dev');
  console.log('   2. Run this test: node services/inventory-service/test-routes.js');
  console.log('   3. Verify all routes return expected status codes');

  process.exit(passed === total ? 0 : 1);
}

// Check if service is running
function checkServiceHealth() {
  return new Promise((resolve) => {
    const req = http.get(`${BASE_URL}/health`, (res) => {
      resolve(res.statusCode === 200);
    });

    req.on('error', () => resolve(false));
    req.setTimeout(3000, () => resolve(false));
  });
}

async function main() {
  console.log('🏥 Checking if Inventory Service is running...\n');

  const isHealthy = await checkServiceHealth();

  if (!isHealthy) {
    console.log('❌ Inventory Service is not running!');
    console.log('   Please start the service first:');
    console.log('   cd services/inventory-service && npm run dev\n');
    process.exit(1);
  }

  console.log('✅ Inventory Service is running\n');

  await runTests();
}

main().catch(console.error);
