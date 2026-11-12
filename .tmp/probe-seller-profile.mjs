/**
 * Probe: verify the public seller profile endpoint returns contact + identity data.
 *
 * Run: node .tmp/probe-seller-profile.mjs
 */

const BASE      = 'http://localhost:3000';
const EMAIL     = 'seller@maysar.co.tz';
const PASSWORD  = 'Maysar@2024!';
const SELLER_ID = 'usr_01KRFZ1E5G6CWAQ4BXKVNPYG3Z';
const SLUG      = 'pendo-crafts';

// ── Auth ─────────────────────────────────────────────────────────────────────
const loginRes = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
}).then(r => r.json());

const token = loginRes.accessToken;
if (!token) {
  console.error('❌ Login failed:', JSON.stringify(loginRes, null, 2));
  process.exit(1);
}
console.log('✅ Authenticated\n');

const headers = { Authorization: `Bearer ${token}` };

// ── 1. Storefront (catalog) ───────────────────────────────────────────────────
console.log(`══ 1. GET /api/catalog/sellers/${SLUG}/storefront`);
const sf = await fetch(`${BASE}/api/catalog/sellers/${SLUG}/storefront`, { headers }).then(r => r.json());
console.log(`   status: ${sf.success ? '200 OK' : 'FAILED'}`);
if (sf.success) {
  const d = sf.data;
  console.log(`   id:          ${d.id}`);
  console.log(`   name:        ${d.name}`);
  console.log(`   shareUrl:    ${d.shareUrl}`);
  console.log(`   shortUrl:    ${d.shortUrl}`);
  console.log(`   products:    ${d.stats?.totalProducts}`);
  console.log(`   logo:        ${d.logo ?? '(none)'}`);
} else {
  console.log('   error:', JSON.stringify(sf.error, null, 2));
}

// ── 2. Public seller profile (business registry) ──────────────────────────────
console.log(`\n══ 2. GET /api/business-registry/public/sellers/${SELLER_ID}`);
const pr = await fetch(`${BASE}/api/business-registry/public/sellers/${SELLER_ID}`, { headers }).then(r => r.json());
console.log(`   status: ${pr.success ? '200 OK' : 'FAILED'}`);
if (pr.success) {
  const biz = pr.data?.primaryBusiness ?? pr.data;
  console.log(`   name:        ${biz?.name}`);
  console.log(`   description: ${biz?.description ?? '(none)'}`);
  console.log(`   industry:    ${JSON.stringify(biz?.industry ?? [])}`);
  console.log(`   email:       ${biz?.email ?? '(none)'}`);
  console.log(`   phone:       ${biz?.phoneNumber ?? '(none)'}`);
  console.log(`   website:     ${biz?.website ?? '(none)'}`);
  console.log(`   verified:    ${biz?.verificationStatus}`);
} else {
  console.log('   error:', JSON.stringify(pr.error, null, 2));
  console.log('   full response:', JSON.stringify(pr, null, 2).slice(0, 500));
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n══ Combined data available for storefront page:');
if (sf.success && pr.success) {
  const biz = pr.data?.primaryBusiness ?? pr.data;
  console.log('   ✅ Identity:  name, logo, description, industry');
  console.log('   ✅ Contact:   email, phone, website');
  console.log('   ✅ Share:     shareUrl, shortUrl, qrCode');
  console.log('   ✅ Stats:     totalProducts');
  if (!biz?.email && !biz?.phoneNumber && !biz?.website) {
    console.log('\n   ⚠️  No contact fields in business record yet.');
    console.log('   Update the business via PATCH /api/business-registry/businesses/{id}');
    console.log('   or re-run seed with email/phone/website values.');
  }
} else {
  console.log('   ❌ One or both calls failed — see errors above.');
}
