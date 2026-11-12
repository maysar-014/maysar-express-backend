/**
 * Probe: verify purchaseCount is present in GET /api/catalog/v1/sellers/:sellerId/products
 *
 * Run: node .tmp/probe-purchase-count.mjs
 */

const BASE      = 'http://localhost:3000';
const EMAIL     = 'seller@maysar.co.tz';
const PASSWORD  = 'Maysar@2024!';
const SELLER_ID = 'usr_01KRFZ1E5G6CWAQ4BXKVNPYG3Z';

// ── helpers ───────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function check(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

async function login(email, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }).then(r => r.json());
  if (!res.accessToken) throw new Error(`Login failed: ${JSON.stringify(res)}`);
  return res.accessToken;
}

// ── auth ──────────────────────────────────────────────────────────────────────

const token = await login(EMAIL, PASSWORD);
const headers = { Authorization: `Bearer ${token}` };
console.log('✅ Authenticated\n');

// ── 1. Fetch seller products ───────────────────────────────────────────────────

console.log(`── GET /api/catalog/v1/sellers/${SELLER_ID}/products`);
const res = await fetch(`${BASE}/api/catalog/v1/sellers/${SELLER_ID}/products?status=published&limit=5`, { headers });
const body = await res.json();

check('HTTP 200', res.status === 200, `got ${res.status}`);

if (!body.data || !Array.isArray(body.data)) {
  console.log('  ❌ No data array in response');
  console.log('  Full response:', JSON.stringify(body, null, 2).slice(0, 500));
  process.exit(1);
}

check('Returns products', body.data.length > 0, `got ${body.data.length} products`);

const sample = body.data[0];

// ── 2. Check every expected field ─────────────────────────────────────────────

console.log('\n── Field presence on first product:');

check('id',             typeof sample.id === 'string');
check('name',           typeof sample.name === 'string');
check('price.amount',   typeof sample.price?.amount === 'number');
check('price.currency', typeof sample.price?.currency === 'string');
check('categoryId',     typeof sample.categoryId === 'string');
check('sellerId',       typeof sample.sellerId === 'string');
check('status',         typeof sample.status === 'string');
check('createdAt',      !!sample.createdAt);
check('inventoryStatus',typeof sample.inventoryStatus === 'string', `got ${sample.inventoryStatus}`);
check('codAccepted',    typeof sample.codAccepted === 'boolean', `got ${sample.codAccepted}`);
check('freeDelivery',   typeof sample.freeDelivery === 'boolean', `got ${sample.freeDelivery}`);
check('tags',           Array.isArray(sample.tags));
check('mediaUrls',      Array.isArray(sample.mediaUrls));

// The key new field
check('purchaseCount present',     'purchaseCount' in sample,                 `field missing`);
check('purchaseCount is number',   typeof sample.purchaseCount === 'number',  `got ${typeof sample.purchaseCount}: ${sample.purchaseCount}`);
check('purchaseCount >= 0',        sample.purchaseCount >= 0,                 `got ${sample.purchaseCount}`);

// Optional but expected fields
if (sample.campaign !== undefined) {
  check('campaign.discountPercentage', typeof sample.campaign?.discountPercentage === 'number' || sample.campaign === null);
}
if (sample.compareAtPrice !== undefined) {
  check('compareAtPrice is number or null', sample.compareAtPrice === null || typeof sample.compareAtPrice === 'number');
}

// ── 3. Print a few products with their purchaseCount ──────────────────────────

console.log('\n── Purchase counts across first 5 products:');
for (const p of body.data) {
  const count = p.purchaseCount ?? '(missing)';
  const campaign = p.campaign ? `🏷 ${p.campaign.discountPercentage}% off` : '';
  console.log(`  ${p.name?.slice(0, 40).padEnd(40)} purchaseCount=${String(count).padStart(5)}  ${campaign}`);
}

// ── 4. Check seller shareUrl uses slug not raw ID ─────────────────────────────

console.log('\n── seller.shareUrl check:');
const shareUrl = body.seller?.shareUrl ?? '';
check('seller.shareUrl present',       !!shareUrl,                   `missing`);
check('shareUrl uses slug (no usr_)',   !shareUrl.includes('usr_'),   `got: ${shareUrl}`);
check('shareUrl pattern',              /\/seller\/[a-z0-9][a-z0-9-]*$/.test(shareUrl), `got: ${shareUrl}`);

// ── 5. Pagination meta ─────────────────────────────────────────────────────────

console.log('\n── Pagination meta:');
const pg = body.meta?.pagination;
check('meta.pagination present',  !!pg);
check('pagination.total >= 0',    typeof pg?.total === 'number' && pg.total >= 0, `got ${pg?.total}`);
check('pagination.page',          typeof pg?.page === 'number');
check('pagination.hasNext',       typeof pg?.hasNext === 'boolean');

// ── Summary ────────────────────────────────────────────────────────────────────

console.log(`\n─────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed === 0) {
  console.log('✅ purchaseCount and all expected fields are present.\n');
} else {
  console.log('❌ Some checks failed — see above.\n');
  process.exit(1);
}
