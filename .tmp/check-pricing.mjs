import 'dotenv/config';
import pg from 'pg';
const { Client } = pg;

const c = new Client({ connectionString: process.env.DATABASE_URL });
await c.connect();

// Check pricing config
const pricing = await c.query('SELECT id, version, "isActive", "createdAt" FROM "logistics_PricingConfig" ORDER BY version DESC LIMIT 3').catch(() => null);
if (pricing) {
  console.log('\n=== Pricing Config ===');
  console.log('Rows:', pricing.rows.length);
  for (const r of pricing.rows) {
    console.log(` id: ${r.id} | version: ${r.version} | active: ${r.isActive} | created: ${r.createdAt}`);
  }
} else {
  console.log('No pricing config table or no rows');
}

// Check what the logistics quote endpoint actually needs — look at the actual quote request body
const quoteRes = await fetch('http://localhost:3000/api/logistics/v1/quote', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer invalid' },
  body: JSON.stringify({})
});
const quoteErr = await quoteRes.json().catch(() => null);
console.log('\n=== Quote endpoint response to empty body (auth error first) ===');
console.log('Status:', quoteRes.status);
console.log('Body:', JSON.stringify(quoteErr?.error || quoteErr?.message || quoteErr).slice(0, 200));

// Check business address structure — look at the seller's existing business
const biz = await c.query(`
  SELECT b.id, b.name, b."ownerId", ba.id as addr_id, ba.street, ba.city, ba.region, 
         ba."postalCode", ba.country, ba."isPrimary"
  FROM "businessregistry_businesses" b
  JOIN "businessregistry_business_addresses" ba ON ba."businessId" = b.id
  WHERE b."ownerId" = 'usr_01KRFZ1E5G6CWAQ4BXKVNPYG3Z'
  LIMIT 5
`).catch(e => { console.error('biz query:', e.message); return null; });

if (biz && biz.rows.length > 0) {
  console.log('\n=== Seller Business Addresses ===');
  for (const r of biz.rows) {
    console.log(JSON.stringify(r, null, 2));
  }
} else {
  console.log('\n=== No seller business addresses found ===');
}

// Check product locations (supplierLocation fields)
const products = await c.query(`
  SELECT id, title, "sellerId", "supplierLocationId", "supplierLocation", slug, status
  FROM "catalog_products"
  WHERE "sellerId" = 'usr_01KRFZ1E5G6CWAQ4BXKVNPYG3Z'
  LIMIT 3
`).catch(e => { console.error('products query:', e.message); return null; });

if (products && products.rows.length > 0) {
  console.log('\n=== Sample Seller Products ===');
  for (const r of products.rows) {
    console.log(JSON.stringify(r));
  }
}

await c.end();
