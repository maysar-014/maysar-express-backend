const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function testDirectSave() {
  console.log('🧪 Testing Supabase Connection and Table Access...\n');

  try {
    // Initialize Supabase client directly
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    console.log('Environment variables:');
    console.log('SUPABASE_URL:', supabaseUrl ? 'Set' : 'NOT SET');
    console.log('SUPABASE_ANON_KEY:', supabaseKey ? 'Set' : 'NOT SET');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    console.log('\n🔗 Connecting to Supabase...');
    const supabaseClient = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase client created');

    // Test 1: Check if deliveries table exists
    console.log('\n📋 Test 1: Checking deliveries table access...');
    try {
      const { data, error } = await supabaseClient.from('deliveries').select('*').limit(1);
      if (error) {
        console.log('❌ Deliveries table access failed:', error.message);
        console.log('❌ This is likely the root cause - table does not exist or permissions wrong');
        return;
      }
      console.log('✅ Deliveries table exists and is accessible');
      console.log(`   Found ${data.length} existing deliveries`);
    } catch (err) {
      console.log('❌ Table access error:', err.message);
      return;
    }

    // Test 2: Try to insert a simple record
    console.log('\n📦 Test 2: Attempting direct insert...');
    const testId = `test_${Date.now()}`;
    const { data: insertData, error: insertError } = await supabaseClient
      .from('deliveries')
      .insert({
        id: testId,
        order_id: `order_${testId}`,
        courier_id: 'courier_001',
        status: 'assigned',
        pickup_lat: -6.7924,
        pickup_lng: 39.2083,
        pickup_address: 'Test Pickup Location',
        delivery_lat: -6.8000,
        delivery_lng: 39.2100,
        delivery_address: 'Test Delivery Location',
        estimated_pickup_time: new Date().toISOString(),
        estimated_delivery_time: new Date(Date.now() + 3600000).toISOString(),
        weight: 1.0,
        priority: 'standard',
        route_distance: 5.0,
        route_duration: 15,
        total_cost: 15.00
      });

    if (insertError) {
      console.log('❌ Direct insert failed:', insertError.message);
      console.log('❌ Database schema issue or permissions problem');
      return;
    }
    console.log('✅ Direct insert successful!');

    // Test 3: Try to fetch the inserted record
    console.log('\n🔍 Test 3: Fetching inserted record...');
    const { data: fetchData, error: fetchError } = await supabaseClient
      .from('deliveries')
      .select('*')
      .eq('id', testId);

    if (fetchError) {
      console.log('❌ Fetch failed:', fetchError.message);
      return;
    }

    if (fetchData && fetchData.length > 0) {
      console.log('✅ Record found in database!');
      console.log(`   ID: ${fetchData[0].id}`);
      console.log(`   Status: ${fetchData[0].status}`);
      console.log(`   Courier: ${fetchData[0].courier_id}`);
    } else {
      console.log('❌ Record NOT found after insert');
      return;
    }

    // Test 4: Try to update the record
    console.log('\n🚚 Test 4: Testing status update...');
    const { error: updateError } = await supabaseClient
      .from('deliveries')
      .update({ status: 'picked_up' })
      .eq('id', testId);

    if (updateError) {
      console.log('❌ Update failed:', updateError.message);
      return;
    }
    console.log('✅ Status update successful!');

    // Verify update
    const { data: verifyData } = await supabaseClient
      .from('deliveries')
      .select('status')
      .eq('id', testId);

    if (verifyData && verifyData.length > 0 && verifyData[0].status === 'picked_up') {
      console.log('✅ Status update verified!');
    }

    console.log('\n🎉 All Supabase tests passed! The database connection and table work correctly.');
    console.log('The issue must be in the application layer, not the database.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testDirectSave();
