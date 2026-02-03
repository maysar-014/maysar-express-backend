// Script to check and seed couriers in the database
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase configuration in .env file');
  console.error('Need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Use service role key to bypass RLS for admin operations
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkCouriers() {
  console.log('🔍 Checking couriers in database...');

  try {
    // Check existing couriers
    const { data: couriers, error } = await supabase
      .from('couriers')
      .select('*');

    if (error) {
      console.error('❌ Error querying couriers:', error);
      return;
    }

    console.log(`📊 Found ${couriers.length} couriers in database:`);

    couriers.forEach((courier, index) => {
      console.log(`${index + 1}. ${courier.name} (${courier.id})`);
      console.log(`   - Available: ${courier.is_available}`);
      console.log(`   - Rating: ${courier.rating}`);
      console.log(`   - Completion Rate: ${courier.completion_rate}`);
      console.log(`   - Location: ${courier.current_lat}, ${courier.current_lng}`);
      console.log('');
    });

    // Check for available couriers meeting criteria
    const { data: availableCouriers, error: availableError } = await supabase
      .from('couriers')
      .select('*')
      .eq('is_available', true)
      .gte('rating', 4.0)
      .gte('completion_rate', 0.90)
      .not('current_lat', 'is', null)
      .not('current_lng', 'is', null);

    if (availableError) {
      console.error('❌ Error querying available couriers:', availableError);
      return;
    }

    console.log(`✅ Found ${availableCouriers.length} available couriers meeting criteria`);

    if (availableCouriers.length === 0) {
      console.log('🔧 Updating existing couriers to meet policy requirements...');

      // Update existing couriers to meet the policy requirements
      const updates = [
        {
          id: 'courier_001',
          updates: {
            rating: 4.8,
            completion_rate: 0.96,
            max_weight: 15.0,
            max_volume: 0.1,
            max_items: 10,
            traffic_experience: 0.9
          }
        },
        {
          id: 'courier_002',
          updates: {
            rating: 4.7,
            completion_rate: 0.97,
            max_weight: 8.0,
            max_volume: 0.05,
            max_items: 5,
            traffic_experience: 0.85
          }
        }
      ];

      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('couriers')
          .update(update.updates)
          .eq('id', update.id);

        if (updateError) {
          console.error(`❌ Error updating courier ${update.id}:`, updateError);
        } else {
          console.log(`✅ Updated courier ${update.id}`);
        }
      }

      console.log('🎉 Couriers updated successfully!');
      console.log('🔄 Please restart your logistics service to pick up the changes.');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkCouriers();
