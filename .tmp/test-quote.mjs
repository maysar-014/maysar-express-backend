/**
 * Test the logistics quote and checkout flow end-to-end
 * with the correct request structure
 */
import 'dotenv/config';

const BASE = 'http://localhost:3000';
const SELLER_ID = 'usr_01KRFZ1E5G6CWAQ4BXKVNPYG3Z';
const BUYER_ID  = 'usr_01KRFXQZC36NK3CDEWJJS21RP8';

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method, headers, ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let data;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data };
}

// Login
const loginBuyer = await req('POST', '/api/auth/login', { email: 'buyer@maysar.co.tz', password: 'Maysar@2024!' });
const loginSeller = await req('POST', '/api/auth/login', { email: 'seller@maysar.co.tz', password: 'Maysar@2024!' });
const buyerToken = loginBuyer.data?.accessToken;
const sellerToken = loginSeller.data?.accessToken;
console.log('Login buyer:', loginBuyer.status, buyerToken ? '✅' : '❌');

// Get a real product
const products = await req('GET', `/api/catalog/v1/sellers/${SELLER_ID}/products`, null, sellerToken);
const rawData = products.data?.data;
const items = (rawData && typeof rawData === 'object' && !Array.isArray(rawData) && '0' in rawData)
  ? Object.values(rawData)
  : (Array.isArray(rawData) ? rawData : []);
const product = items.find(p => p.status === 'published') || items[0];
console.log('\nProduct:', product?.id, product?.name || product?.title);
console.log('VariantId:', product?.variantId);

if (!product?.id) { console.log('No product found'); process.exit(1); }

// Try the quote with seller's actual address coordinates
// Dar es Salaam center: -6.7924, 39.2083
const quoteBody = {
  sellerId: SELLER_ID,
  items: [{ 
    productId: product.id,
    variantId: product.variantId || product.id,
    quantity: 1,
    weight: 0.5 
  }],
  deliveryAddress: {
    street: 'Kariakoo Market',
    ward: 'Kariakoo',
    district: 'Ilala',
    region: 'Dar es Salaam',
    city: 'Dar es Salaam',
    postalCode: '00000',
    country: 'Tanzania',
  },
  pickupAddress: {
    street: 'Uhuru Street 1',
    ward: 'Kisutu',
    district: 'Ilala',
    region: 'Dar es Salaam',
    city: 'Dar es Salaam',
    postalCode: '00000',
    country: 'Tanzania',
  },
  totalValueTzs: 45000,
  // Also try with coordinates
  buyerCoordinates: { lat: -6.8100, lng: 39.2800 },
  sellerCoordinates: { lat: -6.7924, lng: 39.2083 },
};

console.log('\n=== Testing POST /api/logistics/v1/quote ===');
const quote = await req('POST', '/api/logistics/v1/quote', quoteBody, buyerToken);
console.log('Status:', quote.status);
console.log('Response:', JSON.stringify(quote.data?.error || quote.data?.data || quote.data).slice(0, 400));

// If quote failed, try alternate field names
if (quote.status !== 200 && quote.status !== 201) {
  const quoteBody2 = {
    ...quoteBody,
    sellerAddress: quoteBody.pickupAddress,
    buyerAddress: quoteBody.deliveryAddress,
  };
  delete quoteBody2.pickupAddress;
  delete quoteBody2.deliveryAddress;
  
  console.log('\n=== Retry with sellerAddress/buyerAddress ===');
  const quote2 = await req('POST', '/api/logistics/v1/quote', quoteBody2, buyerToken);
  console.log('Status:', quote2.status);
  console.log('Response:', JSON.stringify(quote2.data?.error || quote2.data?.data || quote2.data).slice(0, 400));
  
  // Try minimal body
  const quote3 = await req('POST', '/api/logistics/v1/quote', { sellerId: SELLER_ID }, buyerToken);
  console.log('\n=== Minimal body (sellerId only) — for validation error details ===');
  console.log('Status:', quote3.status);
  console.log('Response:', JSON.stringify(quote3.data).slice(0, 600));
}
