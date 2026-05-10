/**
 * create-test-product.js
 *
 * Stands as the contract seller (contract.seller@example.com) and creates
 * a fully-featured product via the catalog API so you can verify the
 * frontend response — including inventory status.
 *
 * Usage:
 *   node scripts/testing/create-test-product.js
 *
 * Prerequisites: server must be running on http://localhost:3000
 */

'use strict';

const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

// ---------------------------------------------------------------------------
// Inline minimal JWT signing (no extra deps beyond what's already installed)
// ---------------------------------------------------------------------------
const crypto = require('crypto');

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signJwt(payload, secret) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body   = base64url(JSON.stringify(payload));
  const sig    = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${header}.${body}.${sig}`;
}

// ---------------------------------------------------------------------------
// Identity — use a real seller from the database
// ---------------------------------------------------------------------------
const SELLER_USER_ID  = process.env.CONTRACT_TEST_OPENAPI_USER_ID || 'usr_ETVQTMVRVB7SXRJH096AVTXRS4'; // Kariakoo Pantry Wholesale owner
const SELLER_EMAIL    = 'contract.seller@example.com';
const JWT_SECRET      = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('JWT_SECRET is not set in .env');
  process.exit(1);
}

const token = signJwt(
  {
    userId:    SELLER_USER_ID,
    email:     SELLER_EMAIL,
    roles:     ['seller'],
    iat:       Math.floor(Date.now() / 1000),
    exp:       Math.floor(Date.now() / 1000) + 7 * 24 * 3600, // 7 days
  },
  JWT_SECRET
);

// ---------------------------------------------------------------------------
// Real IDs from the database
// Override via env vars if needed
// ---------------------------------------------------------------------------
const CATEGORY_ID           = process.env.CONTRACT_TEST_CATEGORY_ID           || 'ba4a908b-c682-4018-82d4-40c98a8aa3ae'; // Food & Beverages
const SUPPLIER_LOCATION_ID  = process.env.CONTRACT_TEST_BUSINESS_ADDRESS_ID   || 'bad_SPVREKKA7ASE8PZMHG3WBW21GR';       // Kariakoo Pantry Wholesale, Dar es Salaam

// ---------------------------------------------------------------------------
// Product payload — every supported field
// ---------------------------------------------------------------------------
const product = {
  sellerId:              SELLER_USER_ID,
  categoryId:            CATEGORY_ID,
  brand:                 'Azam',
  productName:           'Azam Uji wa Mtama Food Beverage Porridge Flour',
  minimumOrderQuantity:  10,
  supplierLocationId:    SUPPLIER_LOCATION_ID,
  price:                 3500,
  currency:              'TZS',
  inventoryCount:        200,
  mediaUrls: [
    'https://images.jumia.com.ng/unsafe/fit-in/500x500/filters:fill(white)/product/62/0b5b41/1.jpg',
    'https://images.jumia.com.ng/unsafe/fit-in/500x500/filters:fill(white)/product/62/0b5b41/2.jpg',
  ],
  structuredAttributes: {
    weight:   '1kg',
    flavor:   'Original Food & Beverages',
    type:     'Porridge Flour',
  },
  enablerEnabled:        false,
};

// ---------------------------------------------------------------------------
// HTTP helper (uses built-in http/https — no axios needed)
// ---------------------------------------------------------------------------
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function post(url, body, headers = {}) {
  const { default: fetch } = await import('node-fetch').catch(() => {
    // fallback to built-in fetch (Node 18+)
    return { default: globalThis.fetch };
  });

  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body:    JSON.stringify(body),
  });

  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, ok: res.ok, json };
}

async function get(url, headers = {}) {
  const { default: fetch } = await import('node-fetch').catch(() => {
    return { default: globalThis.fetch };
  });

  const res = await fetch(url, { headers });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, ok: res.ok, json };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
(async () => {
  console.log('\n========================================');
  console.log('  Creating test product as contract seller');
  console.log('========================================\n');
  console.log(`Seller ID : ${SELLER_USER_ID}`);
  console.log(`Category  : ${CATEGORY_ID}`);
  console.log(`Location  : ${SUPPLIER_LOCATION_ID}`);
  console.log(`Token     : ${token.slice(0, 40)}...\n`);

  // Step 1 — Create product
  console.log('→ POST /api/catalog/v1/products');
  const createRes = await post(
    `${BASE_URL}/api/catalog/v1/products`,
    product,
    { Authorization: `Bearer ${token}` }
  );

  console.log(`  Status : ${createRes.status}`);
  console.log(`  Body   : ${JSON.stringify(createRes.json, null, 2)}\n`);

  if (!createRes.ok || !createRes.json?.data?.productId) {
    console.error('✗ Product creation failed. Check the error above.');
    process.exit(1);
  }

  const productId = createRes.json.data.productId;
  console.log(`✓ Product created: ${productId}\n`);

  // Step 2 — Fetch the product to verify inventory
  console.log(`→ GET /api/catalog/v1/products/${productId}`);
  const getRes = await get(
    `${BASE_URL}/api/catalog/v1/products/${productId}`,
    { Authorization: `Bearer ${token}` }
  );

  console.log(`  Status : ${getRes.status}`);
  console.log(`  Body   : ${JSON.stringify(getRes.json, null, 2)}\n`);

  if (getRes.ok) {
    const inv = getRes.json?.data?.inventory;
    if (inv) {
      console.log('========================================');
      console.log('  Inventory result');
      console.log('========================================');
      console.log(`  status    : ${inv.status}`);
      console.log(`  available : ${inv.available}`);
      console.log(`  reserved  : ${inv.reserved}`);
      if (inv.status === 'in_stock') {
        console.log('\n✓ Bug is fixed — product shows in_stock correctly.');
      } else {
        console.log('\n⚠ Product still shows out_of_stock.');
        console.log('  This likely means the inventory_StockItem was not created yet.');
        console.log('  Check that the InventoryService ProductCreated handler ran.');
      }
    } else {
      console.log('⚠ No inventory field in response.');
    }
  }

  console.log('\nDone.\n');
})();
