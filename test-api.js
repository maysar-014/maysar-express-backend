const axios = require('axios');

async function testAPI() {
  const baseURL = 'http://localhost:3001';
  
  console.log('Testing Admin API endpoints...\n');
  
  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const health = await axios.get(`${baseURL}/health`);
    console.log('✅ Health:', health.data);
    
    // Test dashboard endpoint
    console.log('\n2. Testing dashboard endpoint...');
    const dashboard = await axios.get(`${baseURL}/api/admin/dashboard`);
    console.log('✅ Dashboard:', dashboard.data.success ? 'Success' : 'Failed');
    console.log('   Data structure:', JSON.stringify(dashboard.data.data, null, 2));
    
    // Test finance endpoint
    console.log('\n3. Testing finance endpoint...');
    const finance = await axios.get(`${baseURL}/api/admin/finance`);
    console.log('✅ Finance:', finance.data.success ? 'Success' : 'Failed');
    console.log('   Revenue Trend Length:', finance.data.data.revenueTrend.length);
    
    // Test sellers endpoint
    console.log('\n4. Testing sellers endpoint...');
    const sellers = await axios.get(`${baseURL}/api/admin/sellers`);
    console.log('✅ Sellers:', sellers.data.success ? 'Success' : 'Failed');
    console.log('   Sellers Count:', sellers.data.data.sellers.length);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

testAPI();