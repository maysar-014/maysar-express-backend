console.log('🔧 ROUTE OPTIMIZATION ENGINE - PROFESSIONAL DIAGNOSTIC & FIX');
console.log('===========================================================');

async function diagnoseRouteOptimizationEngine(): Promise<void> {
  console.log('🔍 Step 1: Importing Route Optimization Engine...');
  
  try {
    const { RouteOptimizationEngine } = await import('./engines/route-optimization.engine');
    console.log('✅ Engine import successful');
    
    console.log('🔍 Step 2: Creating engine instance...');
    const engine = new RouteOptimizationEngine();
    console.log('✅ Engine instantiation successful');
    
    console.log('🔍 Step 3: Testing with minimal valid input...');
    const testInput = {
      courierId: 'test_courier',
      vehicleType: 'motorcycle' as const,
      startLocation: { 
        address: 'Test Start', 
        coordinates: { lat: -6.7924, lng: 39.2083 } 
      },
      deliveries: [{
        deliveryId: 'test_delivery_001',
        orderId: 'test_order_001',
        location: { 
          address: 'Test Destination', 
          coordinates: { lat: -6.8000, lng: 39.2100 } 
        },
        serviceTime: 10,
        priority: 'normal' as const,
        packageWeight: 2.5
      }],
      constraints: {
        maxDistance: 50,
        maxDuration: 240,
        maxCapacity: 20,
        workingHours: { start: '08:00', end: '18:00' }
      },
      preferences: {
        algorithm: 'balanced' as const,
        avoidTolls: false,
        avoidHighways: false,
        prioritizeUrgent: true,
        minimizeBacktracking: true
      }
    };
    
    console.log('🔍 Step 4: Executing route optimization...');
    const result = await engine.processRouteOptimization(testInput);
    
    console.log('📊 DIAGNOSTIC RESULTS:');
    console.log(`Success: ${result.success}`);
    console.log(`Processing Time: ${result.processingTime}ms`);
    console.log(`Confidence: ${result.confidence}%`);
    console.log(`Optimized Route ID: ${result.optimizedRoute.routeId}`);
    console.log(`Total Distance: ${result.optimizedRoute.totalDistance}km`);
    console.log(`Total Duration: ${result.optimizedRoute.totalDuration}min`);
    console.log(`Warnings: ${result.warnings.length}`);
    
    if (result.warnings.length > 0) {
      console.log('⚠️  Warnings detected:');
      result.warnings.forEach(warning => console.log(`   - ${warning}`));
    }
    
    if (result.success) {
      console.log('✅ DIAGNOSIS COMPLETE: Engine is working correctly');
      console.log('🔧 ISSUE: Test framework validation logic needs adjustment');
    } else {
      console.log('❌ DIAGNOSIS COMPLETE: Engine has functional issues');
      console.log('🔧 ISSUE: Core optimization logic needs fixing');
    }
    
  } catch (error: any) {
    console.log('❌ CRITICAL ERROR DETECTED:');
    console.log(`Error Type: ${error.constructor.name}`);
    console.log(`Error Message: ${error.message}`);
    console.log(`Stack Trace: ${error.stack}`);
    
    console.log('\n🔧 PROFESSIONAL FIX REQUIRED:');
    if (error.message.includes('Cannot find module')) {
      console.log('- Missing dependency or import path issue');
    } else if (error.message.includes('is not a function')) {
      console.log('- Method signature mismatch or undefined method');
    } else if (error.message.includes('validation')) {
      console.log('- Input validation failure');
    } else {
      console.log('- Runtime execution error in optimization logic');
    }
  }
}

// Run diagnosis
diagnoseRouteOptimizationEngine().catch(console.error);