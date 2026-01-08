const BASE_URL = 'http://localhost:3015/api/courier';

const tests = [
  // Delivery Management
  { method: 'GET', endpoint: '/deliveries/available', name: 'Get Available Deliveries' },
  { method: 'GET', endpoint: '/deliveries/active', name: 'Get Active Deliveries' },
  { method: 'POST', endpoint: '/deliveries/DEL-001/accept', name: 'Accept Delivery' },
  { method: 'PUT', endpoint: '/deliveries/DEL-001/status', name: 'Update Delivery Status', body: { status: 'in_progress' } },
  
  // Route & Navigation
  { method: 'GET', endpoint: '/routes/current', name: 'Get Current Route' },
  { method: 'POST', endpoint: '/routes/optimize', name: 'Optimize Route', body: { deliveries: ['DEL-001'] } },
  
  // Real-time Tracking
  { method: 'PUT', endpoint: '/location', name: 'Update Location', body: { lat: -6.7924, lng: 39.2083 } },
  { method: 'GET', endpoint: '/gps/status', name: 'Get GPS Status' },
  
  // Performance Monitoring
  { method: 'GET', endpoint: '/performance/overview', name: 'Get Performance Overview' },
  { method: 'GET', endpoint: '/performance/kpis', name: 'Get Performance KPIs' },
  
  // Earnings Management
  { method: 'GET', endpoint: '/earnings/today', name: 'Get Today\'s Earnings' },
  { method: 'GET', endpoint: '/earnings/detailed', name: 'Get Detailed Earnings' },
  
  // Vehicle Management
  { method: 'GET', endpoint: '/vehicle/overview', name: 'Get Vehicle Overview' }
];

async function runTests() {
  console.log('🧪 Testing Courier Console API Contract\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const options = {
        method: test.method,
        headers: { 'Content-Type': 'application/json' }
      };
      
      if (test.body) {
        options.body = JSON.stringify(test.body);
      }
      
      const response = await fetch(`${BASE_URL}${test.endpoint}`, options);
      const data = await response.json();
      
      if (response.ok && data.success) {
        console.log(`✅ ${test.name}`);
        passed++;
      } else {
        console.log(`❌ ${test.name} - Status: ${response.status}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name} - Error: ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n📊 Test Results:`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
}

// Health check first
fetch('http://localhost:3015/health')
  .then(res => res.json())
  .then(data => {
    console.log('🏥 Health Check:', data.status);
    return runTests();
  })
  .catch(err => {
    console.log('❌ Service not running. Start with: npm run simple');
  });