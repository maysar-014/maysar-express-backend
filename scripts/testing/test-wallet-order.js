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

// Use a buyer who has a wallet
const BUYER_ID = 'usr_01KM0YNDM5RAY2R2YT96DK5P4B';
const token = signJwt({
  userId: BUYER_ID,
  email: 'wallet-buyer@maysar.co.tz',
  roles: ['buyer'],
  iat: Math.floor(Date.now()/1000),
  exp: Math.floor(Date.now()/1000) + 86400
}, process.env.JWT_SECRET);

const BASE = 'http://localhost:3000';

async function getWalletBalance() {
  const res = await fetch(`${BASE}/api/wallet/wallets/${BUYER_ID}/balance`, {
    headers: { Authorization: 'Bearer ' + token }
  });
  const data = await res.json();
  return data?.availableBalance ?? data?.balance ?? JSON.stringify(data);
}

(async () => {
  console.log('\n=== Testing Wallet + Order Integration ===\n');

  // Step 1: Check initial balance
  const balanceBefore = await getWalletBalance();
  console.log('1. Wallet balance before order:', balanceBefore, 'TZS');

  // Step 2: Place WALLET order
  console.log('\n2. Placing WALLET order...');
  const orderRes = await fetch(`${BASE}/api/order/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
      'idempotency-key': 'wallet-test-' + Date.now()
    },
    body: JSON.stringify({
      buyerId: BUYER_ID,
      sellerId: 'usr_S73VN0W6HAXE9RWF5NEK4X36GV',
      paymentMethod: 'WALLET',
      currency: 'TZS',
      deliveryAddress: { street: 'Ohio Street', city: 'Dar es Salaam', postalCode: '11101', country: 'Tanzania' },
      items: [{ productId: 'cat_pro_01KR73DJVKZVTYWTE1F1CTGTHE', quantity: 1, price: 3500, weight: 1 }]
    })
  });

  const orderData = await orderRes.json();
  console.log('   Status:', orderRes.status);

  if (orderRes.status === 201) {
    console.log('   Order ID:', orderData.id);
    console.log('   Tracking:', orderData.trackingNumber);
    console.log('   Payment method:', orderData.paymentMethod);
    console.log('   Delivery code:', orderData.deliveryCode);

    // Wait for saga to process
    await new Promise(r => setTimeout(r, 3000));

    // Step 3: Check balance after
    const balanceAfter = await getWalletBalance();
    console.log('\n3. Wallet balance after order:', balanceAfter, 'TZS');

    if (balanceBefore !== balanceAfter) {
      console.log('\n✓ PASS: Wallet was debited. Difference:', Number(balanceBefore) - Number(balanceAfter), 'TZS');
    } else {
      console.log('\n⚠ Balance unchanged — saga may not have processed yet or wallet debit failed');
      console.log('  Check server logs for [WalletServiceClient] or PaymentSaga errors');
    }
  } else {
    console.log('   Error:', JSON.stringify(orderData));
  }

  console.log('\nDone.\n');
})().catch(e => { console.error(e.message); process.exit(1); });
