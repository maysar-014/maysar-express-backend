// Test transparent identifier resolution — GET /api/catalog/v1/products/:identifier
// accepts either a system ID or a URL slug in the same parameter.
// No /by-slug/ path needed or supported.

const searchRes = await fetch('http://localhost:3000/api/catalog/v1/products/search?q=Samsung');
const searchData = await searchRes.json();
const products = searchData?.data?.items || searchData?.data?.products ||
  (Array.isArray(searchData?.data) ? searchData.data : []);

console.log(`Found ${products.length} products in search`);
if (products.length > 0) {
  const firstProduct = products[0];
  const slug = firstProduct.slug;
  const id   = firstProduct.id;

  console.log('Product:', firstProduct.name || firstProduct.title);
  console.log('  ID  :', id);
  console.log('  Slug:', slug);

  // Fetch by system ID
  const byIdRes = await fetch(`http://localhost:3000/api/catalog/v1/products/${id}`);
  console.log(`\nGET /api/catalog/v1/products/${id}  (by ID)`);
  console.log('Status:', byIdRes.status);
  const byIdData = await byIdRes.json();
  console.log(byIdData.success ? '✅ resolved by ID' : '❌ ' + JSON.stringify(byIdData.error));

  // Fetch by slug — same endpoint, no extra path segment
  if (slug) {
    const bySlugRes = await fetch(`http://localhost:3000/api/catalog/v1/products/${slug}`);
    console.log(`\nGET /api/catalog/v1/products/${slug}  (by slug)`);
    console.log('Status:', bySlugRes.status);
    const bySlugData = await bySlugRes.json();
    console.log(bySlugData.success ? '✅ resolved by slug' : '❌ ' + JSON.stringify(bySlugData.error));

    if (byIdData.data?.id && bySlugData.data?.id) {
      const match = byIdData.data.id === bySlugData.data.id;
      console.log(`\nRound-trip: ${match ? '✅ same product ID' : '❌ ID mismatch'}`);
    }
  } else {
    console.log('\n⚠️  Product has no slug — slug resolution skipped');
  }
}

// Unknown identifier → 404
const notFoundRes = await fetch('http://localhost:3000/api/catalog/v1/products/this-product-does-not-exist');
console.log('\nGET /api/catalog/v1/products/this-product-does-not-exist  (unknown)');
console.log('Status:', notFoundRes.status, '(expected 404)');
const nfData = await notFoundRes.json();
console.log(notFoundRes.status === 404
  ? `✅ 404 — ${nfData.error?.message || 'not found'}`
  : `❌ unexpected status ${notFoundRes.status}`);
