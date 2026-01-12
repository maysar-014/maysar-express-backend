const axios = require('axios');

async function testDatabaseConnection() {
  try {
    console.log('🔍 Testing Logistics Service Database Connection...\n');

    // Test 1: Health check
    console.log('📊 Step 1: Health check...');
    const healthResponse = await axios.get('http://localhost:3007/health');
    console.log('✅ Service is healthy:', healthResponse.data.dependencies);

    // Test 2: Check if deliveries table exists by trying to get deliveries
    console.log('\n📋 Step 2: Testing deliveries endpoint...');
    const deliveriesResponse = await axios.get('http://localhost:3007/api/v1/deliveries?limit=5');
    console.log('✅ Deliveries endpoint works');
    console.log(`   Found ${deliveriesResponse.data.data.deliveries.length} deliveries`);

    // Test 3: Try to create a simple delivery and immediately check if it exists
    console.log('\n📦 Step 3: Creating test delivery...');
    const createResponse = await axios.post('http://localhost:3007/api/v1/deliveries', {
      orderId: `db_test_${Date.now()}`,
      pickupAddress: {
        street: "Test Street",
        city: "Dar es Salaam",
        region: "Dar es Salaam",
        postalCode: "11101",
        country: "TZ",
        contactName: "Test Seller",
        contactPhone: "+255712345678",
        coordinates: { lat: -6.7924, lng: 39.2083 }
      },
      deliveryAddress: {
        street: "Test Avenue",
        city: "Dar es Salaam",
        region: "Dar es Salaam",
        postalCode: "11102",
        country: "TZ",
        contactName: "Test Customer",
        contactPhone: "+255723456789",
        coordinates: { lat: -6.8000, lng: 39.2100 }
      },
      packageDetails: {
        weight: 1.0,
        dimensions: { length: 20, width: 15, height: 10 },
        value: 15000,
        fragile: false,
        perishable: false,
        hazardous: false,
        items: [{
          productId: "db_test",
          name: "DB Test Item",
          quantity: 1,
          weight: 1.0,
          value: 15000
        }]
      },
      priority: "standard",
      desiredArrivalTime: new Date(Date.now() + 3600000).toISOString(),
      estimatedArrivalMinutes: 30
    }, {
      headers: { 'Content-Type': 'application/json', 'api-version': 'v1' }
    });

    const deliveryId = createResponse.data.data.deliveryId;
    console.log(`✅ Delivery created: ${deliveryId}`);

    // Immediately try to fetch it
    console.log('\n🔍 Step 4: Immediately fetching the created delivery...');
    try {
      const fetchResponse = await axios.get(`http://localhost:3007/api/v1/deliveries/${deliveryId}`);
      console.log('✅ Delivery found in database!');
      console.log(`   Status: ${fetchResponse.data.data.status}`);
      console.log(`   Courier: ${fetchResponse.data.data.courierId}`);

      // Now test the status update
      console.log('\n🚚 Step 5: Testing status update...');
      const updateResponse = await axios.post(`http://localhost:3007/api/v1/deliveries/${deliveryId}/status`, {
        status: "picked_up",
        location: { lat: -6.7924, lng: 39.2083, address: "Pickup Location" },
        notes: "Database connection test"
      }, {
        headers: { 'Content-Type': 'application/json', 'api-version': 'v1' }
      });

      console.log('✅ Status update successful!');
      console.log(`   New status: ${updateResponse.data.data.status}`);
      console.log(`   Previous status: ${updateResponse.data.data.previousStatus}`);

    } catch (fetchError) {
      console.log('❌ Delivery NOT found in database - this is the problem!');
      console.log('Error:', fetchError.response?.data || fetchError.message);
    }

    console.log('\n🎯 Database connection test completed');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testDatabaseConnection();
