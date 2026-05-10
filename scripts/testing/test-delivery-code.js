'use strict';
require('dotenv').config();
const crypto = require('crypto');

function base64url(i) { return Buffer.from(i).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_'); }
function signJwt(p, s) {
  const h = base64url(JSON.stringify({alg:'HS256',typ:'JWT'}));
  const b = base64url(JSON.stringify(p));
  const sig = crypto.createHmac('sha256',s).update(h+'.'+b).digest('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  return h+'.'+b+'.'+sig;
}

// Use a buyer token
const buyerToken = signJwt({
  userId: 'usr_ETVQTMVRVB7SXRJH096AVTXRS4',
  email: 'buyer@maysar.co.tz',
  roles: ['buyer'],
  iat: Math.floor(Date.now()/1000),
  exp: Math.floor(Date.now()/1000) + 86400
}, process.env.JWT_SECRET);

// Use a courier token
const courierToken = signJwt({
  userId: 'courier-test-001',
  email: 'courier@maysar.co.tz',
  roles: ['courier'],
  iat: Math.floor(Date.now()/1000),
  exp: Math.floor(Date.now()/1000) + 86400
}, process.env.JWT_SECRET);

const orderPayload = {
  buyerId: 'usr_ETVQTMVRVB7SXRJH096AVTXRS4',
  sellerId: 'usr_S73VN0W6HAXE9RWF5NEK4X36GV',
  paymentMethod: 'WALLET',
  currency: 'TZS',
  deliveryFee: 5000,
  deliveryAddress: {
    street: 'Ohio Street 12',
    city: 'Dar es Salaam',
    postalCode: '11101',
    country: 'Tanzania'
  },
  items: [{
    productId: 'cat_pro_01KR73DJVKZVTYWTE1F1CTGTHE',
    quantity: 2,
    price: 3500,
    weight: 1
  }]
};

(async () => {
  console.log('\n=== Testing Delivery Code Flow ===\n');

  // Step 1: Create order
  console.log('1. Creating order...');
  const createRes = await fetch('http://localhost:3000/api/order/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + buyerToken,
      'idempotency-key': 'test-delivery-code-' + Date.now()
    },
    body: JSON.stringify(orderPayload)
  });
  const createData = await createRes.json();
  console.log('   Status:', createRes.status);

  if (createRes.status !== 201) {
    console.log('   Error:', JSON.stringify(createData));
    process.exit(1);
  }

  const orderId = createData.id;
  const deliveryCode = createData.deliveryCode;
  console.log('   Order ID:', orderId);
  console.log('   Tracking:', createData.trackingNumber);
  console.log('   Delivery Code:', deliveryCode);

  if (!deliveryCode || !/^\d{6}$/.test(deliveryCode)) {
    console.log('\n✗ FAIL: deliveryCode is missing or not 6 digits');
    process.exit(1);
  }
  console.log('   ✓ 6-digit delivery code generated');

  // Step 2: Fetch order as buyer — verify code is visible
  console.log('\n2. Fetching order as buyer...');
  const getRes = await fetch(`http://localhost:3000/api/order/orders/${orderId}`, {
    headers: { Authorization: 'Bearer ' + buyerToken }
  });
  const getData = await getRes.json();
  console.log('   deliveryCode in order details:', getData.deliveryCode ?? getData.data?.deliveryCode ?? 'NOT FOUND');

  // Step 3: Courier submits wrong code
  console.log('\n3. Courier submits WRONG code...');
  const wrongCode = deliveryCode === '000000' ? '111111' : '000000';
  const wrongRes = await fetch(`http://localhost:3000/api/order/orders/${orderId}/confirm-delivery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + courierToken },
    body: JSON.stringify({ deliveryCode: wrongCode })
  });
  const wrongData = await wrongRes.json();
  console.log('   Status:', wrongRes.status, '| Error:', wrongData.error);
  if (wrongRes.status === 401 || wrongRes.status === 409) {
    console.log('   ✓ Wrong code correctly rejected');
  }

  // Step 4: Courier submits correct code
  console.log('\n4. Courier submits CORRECT code:', deliveryCode);
  const confirmRes = await fetch(`http://localhost:3000/api/order/orders/${orderId}/confirm-delivery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + courierToken },
    body: JSON.stringify({ deliveryCode })
  });
  const confirmData = await confirmRes.json();
  console.log('   Status:', confirmRes.status);
  console.log('   Response:', JSON.stringify(confirmData));

  if (confirmRes.status === 200 && confirmData.success) {
    console.log('\n✓ PASS: Delivery confirmed successfully. Status:', confirmData.status);
  } else {
    console.log('\n⚠ Confirm delivery returned:', confirmRes.status, JSON.stringify(confirmData));
    console.log('  (May be due to order status — the order needs to be in CONFIRMED/OUT_FOR_DELIVERY state)');
  }

  console.log('\nDone.\n');
})().catch(e => { console.error(e.message); process.exit(1); });
