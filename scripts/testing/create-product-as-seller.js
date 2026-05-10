'use strict';
require('dotenv').config();
const crypto = require('crypto');

function base64url(i) {
  return Buffer.from(i).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
}
function signJwt(p, s) {
  const h = base64url(JSON.stringify({alg:'HS256',typ:'JWT'}));
  const b = base64url(JSON.stringify(p));
  const sig = crypto.createHmac('sha256',s).update(h+'.'+b).digest('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  return h+'.'+b+'.'+sig;
}

const token = signJwt({
  userId: 'usr_ETVQTMVRVB7SXRJH096AVTXRS4',
  email: 'kariakoo.seller@maysar.co.tz',
  roles: ['seller'],
  iat: Math.floor(Date.now()/1000),
  exp: Math.floor(Date.now()/1000) + 86400
}, process.env.JWT_SECRET);

const ts = Date.now();
const body = {
  sellerId: 'usr_ETVQTMVRVB7SXRJH096AVTXRS4',
  categoryId: 'ba4a908b-c682-4018-82d4-40c98a8aa3ae',
  brand: 'Azam',
  productName: 'Azam Uji wa Mtama Food Beverage Porridge ' + ts,
  minimumOrderQuantity: 5,
  supplierLocationId: 'bad_SPVREKKA7ASE8PZMHG3WBW21GR',
  price: 3500,
  currency: 'TZS',
  inventoryCount: 100,
  codAccepted: true,
  condition: 'new',
  mediaUrls: ['https://images.jumia.com.ng/unsafe/fit-in/500x500/filters:fill(white)/product/62/0b5b41/1.jpg'],
  structuredAttributes: { weight: '1kg', flavor: 'Food & Beverages Original', type: 'Porridge' }
};

(async () => {
  console.log('\n=== Creating product as Kariakoo Pantry Wholesale ===\n');

  const createRes = await fetch('http://localhost:3000/api/catalog/v1/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify(body)
  });

  const createData = await createRes.json();
  console.log('Create status :', createRes.status);

  if (!createData.success) {
    console.log('Error:', JSON.stringify(createData.error, null, 2));
    process.exit(1);
  }

  const productId = createData.data.productId;
  console.log('Product ID    :', productId);

  // Wait briefly for inventory event handler
  await new Promise(r => setTimeout(r, 1500));

  const getRes = await fetch('http://localhost:3000/api/catalog/v1/products/' + productId, {
    headers: { Authorization: 'Bearer ' + token }
  });
  const getData = await getRes.json();
  const p = getData.data;

  console.log('\n=== Product Response ===');
  console.log('Name          :', p.name);
  console.log('Status        :', p.status);
  console.log('Condition     :', p.condition);
  console.log('COD Accepted  :', p.codAccepted);
  console.log('Inventory     :', JSON.stringify(p.inventory));
  console.log('Ratings       :', JSON.stringify(p.ratings));
  console.log('Price         :', JSON.stringify(p.price));
  console.log('Category      :', p.categoryId);
})().catch(e => { console.error(e.message); process.exit(1); });
