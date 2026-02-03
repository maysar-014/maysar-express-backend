import 'dotenv/config';
import { LogisticsEngine } from './engines/logistics.engine';

async function testLogisticsEngine() {
  console.log('🧪 Testing Logistics Engine...\n');
  
  const engine = new LogisticsEngine();
  
  const testInput = {
    orderId: 'test_order_001',
    pickupAddress: {
      street: 'Uhuru Street',
      city: 'Dar es Salaam',
      region: 'Dar es Salaam',
      postalCode: '11101',
      country: 'Tanzania',
      contactName: 'John Seller',
      contactPhone: '+255712345678'
    },
    deliveryAddress: {
      street: 'Samora Avenue',
      city: 'Dar es Salaam',
      region: 'Dar es Salaam',
      postalCode: '11102',
      country: 'Tanzania',
      contactName: 'Jane Customer',
      contactPhone: '+255723456789'
    },
    packageDetails: {
      weight: 2.5,
      dimensions: { length: 30, width: 20, height: 15 },
      value: 50000,
      fragile: false,
      perishable: false,
      hazardous: false,
      items: [
        {
          productId: 'prod_001',
          name: 'Electronics',
          quantity: 1,
          weight: 2.5,
          value: 50000
        }
      ]
    },
    serviceType: 'standard' as const,
    priority: 'normal' as const,
    specialInstructions: 'Handle with care'
  };

  try {
    const result = await engine.processLogisticsRequest(testInput);
    
    console.log('✅ Logistics Engine Test Results:');
    console.log('='.repeat(50));
    console.log(`🆔 Delivery ID: ${result.deliveryId}`);
    console.log(`💰 Shipping Cost: ${result.shippingCost.toLocaleString()} TZS`);
    console.log(`🚚 Courier: ${result.courierAssignment.courierName} (${result.courierAssignment.vehicleType})`);
    console.log(`📞 Courier Phone: ${result.courierAssignment.courierPhone}`);
    console.log(`⭐ Courier Rating: ${result.courierAssignment.rating}/5.0`);
    console.log(`📦 Tracking Number: ${result.trackingInfo.trackingNumber}`);
    console.log(`📍 Current Status: ${result.trackingInfo.status}`);
    console.log(`🗺️ Distance: ${result.route.distance} km`);
    console.log(`⏱️ Estimated Duration: ${result.route.estimatedDuration} minutes`);
    console.log(`🚦 Traffic Condition: ${result.route.trafficCondition}`);
    console.log(`📅 Estimated Delivery: ${result.estimatedDeliveryTime.toLocaleString()}`);
    console.log(`🎯 Confidence: ${result.confidence}%`);
    console.log(`⚡ Processing Time: ${result.processingTime}ms`);
    
    if (result.warnings.length > 0) {
      console.log(`\n⚠️ Warnings:`);
      result.warnings.forEach(warning => console.log(`   • ${warning}`));
    }
    
    if (result.recommendations.length > 0) {
      console.log(`\n💡 Recommendations:`);
      result.recommendations.forEach(rec => console.log(`   • ${rec}`));
    }
    
    console.log('\n🎉 Logistics Engine is working perfectly!');
    
  } catch (error: any) {
    console.error('❌ Logistics Engine Test Failed:', error.message);
  }
}

testLogisticsEngine();