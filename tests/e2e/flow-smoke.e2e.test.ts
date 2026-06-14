import { describe, expect, it, beforeAll } from '@jest/globals';
import {
  asRecord,
  extractAccessToken,
  liveTestSuite,
  requestJson,
  unlockTestUsers
} from './helpers/live-api';

const seededUsers = {
  buyer: {
    email: 'buyer@maysar.co.tz',
    password: 'Maysar@2024!',
    id: 'usr_01KRFXQZC36NK3CDEWJJS21RP8'
  },
  seller: {
    email: 'seller@maysar.co.tz',
    password: 'Maysar@2024!',
    id: 'usr_01KRFZ1E5G6CWAQ4BXKVNPYG3Z'
  }
} as const;

const loginSeededBuyer = async (): Promise<string> => {
  const loginResponse = await requestJson('/api/auth/login', {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      email: seededUsers.buyer.email,
      password: seededUsers.buyer.password
    })
  });

  expect(loginResponse.status).toBe(200);
  return extractAccessToken(loginResponse.body);
};

liveTestSuite('Flow Docs live API smoke tests', () => {
  beforeAll(async () => {
    const healthResponse = await requestJson('/health');
    expect(healthResponse.status).toBe(200);
    await unlockTestUsers();
  });

  it('covers the auth-and-access flow against the running platform', async () => {
    const loginResponse = await requestJson('/api/auth/login', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        email: seededUsers.buyer.email,
        password: seededUsers.buyer.password
      })
    });

    expect(loginResponse.status).toBe(200);
    const accessToken = extractAccessToken(loginResponse.body);

    const verifyResponse = await requestJson('/api/auth/verify', {
      headers: {
        authorization: `Bearer ${accessToken}`
      }
    });

    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body).toEqual(
      expect.objectContaining({
        valid: true
      })
    );

    const logoutResponse = await requestJson('/api/auth/logout', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({})
    });

    expect(logoutResponse.status).toBe(200);
  });

  it('covers the customer flow with real wallet, order, and storefront APIs', async () => {
    const accessToken = await loginSeededBuyer();

    const storefrontResponse = await requestJson(
      `/api/catalog/sellers/${seededUsers.seller.id}/storefront`
    );

    expect(storefrontResponse.status).toBe(200);
    const storefront = asRecord(storefrontResponse.body);
    expect(storefront).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          id: seededUsers.seller.id,
          shareUrl: expect.stringContaining(`/seller/${seededUsers.seller.id}`),
          shortUrl: expect.any(String)
        })
      })
    );

    const walletBalanceResponse = await requestJson(
      `/api/wallet/wallets/${seededUsers.buyer.id}/balance`,
      {
        headers: {
          authorization: `Bearer ${accessToken}`
        }
      }
    );

    expect(walletBalanceResponse.status).toBe(200);
    const walletBalance = asRecord(walletBalanceResponse.body);
    expect(walletBalance).toEqual(
      expect.objectContaining({
        balance: expect.any(Number),
        currency: 'TZS'
      })
    );

    const orderSearchResponse = await requestJson(
      `/api/order/orders?buyerId=${encodeURIComponent(seededUsers.buyer.id)}&limit=5`,
      {
        headers: {
          authorization: `Bearer ${accessToken}`
        }
      }
    );

    expect(orderSearchResponse.status).toBe(200);
    const orderBody = orderSearchResponse.body as Record<string, unknown>;
    expect(Array.isArray(orderBody['orders'])).toBe(true);
    // total may be at top-level or nested under pagination
    const total = orderBody['total'] ?? (orderBody['pagination'] as Record<string, unknown> | undefined)?.['total'];
    expect(typeof total).toBe('number');
  });
});
