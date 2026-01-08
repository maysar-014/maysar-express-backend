const axios = require('axios');

async function testEnablerAPI() {
  const baseURL = 'http://localhost:3014';

  console.log('Testing Enabler API endpoints...\n');

  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const health = await axios.get(`${baseURL}/health`);
    console.log('✅ Health:', health.data);

    // Test sales-support endpoint
    console.log('\n2. Testing sales-support endpoint...');
    const salesSupport = await axios.get(`${baseURL}/api/enabler/sales-support`);
    console.log('✅ Sales Support:', salesSupport.data.success ? 'Success' : 'Failed');
    console.log('   Active Sessions:', salesSupport.data.data.activeSessions.length);
    console.log('   Completed Sessions:', salesSupport.data.data.completedSessions.length);
    console.log('   First Active Session:', JSON.stringify(salesSupport.data.data.activeSessions[0], null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

testEnablerAPI();
