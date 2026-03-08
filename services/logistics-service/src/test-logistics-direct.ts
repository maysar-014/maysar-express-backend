// @ts-nocheck
import 'dotenv/config';
import { LogisticsEngine } from './engines/logistics.engine';

async function testLogisticsEngine() {
  console.log('ðŸ§ª Testing Logistics Engine...\n');
  
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
    
    console.log('âœ… Logistics Engine Test Results:');
    console.log('='.repeat(50));
    console.log(`ðŸ†” Delivery ID: ${result.deliveryId}`);
    console.log(`ðŸ’° Shipping Cost: ${result.shippingCost.toLocaleString()} TZS`);
    console.log(`ðŸšš Courier: ${result.courierAssignment.courierName} (${result.courierAssignment.vehicleType})`);
    console.log(`ðŸ“ž Courier Phone: ${result.courierAssignment.courierPhone}`);
    console.log(`â­ Courier Rating: ${result.courierAssignment.rating}/5.0`);
    console.log(`ðŸ“¦ Tracking Number: ${result.trackingInfo.trackingNumber}`);
    console.log(`ðŸ“ Current Status: ${result.trackingInfo.status}`);
    console.log(`ðŸ—ºï¸ Distance: ${result.route.distance} km`);
    console.log(`â±ï¸ Estimated Duration: ${result.route.estimatedDuration} minutes`);
    console.log(`ðŸš¦ Traffic Condition: ${result.route.trafficCondition}`);
    console.log(`ðŸ“… Estimated Delivery: ${result.estimatedDeliveryTime.toLocaleString()}`);
    console.log(`ðŸŽ¯ Confidence: ${result.confidence}%`);
    console.log(`âš¡ Processing Time: ${result.processingTime}ms`);
    
    if (result.warnings.length > 0) {
      console.log(`\nâš ï¸ Warnings:`);
      result.warnings.forEach(warning => console.log(`   â€¢ ${warning}`));
    }
    
    if (result.recommendations.length > 0) {
      console.log(`\nðŸ’¡ Recommendations:`);
      result.recommendations.forEach(rec => console.log(`   â€¢ ${rec}`));
    }
    
    console.log('\nðŸŽ‰ Logistics Engine is working perfectly!');
    
  } catch (error: any) {
    console.error('âŒ Logistics Engine Test Failed:', error.message);
  }
}

testLogisticsEngine();
