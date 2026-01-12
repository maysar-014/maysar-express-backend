const axios = require('axios');

const BASE_URL = 'http://localhost:3007/api/v1';

async function testPickupAPI() {
  try {
    console.log('🧪 Testing Delivery Status Update API...\n');

    // Step 1: Create a delivery
    console.log('📦 Step 1: Creating delivery...');
    const createResponse = await axios.post(`${BASE_URL}/deliveries`, {
      orderId: `test_pickup_${Date.now()}`,
      pickupAddress: {
        street: "Uhuru Street",
        city: "Dar es Salaam",
        region: "Dar es Salaam",
        postalCode: "11101",
        country: "TZ",
        contactName: "Test Seller",
        contactPhone: "+255712345678",
        coordinates: {
          lat: -6.7924,
          lng: 39.2083
        }
      },
      deliveryAddress: {
        street: "Samora Avenue",
        city: "Dar es Salaam",
        region: "Dar es Salaam",
        postalCode: "11102",
        country: "TZ",
        contactName: "Test Customer",
        contactPhone: "+255723456789",
        coordinates: {
          lat: -6.8000,
          lng: 39.2100
        }
      },
      packageDetails: {
        weight: 2.5,
        dimensions: {
          length: 30,
          width: 20,
          height: 15
        },
        value: 50000,
        fragile: false,
        perishable: false,
        hazardous: false,
        items: [
          {
            productId: "prod_test_pickup",
            name: "Test Electronics",
            quantity: 1,
            weight: 2.5,
            value: 50000
          }
        ]
      },
      priority: "standard",
      desiredArrivalTime: new Date(Date.now() + 3600000).toISOString(),
      estimatedArrivalMinutes: 45
    }, {
      headers: {
        'Content-Type': 'application/json',
        'api-version': 'v1'
      }
    });

    if (!createResponse.data.success) {
      throw new Error('Failed to create delivery');
    }

    const deliveryId = createResponse.data.data.deliveryId;
    console.log(`✅ Delivery created with ID: ${deliveryId}`);
    console.log(`   Status: ${createResponse.data.data.status}`);
    console.log(`   Courier ID: ${createResponse.data.data.courierId}\n`);

    // Step 2: Update delivery status to picked_up
    console.log('🚚 Step 2: Simulating pickup...');
    const pickupResponse = await axios.post(`${BASE_URL}/deliveries/${deliveryId}/status`, {
      status: "picked_up",
      location: {
        lat: -6.7924,
        lng: 39.2083,
        address: "Pickup Location"
      },
      notes: "Package picked up by courier - API Test"
    }, {
      headers: {
        'Content-Type': 'application/json',
        'api-version': 'v1'
      }
    });

    if (!pickupResponse.data.success) {
      throw new Error(`Failed to update delivery status: ${JSON.stringify(pickupResponse.data, null, 2)}`);
    }

    console.log('✅ Pickup simulation successful!');
    console.log(`   Delivery ID: ${pickupResponse.data.data.deliveryId}`);
    console.log(`   New Status: ${pickupResponse.data.data.status}`);
    console.log(`   Previous Status: ${pickupResponse.data.data.previousStatus}`);
    console.log(`   Picked Up At: ${pickupResponse.data.data.pickedUpAt}`);
    console.log(`   Updated At: ${pickupResponse.data.data.updatedAt}\n`);

    // Step 3: Verify the delivery was updated
    console.log('🔍 Step 3: Verifying delivery update...');
    const verifyResponse = await axios.get(`${BASE_URL}/deliveries/${deliveryId}`, {
      headers: {
        'api-version': 'v1'
      }
    });

    if (!verifyResponse.data.success) {
      throw new Error('Failed to verify delivery update');
    }

    const delivery = verifyResponse.data.data;
    console.log('✅ Delivery verification successful!');
    console.log(`   Current Status: ${delivery.status}`);
    console.log(`   Picked Up At: ${delivery.actualPickupTime || 'Not set'}`);
    console.log(`   Updated At: ${delivery.updatedAt}\n`);

    console.log('🎉 All tests passed! The delivery status update API is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
testPickupAPI();
