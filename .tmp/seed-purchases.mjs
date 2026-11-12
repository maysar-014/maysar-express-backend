/**
 * Seed: purchase 10 different products to populate purchaseCount data.
 *
 * Flow per product:
 *  1. Buyer: POST /api/cart/items               (add to cart)
 *  2. Buyer: POST /api/logistics/v1/quote       (get delivery quote)
 *  3. Buyer: POST /api/checkout/initiate         (CART + quoteId)
 *  4. Buyer: POST /api/checkout/:id/confirm
 *  5. Admin: POST /api/order/orders/:orderId/status  { status: "DELIVERED" }
 *
 * Run: node .tmp/seed-purchases.mjs
 */

const BASE      = 'http://localhost:3000';
const SELLER_ID = 'usr_01KRFZ1E5G6CWAQ4BXKVNPYG3Z';

const BUYER_EMAIL = 'buyer@maysar.co.tz';
const BUYER_PASS  = 'Maysar@2024!';
const ADMIN_EMAIL = 'admin@maysar.co.tz';
const ADMIN_PASS  = 'Maysar@2024!';

// Default delivery coordinates (Dar es Salaam)
const DEST_LAT = -6.8167;
const DEST_LNG = 39.2833;
const DEST_ADDR = '1 Uhuru Street, Kinondoni, Dar es Salaam, Tanzania';

// Default pickup coordinates (fallback if no seller location exists)
const PICKUP_LAT = -6.7924;
const PICKUP_LNG = 39.2083;
const PICKUP_ADDR = 'Seller Shop, Dar es Salaam, Tanzania';

// ── helpers ───────────────────────────────────────────────────────────────────

function decodeJwtPayload(token) {
  const part = token.split('.')[1];
  const padded = part + '='.repeat((4 - (part.length % 4)) % 4);
  return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
}

async function doLogin(email, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }).then(r => r.json());
  if (!res.accessToken) throw new Error(`Login failed for ${email}: ${JSON.stringify(res).slice(0, 200)}`);
  return res.accessToken;
}

async function call(method, path, token, body, extraHeaders = {}) {
  const opts = {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...extraHeaders },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

// ── auth ──────────────────────────────────────────────────────────────────────

console.log('Authenticating...');
const buyerToken   = await doLogin(BUYER_EMAIL, BUYER_PASS);
const buyerPayload = decodeJwtPayload(buyerToken);
const BUYER_ID     = buyerPayload.userId || buyerPayload.id || buyerPayload.sub;

let adminToken = null;
try {
  adminToken = await doLogin(ADMIN_EMAIL, ADMIN_PASS);
} catch {
  console.warn('  ⚠️  Admin login failed — will use buyer token for status updates');
}

const statusToken = adminToken || buyerToken;
console.log(`✅ Buyer: ${BUYER_ID}`);
console.log(`✅ Status updater: ${adminToken ? 'admin' : 'buyer'}`);

// ── resolve seller pickup coordinates ──────────────────────────────────────────

let pickupLat  = PICKUP_LAT;
let pickupLng  = PICKUP_LNG;
let pickupAddr = PICKUP_ADDR;

try {
  const locRes = await call('GET', `/api/catalog/seller-locations?sellerId=${SELLER_ID}`, buyerToken);
  const loc = locRes.body?.data?.find?.(l => l.isActive) ?? locRes.body?.data?.[0];
  if (loc?.latitude && loc?.longitude) {
    pickupLat  = Number(loc.latitude);
    pickupLng  = Number(loc.longitude);
    pickupAddr = [loc.street, loc.ward, loc.region, loc.country].filter(Boolean).join(', ');
    console.log(`✅ Seller location: ${pickupAddr} (${pickupLat}, ${pickupLng})`);
  } else {
    console.log(`ℹ️  No seller location found — using default pickup coordinates`);
  }
} catch {
  console.log(`ℹ️  Seller location lookup failed — using default pickup coordinates`);
}

// ── fetch products ────────────────────────────────────────────────────────────

console.log(`\nFetching published products for seller ${SELLER_ID}...`);
const productsRes = await call('GET', `/api/catalog/v1/sellers/${SELLER_ID}/products?status=published&limit=20`, buyerToken);
if (productsRes.status !== 200 || !Array.isArray(productsRes.body?.data)) {
  console.error('❌ Could not fetch products:', JSON.stringify(productsRes.body).slice(0, 300));
  process.exit(1);
}

const products = productsRes.body.data;
console.log(`   Found ${products.length} products.`);
if (products.length === 0) {
  console.error('❌ No published products found. Publish some products first.');
  process.exit(1);
}

// ── purchase loop ─────────────────────────────────────────────────────────────

const TARGET  = Math.min(10, products.length);
const results = [];

for (let i = 0; i < TARGET; i++) {
  const product   = products[i];
  const productId = product.id;
  const price     = product.price?.amount ?? 5000;
  const weight    = product.weight ?? 0.5;
  const name      = (product.name ?? productId).slice(0, 35).padEnd(35);

  process.stdout.write(`\n[${i + 1}/${TARGET}] ${name}`);

  try {
    // Step 1 — Add to cart
    const cartRes = await call('POST', '/api/cart/items', buyerToken, {
      userId:      BUYER_ID,
      productId,
      quantity:    1,
      priceAtTime: price,
    });

    const cartId = cartRes.body?.data?.cartId
                ?? cartRes.body?.cartId
                ?? cartRes.body?.data?.id
                ?? cartRes.body?.id;

    if (!cartId || cartRes.status > 201) {
      process.stdout.write(`❌ cart (${cartRes.status}): ${JSON.stringify(cartRes.body?.error ?? cartRes.body).slice(0, 80)}`);
      results.push({ productId, status: 'FAILED_CART' });
      continue;
    }

    // Step 2 — Get delivery quote
    const quoteRes = await call('POST', '/api/logistics/v1/quote', buyerToken, {
      originLat:          pickupLat,
      originLng:          pickupLng,
      originAddress:      pickupAddr,
      destinationLat:     DEST_LAT,
      destinationLng:     DEST_LNG,
      destinationAddress: DEST_ADDR,
      packageWeightKg:    weight,
    });

    const quoteId    = quoteRes.body?.data?.quoteId;
    const deliveryFee = quoteRes.body?.data?.deliveryFee ?? 2000;

    if (!quoteId) {
      process.stdout.write(`❌ quote (${quoteRes.status}): ${JSON.stringify(quoteRes.body?.error ?? quoteRes.body).slice(0, 80)}`);
      results.push({ productId, status: 'FAILED_QUOTE' });
      continue;
    }

    // Step 3 — Initiate checkout with quoteId
    const initRes = await call('POST', '/api/checkout/initiate', buyerToken, {
      cartId,
      userId:            BUYER_ID,
      orderSource:       'CART',
      paymentMethodId:   'SELLER_VERIFICATION',
      shippingAddressId: cartId,
      billingAddressId:  cartId,
      shippingMethodId:  'SELLER_VERIFICATION',
      shippingCost:       deliveryFee,
      quoteId,
      deliveryAddress: {
        street:     '1 Uhuru Street',
        ward:       'Kinondoni',
        region:     'Dar es Salaam',
        city:       'Dar es Salaam',
        country:    'Tanzania',
        postalCode: '11101',
      },
    });

    if (!initRes.body?.success) {
      process.stdout.write(`❌ initiate (${initRes.status}): ${JSON.stringify(initRes.body?.error?.details ?? initRes.body?.error).slice(0, 100)}`);
      results.push({ productId, status: 'FAILED_INITIATE' });
      continue;
    }

    const sessionId = initRes.body.data?.id;
    if (!sessionId) {
      process.stdout.write(`❌ no sessionId`);
      results.push({ productId, status: 'NO_SESSION_ID' });
      continue;
    }

    // Step 4 — Confirm checkout
    const confirmRes = await call('POST', `/api/checkout/${sessionId}/confirm`, buyerToken, {
      paymentMethodId: 'SELLER_VERIFICATION',
      deliveryAddress: {
        street:     '1 Uhuru Street',
        ward:       'Kinondoni',
        region:     'Dar es Salaam',
        city:       'Dar es Salaam',
        country:    'Tanzania',
        postalCode: '11101',
      },
    });

    if (!confirmRes.body?.success) {
      process.stdout.write(`❌ confirm (${confirmRes.status}): ${JSON.stringify(confirmRes.body?.error).slice(0, 80)}`);
      results.push({ productId, status: 'FAILED_CONFIRM' });
      continue;
    }

    const orderId = confirmRes.body.data?.orderId;
    if (!orderId) {
      process.stdout.write(`⚠️  no orderId — session=${sessionId}`);
      results.push({ productId, status: 'NO_ORDER_ID', sessionId });
      continue;
    }

    // Step 5 — Force DELIVERED (requires idempotency key header)
    const deliverRes = await call('POST', `/api/order/orders/${orderId}/status`, statusToken, {
      status: 'DELIVERED',
    }, { 'Idempotency-Key': `seed-${orderId}` });

    if ([200, 201, 204].includes(deliverRes.status)) {
      process.stdout.write(`✅  orderId=${orderId}`);
      results.push({ productId, status: 'DELIVERED', orderId });
    } else {
      const errBody = deliverRes.body?.error ?? deliverRes.body;
      const errMsg = typeof errBody === 'string' ? errBody : (errBody?.message ?? JSON.stringify(errBody).slice(0, 120));
      process.stdout.write(`⚠️  (${deliverRes.status}) ${errMsg} orderId=${orderId}`);
      results.push({ productId, status: 'PLACED_NOT_DELIVERED', orderId });
    }

  } catch (err) {
    process.stdout.write(`❌ ${err.message}`);
    results.push({ productId, status: 'ERROR', error: err.message });
  }
}

// ── summary ───────────────────────────────────────────────────────────────────

const delivered = results.filter(r => r.status === 'DELIVERED').length;
const placed    = results.filter(r => r.status === 'PLACED_NOT_DELIVERED').length;
const failed    = results.filter(r => !['DELIVERED', 'PLACED_NOT_DELIVERED'].includes(r.status)).length;

console.log(`\n\n─────────────────────────────────────────────`);
console.log(`Delivered:   ${delivered} / ${TARGET}`);
console.log(`Placed only: ${placed}  (not yet DELIVERED)`);
console.log(`Failed:      ${failed}`);

if (delivered + placed > 0) {
  console.log(`\n✅ Verify purchaseCount:`);
  console.log(`   node .tmp/probe-purchase-count.mjs`);
} else {
  console.log('\n❌ No purchases succeeded. Check errors above.');
  process.exit(1);
}
