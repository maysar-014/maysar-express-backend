/**
 * Check eventBus subscriber counts via the payment health endpoint
 * and also verify the saga handler subscription is active.
 */
const BASE = 'http://localhost:3000';

// 1. Check payment health (may show eventBus metrics)
const health = await fetch(`${BASE}/api/payment/health`).then(r => r.json()).catch(() => null);
console.log('Payment health:', JSON.stringify(health, null, 2)?.slice(0, 500));

// 2. Login and place an order, then immediately check payment count
const loginRes = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'buyer@maysar.co.tz', password: 'Maysar@2024!' })
}).then(r => r.json());
const buyerToken = loginRes.accessToken || loginRes.token;

// 3. Check notification health which has eventBus subscriber counts
const ntfHealth = await fetch(`${BASE}/api/notification/health`).then(r => r.json()).catch(() => null);
console.log('\nNotification health (eventBus metrics):');
console.log(JSON.stringify(ntfHealth, null, 2)?.slice(0, 1000));

// 4. Check if payment eventBus has OrderCreated subscribers
// The payment health route shows subscriber counts
const payHealth = await fetch(`${BASE}/api/payment/health`).then(r => r.json()).catch(() => null);
console.log('\nPayment health again:', JSON.stringify(payHealth?.data?.eventBus || payHealth?.eventBus || payHealth, null, 2)?.slice(0, 500));
