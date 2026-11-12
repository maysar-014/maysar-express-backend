/**
 * Probe: verify the storefront link uses the public slug, not the raw seller ID.
 *
 * Run: node .tmp/probe-storefront-slug.mjs
 */

import jwt from 'jsonwebtoken';

const BASE    = 'http://localhost:3500';
const SELLER  = 'usr_01KRFZ1E5G6CWAQ4BXKVNPYG3Z';
const SECRET  = '976b5ecd916f944651855111f3cf7010ed7bc56c4e3d703523caa300eec216e67652bd44305c30a1cef5cdc0f59a902111183d88f61940fd1e4b7c65c758034b';

const token = jwt.sign(
  { userId: SELLER, email: 'seller@test.com', roles: ['seller'] },
  SECRET,
  { expiresIn: '1h' }
);

async function get(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return { status: res.status, body: await res.json() };
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return { status: res.status, body: await res.json() };
}

function check(label, url) {
  const hasRawId = url?.includes('usr_');
  const isClean  = url && !hasRawId;
  console.log(`\n${label}`);
  console.log(`  url   : ${url}`);
  console.log(`  result: ${isClean ? '✅ clean slug' : '❌ CONTAINS RAW ID or missing'}`);
}

// ── 1. GET storefront ────────────────────────────────────────────────────────
console.log('\n=== 1. GET /api/catalog/sellers/:id/storefront ===');
const sf = await get(`/api/catalog/sellers/${SELLER}/storefront`);
console.log(`status: ${sf.status}`);
if (sf.status === 200) {
  check('shareUrl', sf.body.data?.shareUrl);
  check('shortUrl', sf.body.data?.shortUrl);
} else {
  console.log('body:', JSON.stringify(sf.body, null, 2));
}

// ── 2. GET products by seller ────────────────────────────────────────────────
console.log('\n=== 2. GET /api/catalog/v1/sellers/:id/products ===');
const pr = await get(`/api/catalog/v1/sellers/${SELLER}/products`);
console.log(`status: ${pr.status}`);
if (pr.status === 200) {
  check('seller.shareUrl', pr.body.seller?.shareUrl);
} else {
  console.log('body:', JSON.stringify(pr.body, null, 2));
}

// ── 3. POST share-url (no customSlug → returns current slug) ─────────────────
console.log('\n=== 3. POST /api/catalog/sellers/:id/share-url ===');
const sh = await post(`/api/catalog/sellers/${SELLER}/share-url`, { includeQR: false });
console.log(`status: ${sh.status}`);
if (sh.status === 200) {
  check('shareUrl', sh.body.data?.shareUrl);
  check('shortUrl', sh.body.data?.shortUrl);
} else {
  console.log('body:', JSON.stringify(sh.body, null, 2));
}
