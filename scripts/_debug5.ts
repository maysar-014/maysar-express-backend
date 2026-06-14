import { requestJson, getAdminToken, loginAs, unlockTestUsers, resolveSeededProduct, ensureWalletMinimum } from '../tests/e2e/helpers/live-api';
import { SEEDED_USERS, WALLET_TOP_UP_MINIMUM } from '../tests/e2e/fixtures/seeded-users';
import { createIdempotencyKey } from '../tests/e2e/helpers/live-api';
import { jitterPrice } from '../tests/e2e/helpers/live-api';

async function run() {
  try {
    await unlockTestUsers();
    const adminToken = await getAdminToken();
    const buyerToken = await loginAs(SEEDED_USERS.buyer);
    
    let seededProductId = 'seeded-product-placeholder';
    try {
      const product = await resolveSeededProduct(buyerToken);
      seededProductId = String(product['id'] ?? product['productId'] ?? 'seeded-product-placeholder');
    } catch {
      console.log('failed to resolve seeded product');
    }

    await ensureWalletMinimum(SEEDED_USERS.buyer.id, WALLET_TOP_UP_MINIMUM, adminToken);

    // Place COD order
    const validAmount = 15000;
    const body = {
      buyerId: SEEDED_USERS.buyer.id,
      sellerId: SEEDED_USERS.seller.id,
      items: [{ productId: seededProductId, quantity: 1, price: jitterPrice(validAmount), weight: 0.5 }],
      paymentMethod: 'COD',
      deliveryAddress: {
        street: 'Uhuru Street 1',
        city: 'Dar es Salaam',
        postalCode: '11101',
        country: 'TZ',
        latitude: -6.7924,
        longitude: 39.2083,
      },
    };

    const response = await requestJson('/api/order/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${buyerToken}`,
        'content-type': 'application/json',
        'idempotency-key': createIdempotencyKey('cod-trust-cancel-1'),
      },
      body: JSON.stringify(body),
    });

    console.log('Order status:', response.status);
    console.log('Order body:', JSON.stringify(response.body, null, 2));

  } catch (err) {
    console.error(err);
  }
}

run();
