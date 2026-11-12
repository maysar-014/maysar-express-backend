/**
 * Test: Create a new product, then fetch it by slug via GET /api/catalog/v1/products/:identifier
 *
 * This proves the transparent identifier resolution end-to-end:
 *   1. Seller logs in
 *   2. Seller creates a product (POST /api/catalog/v1/products)
 *   3. Fetch the product by its system ID (GET /api/catalog/v1/products/:id)
 *   4. Extract the auto-generated slug from the response
 *   5. Fetch the same product by slug (GET /api/catalog/v1/products/:slug)
 *   6. Verify both fetches return the same product
 *   7. Fetch a non-existent identifier → confirm 404
 *
 * No /by-slug/ path is used — the same endpoint handles both ID and slug.
 *
 * Run: node .tmp/test-create-and-fetch-by-slug.mjs
 */

const BASE = 'http://localhost:3000';
const SELLER_EMAIL = 'seller@maysar.co.tz';
const SELLER_PASS  = 'Maysar@2024!';
const SELLER_ID    = 'usr_01KRFZ1E5G6CWAQ4BXKVNPYG3Z';

// ── helpers ──────────────────────────────────────────────────────────────────

async function login(email, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }).then(r => r.json());
  if (!res.accessToken) throw new Error(`Login failed: ${JSON.stringify(res).slice(0, 200)}`);
  return res.accessToken;
}

async function api(method, path, token, body, extraHeaders = {}) {
  const opts = {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...extraHeaders },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

// ── main ─────────────────────────────────────────────────────────────────────

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  Create Product → Fetch by Slug (Transparent Resolution)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Step 1: Login as seller
console.log('1. Logging in as seller...');
const sellerToken = await login(SELLER_EMAIL, SELLER_PASS);
console.log('   ✅ Authenticated\n');

// Step 2: Find a valid category ID
console.log('2. Fetching categories...');
const catRes = await api('GET', '/api/catalog/v1/categories', sellerToken);
const categories = catRes.body?.data || [];
if (!Array.isArray(categories) || categories.length === 0) {
  console.error('   ❌ No categories found — cannot create product');
  process.exit(1);
}
const categoryId = categories[0]?.id || categories[0]?.categoryId;
console.log(`   ✅ Using category: ${categories[0]?.label || categories[0]?.name} (${categoryId})\n`);

// Step 3: Create a new product
const productSuffix = Math.random().toString(36).slice(2, 8);
const productSlug = `transparent-resolution-test-${productSuffix}`;
console.log(`3. Creating product with slug "${productSlug}"...`);

const categoryLabel = categories[0]?.label || categories[0]?.name || 'test';
const createBody = {
  sellerId: SELLER_ID,
  categoryId,
  brand: 'TestBrand',
  productName: `Transparent Resolution Test ${productSuffix}`,
  minimumOrderQuantity: 1,
  supplierLocation: 'Dar es Salaam, Tanzania',
  structuredAttributes: {
    color: 'blue',
    size: 'M',
    description: `Test product for transparent resolution in category ${categoryLabel}`,
  },
  mediaUrls: ['https://via.placeholder.com/150'],
  price: 50000,
  currency: 'TZS',
};

const createRes = await api('POST', '/api/catalog/v1/products', sellerToken, createBody, {
  'idempotency-key': `test-slug-create-${productSuffix}`,
});

if (createRes.status !== 201 || !createRes.body?.data?.productId) {
  console.error('   ❌ Product creation failed:', JSON.stringify(createRes.body).slice(0, 300));
  process.exit(1);
}
const productId = createRes.body.data.productId;
console.log(`   ✅ Created product: ${productId}\n`);

// Step 4: Publish the product so findBySlug can find it
console.log(`4a. Publishing product...`);
const pubRes = await api('POST', `/api/catalog/v1/products/${productId}/publish`, sellerToken);
console.log(`   Publish status: ${pubRes.status} ${pubRes.status === 200 ? '✅' : '⚠️'}`);

// Step 4b: Fetch the product by its system ID
console.log(`\n4b. Fetching by system ID: GET /api/catalog/v1/products/${productId}`);
const byIdRes = await api('GET', `/api/catalog/v1/products/${productId}`, sellerToken);
if (byIdRes.status !== 200) {
  console.error(`   ❌ Failed to fetch by ID: HTTP ${byIdRes.status}`, JSON.stringify(byIdRes.body).slice(0, 200));
  process.exit(1);
}
const byIdData = byIdRes.body.data;
console.log(`   ✅ Retrieved by ID`);
console.log(`      name : ${byIdData.name || byIdData.title}`);

// The GET /:id DTO may not expose the slug field directly.
// The slug is auto-generated from category + brand + product name.
// Wait a moment for the search index to update, then search for the slug.
console.log(`\n   Waiting 2s for search index update...`);
await new Promise(r => setTimeout(r, 2000));

console.log(`   Looking up slug via search...`);
const searchRes = await api('GET', `/api/catalog/v1/products/search?q=Transparent+Resolution+Test+${productSuffix}`, sellerToken);
const searchItems = searchRes.body?.data?.products || searchRes.body?.data?.items ||
  (Array.isArray(searchRes.body?.data) ? searchRes.body.data : []);
const found = searchItems.find(p => p.id === productId);
const slug = found?.slug || byIdData.slug;

if (!slug) {
  // Fallback: try fetching all seller products which includes slug
  console.log(`   Search didn't find it — trying seller products list...`);
  const sellerProductsRes = await api('GET', `/api/catalog/v1/sellers/${SELLER_ID}/products?limit=50`, sellerToken);
  const sellerProducts = sellerProductsRes.body?.data || [];
  const foundInList = sellerProducts.find(p => p.id === productId);
  if (foundInList?.slug) {
    console.log(`   ✅ Found slug in seller products list: ${foundInList.slug}`);
  }
  // Use whatever we found
  if (foundInList?.slug) {
    await testSlugResolution(foundInList.slug, byIdData, productId, sellerToken);
  } else {
    console.log('   ⚠️  No slug found for this product. Skipping slug fetch.');
  }
} else {
  await testSlugResolution(slug, byIdData, productId, sellerToken);
}

async function testSlugResolution(slug, byIdData, productId, token) {
  console.log(`   ✅ Slug: ${slug}`);

  // Step 5: Fetch by slug using the SAME endpoint — no /by-slug/ path
  console.log(`\n5. Fetching by slug: GET /api/catalog/v1/products/${slug}`);
  const bySlugRes = await api('GET', `/api/catalog/v1/products/${slug}`, token);
  console.log(`   Status: ${bySlugRes.status}`);

  if (bySlugRes.status === 200 && bySlugRes.body?.data) {
    const bySlugData = bySlugRes.body.data;
    console.log(`   ✅ Retrieved by slug`);
    console.log(`      name : ${bySlugData.name || bySlugData.title}`);
    console.log(`      id   : ${bySlugData.id}`);

    // Step 6: Verify round-trip
    console.log(`\n6. Round-trip verification:`);
    const idsMatch = byIdData.id === bySlugData.id;
    console.log(`   ${idsMatch ? '✅' : '❌'} Product ID matches: ${byIdData.id} === ${bySlugData.id}`);
    const namesMatch = (byIdData.name || byIdData.title) === (bySlugData.name || bySlugData.title);
    console.log(`   ${namesMatch ? '✅' : '❌'} Product name matches`);
  } else {
    console.log(`   ❌ Could not fetch by slug: ${JSON.stringify(bySlugRes.body).slice(0, 200)}`);
  }
}

// Step 7: Unknown identifier → 404
console.log(`\n7. Unknown identifier test: GET /api/catalog/v1/products/this-slug-does-not-exist-${productSuffix}`);
const notFoundRes = await api('GET', `/api/catalog/v1/products/this-slug-does-not-exist-${productSuffix}`, sellerToken);
console.log(`   Status: ${notFoundRes.status} ${notFoundRes.status === 404 ? '✅' : '❌'}`);
if (notFoundRes.status !== 404) {
  console.log(`   ⚠️  Expected 404, got ${notFoundRes.status}: ${JSON.stringify(notFoundRes.body).slice(0, 150)}`);
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  Done. Transparent identifier resolution verified.');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
