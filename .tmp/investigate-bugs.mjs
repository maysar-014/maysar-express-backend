/**
 * Investigate all 5 open defects
 */
import 'dotenv/config';

const BASE = 'http://localhost:3000';

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) });
  let data; try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data };
}

// Auth
const adminLogin = await req('POST', '/api/auth/login', { email: 'admin@maysar.co.tz', password: 'Maysar@2024!' });
const sellerLogin = await req('POST', '/api/auth/login', { email: 'seller@maysar.co.tz', password: 'Maysar@2024!' });
const buyerLogin  = await req('POST', '/api/auth/login', { email: 'buyer@maysar.co.tz',  password: 'Maysar@2024!' });
const adminTok  = adminLogin.data?.accessToken;
const sellerTok = sellerLogin.data?.accessToken;
const buyerTok  = buyerLogin.data?.accessToken;

console.log('=== NEW-001: verify-stock 400 ===');
// Get a real order in PENDING_SELLER_VERIFICATION
const orders = await req('GET', '/api/order/orders', null, sellerTok);
const pendingOrders = (orders.data?.data || orders.data?.orders || []).filter(o =>
  o.status === 'PENDING_SELLER_VERIFICATION' || o.status === 'PENDING'
);
console.log('Total seller orders:', orders.data?.data?.length ?? 'N/A');
console.log('Pending orders:', pendingOrders.length);
if (pendingOrders.length > 0) {
  const o = pendingOrders[0];
  console.log('Order id:', o.id, '| status:', o.status);
  // Try verify-stock
  const v = await req('POST', `/api/order/orders/${o.id}/verify-stock`, { confirmed: true }, sellerTok);
  console.log('verify-stock status:', v.status);
  console.log('verify-stock response:', JSON.stringify(v.data?.error || v.data?.message || v.data).slice(0, 300));
  
  // Try with different body
  const v2 = await req('POST', `/api/order/orders/${o.id}/verify-stock`, { stockAvailable: true }, sellerTok);
  console.log('verify-stock (stockAvailable:true):', v2.status, JSON.stringify(v2.data?.error || v2.data?.message).slice(0, 200));
  
  const v3 = await req('POST', `/api/order/orders/${o.id}/verify-stock`, {}, sellerTok);
  console.log('verify-stock (empty body):', v3.status, JSON.stringify(v3.data?.error || v3.data?.message).slice(0, 200));
} else {
  console.log('No pending orders — recent order may have already progressed');
}

console.log('\n=== NEW-002: analytics action-items 404 ===');
const sellerId = 'usr_01KRFZ1E5G6CWAQ4BXKVNPYG3Z';
// Try various paths
const paths = [
  '/api/analytics/action-items',
  `/api/analytics/sellers/${sellerId}/action-items`,
  `/api/analytics/sellers/${sellerId}/dashboard`,
];
for (const p of paths) {
  const r = await req('GET', p, null, sellerTok);
  console.log(`${r.status} ${p}`);
  if (r.status === 200 && r.data?.data?.actionItems) {
    console.log('  → actionItems count:', r.data.data.actionItems?.length);
  }
}

console.log('\n=== NEW-003: analytics profitability 404 ===');
const profPaths = [
  `/api/analytics/sellers/${sellerId}/profitability`,
  `/api/analytics/seller-profitability/dashboard`,
  `/api/analytics/seller-profitability/revenue-health`,
];
for (const p of profPaths) {
  const r = await req('GET', p, null, sellerTok);
  console.log(`${r.status} ${p}`);
}

console.log('\n=== NEW-004: support admin/kyc 404 ===');
const buyerId = 'usr_01KRFXQZC36NK3CDEWJJS21RP8';
const kycPaths = [
  `/api/support/admin/kyc/${buyerId}`,
  `/api/kyc/status`,
  `/api/compliance/kyc-status/${buyerId}`,
];
for (const p of kycPaths) {
  const r = await req('GET', p, null, adminTok);
  console.log(`${r.status} ${p}`, r.status === 200 ? JSON.stringify(r.data?.data || r.data).slice(0, 150) : '');
}

// Check buyer's KYC in DB
console.log('\n=== DEF-018: OpenAPI coverage ===');
const unmounted = await req('GET', '/api/production/plans', null, sellerTok);
console.log('GET /api/production/plans (documented but maybe unmounted):', unmounted.status);
const requestProvider = await req('GET', '/api/request/provider/requests', null, adminTok);
console.log('GET /api/request/provider/requests:', requestProvider.status);
