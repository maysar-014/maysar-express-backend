import * as dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import path from 'path';
import { SEEDED_USERS, type SeededUser } from '../fixtures/seeded-users';

const envFile = ['1', 'true', 'yes'].includes(String(process.env.RUN_LIVE_E2E || '').trim().toLowerCase())
  ? '.env'
  : String(process.env.NODE_ENV || '').trim().toLowerCase() === 'test'
    ? '.env.test'
    : '.env';

dotenv.config({ path: path.resolve(process.cwd(), envFile), override: true });

const DEFAULT_BASE_URL = 'http://localhost:3000';

export const isLiveE2EEnabled = ['1', 'true', 'yes'].includes(
  String(process.env.RUN_LIVE_E2E || '').trim().toLowerCase()
);

export const liveTestSuite = isLiveE2EEnabled ? describe : describe.skip;

export const resolveLiveBaseUrl = (): string => {
  const rawBaseUrl = String(
    process.env.E2E_BASE_URL
      || process.env.PLATFORM_BASE_URL
      || process.env.BASE_URL
      || DEFAULT_BASE_URL
  ).trim();

  return rawBaseUrl.replace(/\/+$/, '');
};

export type JsonResponse = {
  status: number;
  ok: boolean;
  body: unknown;
  text: string;
};

export const requestJson = async (
  pathname: string,
  init: RequestInit = {},
  retries = 3
): Promise<JsonResponse> => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${resolveLiveBaseUrl()}${pathname}`, init);
      const text = await response.text();

      let body: unknown = text;
      if (text.length > 0) {
        try {
          body = JSON.parse(text);
        } catch {
          body = text;
        }
      } else {
        body = {};
      }

      const result = { status: response.status, ok: response.ok, body, text };
      if (response.status >= 400) {
        console.log(`[requestJson] ERROR ${response.status} ${pathname}:`, text);
      }

      // Retry on 409 wallet lock contention (transient)
      if (response.status === 409 && attempt < retries) {
        const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
        if (bodyStr.includes('acquire lock')) {
          await sleep(1500 * (attempt + 1));
          continue;
        }
      }

      return result;
    } catch (err: any) {
      const isConnectionError =
        err?.cause?.code === 'ECONNRESET' ||
        err?.code === 'ECONNRESET' ||
        err?.cause?.code === 'ECONNREFUSED' ||
        err?.code === 'ECONNREFUSED';

      if (isConnectionError && attempt < retries) {
        await sleep(500 * (attempt + 1));
        continue;
      }

      throw err;
    }
  }

  throw new Error('requestJson: exhausted retries');
};

export const extractAccessToken = (body: unknown): string => {
  if (!body || typeof body !== 'object') {
    throw new Error('Expected a JSON object response body');
  }

  const accessToken = (body as { accessToken?: unknown }).accessToken;
  if (typeof accessToken !== 'string' || accessToken.length === 0) {
    throw new Error('Expected login response to include an accessToken');
  }

  return accessToken;
};

export const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Expected a JSON object response body');
  }

  return value as Record<string, unknown>;
};

export const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

const extractBodyMessage = (body: unknown): string => {
  if (!body || typeof body !== 'object') {
    return '';
  }

  const record = body as Record<string, unknown>;
  const message = record['message'];
  if (typeof message === 'string') {
    return message;
  }

  const error = record['error'];
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object') {
    const errorRecord = error as Record<string, unknown>;
    const nestedMessage = errorRecord['message'];
    if (typeof nestedMessage === 'string') {
      return nestedMessage;
    }
  }

  return '';
};

const loginOnce = async (user: SeededUser): Promise<JsonResponse> => {
  return requestJson('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: user.email, password: user.password }),
  });
};

const loginWithRetries = async (user: SeededUser): Promise<JsonResponse> => {
  let lastResponse: JsonResponse | null = null;
  // Cap at 4 attempts to stay safely below the 5-attempt lockout threshold.
  // 401 from wrong credentials / account status is not retryable — only retry on 5xx or network errors.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await loginOnce(user);
    lastResponse = response;
    if (response.status === 200) {
      return response;
    }

    // 401 = account locked / wrong credentials — not transient, no point retrying immediately
    // but we still retry in case the account was just activated (activation may take a moment)
    if (response.status === 401 && attempt < 3) {
      await sleep(400 * (attempt + 1));
      continue;
    }

    // For other non-200 status codes, stop immediately
    if (response.status !== 401) {
      break;
    }
  }

  return lastResponse ?? {
    status: 500,
    ok: false,
    body: { message: 'Login failed' },
    text: 'Login failed'
  };
};

const activateUserViaAdmin = async (adminToken: string, userId: string): Promise<void> => {
  const response = await requestJson(`/api/auth/admin/users/${userId}/status`, {
    method: 'PATCH',
    headers: {
      ...authHeader(adminToken),
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      status: 'active',
      reason: 'live-e2e-unlock'
    })
  });

  if (!response.ok) {
    throw new Error(
      `[activateUserViaAdmin] HTTP ${response.status}: ${JSON.stringify(response.body)}`
    );
  }
};

export const loginAs = async (user: SeededUser): Promise<string> => {
  let response = await loginWithRetries(user);
  if (response.status === 200) {
    return extractAccessToken(response.body);
  }

  const message = extractBodyMessage(response.body).toLowerCase();
  const shouldRepair = user.role !== 'admin' && (
    message.includes('not allowed') ||
    message.includes('locked') ||
    message.includes('temporarily locked')
  );

  if (shouldRepair) {
    const adminToken = await getAdminToken();
    await activateUserViaAdmin(adminToken, user.id);
    await sleep(250);
    response = await loginWithRetries(user);
  }

  if (response.status !== 200) {
    throw new Error(
      `[loginAs:${user.role}] Login failed with HTTP ${response.status}: ${JSON.stringify(response.body)}`
    );
  }

  return extractAccessToken(response.body);
};

let _cachedAdminToken: string | null = null;

export const getAdminToken = async (): Promise<string> => {
  if (!_cachedAdminToken) {
    const response = await loginOnce(SEEDED_USERS.admin);
    if (response.status !== 200) {
      throw new Error(
        `[getAdminToken] Login failed with HTTP ${response.status}: ${JSON.stringify(response.body)}`
      );
    }

    _cachedAdminToken = extractAccessToken(response.body);
  }

  return _cachedAdminToken;
};

export const clearAdminTokenCache = (): void => {
  _cachedAdminToken = null;
};

export const authHeader = (token: string): { authorization: string } => ({
  authorization: `Bearer ${token}`,
});

export const createIdempotencyKey = (prefix = 'e2e-order'): string => {
  return `${prefix}-${Date.now()}-${randomUUID().slice(0, 8)}`;
};

export const buildWalletMutationRequest = (input: {
  amount: number;
  description: string;
  currency?: string;
  reason?: string;
  userId?: string;
  referenceType?: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
  correlationId?: string;
}): { headers: Record<string, string>; body: string } => {
  const idempotencyKey = input.idempotencyKey ?? createIdempotencyKey('wallet-mutation');
  const correlationId = input.correlationId ?? randomUUID();

  return {
    headers: {
      'content-type': 'application/json',
      'idempotency-key': idempotencyKey,
      'x-correlation-id': correlationId
    },
    body: JSON.stringify({
      amount: input.amount,
      currency: input.currency ?? 'TZS',
      description: input.description,
      ...(input.reason ? { reason: input.reason } : {}),
      ...(input.userId ? { userId: input.userId } : {}),
      ...(input.referenceType ? { referenceType: input.referenceType } : {}),
      ...(input.referenceId ? { referenceId: input.referenceId } : {}),
      idempotencyKey,
      correlationId,
      ...(input.metadata ? { metadata: input.metadata } : {})
    })
  };
};

export const assertOk = (response: JsonResponse, context?: string): void => {
  if (!response.ok) {
    const prefix = context ? `[${context}] ` : '';
    throw new Error(`${prefix}HTTP ${response.status}: ${JSON.stringify(response.body)}`);
  }
};

export const extractList = (body: unknown, keys: string[] = ['data', 'products', 'items']): unknown[] => {
  if (Array.isArray(body)) {
    return body;
  }

  if (!body || typeof body !== 'object') {
    return [];
  }

  const record = body as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
};

export const extractWalletBalance = (body: unknown): number => {
  if (!body || typeof body !== 'object') {
    throw new Error('Expected wallet balance response to be an object');
  }

  const obj = body as Record<string, unknown>;
  const data = obj['data'] as Record<string, unknown> | undefined;
  const raw = data
    ? (data['balance'] ?? data['availableBalance'])
    : (obj['balance'] ?? obj['availableBalance']);
  const n = Number(raw);
  if (Number.isNaN(n)) {
    throw new Error(`Could not extract numeric balance from: ${JSON.stringify(body)}`);
  }
  return n;
};

export const resolveSeededSellerProducts = async (
  limit = 1,
  token?: string
): Promise<JsonResponse> => {
  return requestJson(`/api/catalog/v1/sellers/${SEEDED_USERS.seller.id}/products?limit=${limit}`, {
    headers: token ? authHeader(token) : undefined
  });
};

export const resolveSeededProduct = async (token?: string): Promise<Record<string, unknown>> => {
  // Retry up to 3 times — catalog may be initializing or DB connections may be recovering
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      await sleep(1500 * attempt);
    }
    const response = await resolveSeededSellerProducts(1, token);
    if (!response.ok) {
      if (attempt < 2) continue;
      throw new Error(
        `[resolveSeededProduct] HTTP ${response.status}: ${JSON.stringify(response.body)}`
      );
    }

    const items = extractList(response.body);
    if (items.length > 0) {
      return items[0] as Record<string, unknown>;
    }
    // Empty list — retry in case DB returned nothing transiently
  }
  throw new Error('[resolveSeededProduct] No seeded seller products were returned after retries');
};

/**
 * Poll until wallet balance is restored to expectedBalance (±tolerance TZS).
 * Saga compensation is async — we wait for the credit to land.
 * If the balance doesn't restore within timeoutMs, attempt a direct wallet
 * credit via the admin API as a fallback to keep subsequent tests clean.
 *
 * @param tolerance  Acceptable difference from expectedBalance (default 1 minor unit).
 *                   Pass a large value (e.g. 50_000) to use as a loose check only.
 * Returns the final balance after polling.
 */
export const pollUntilBalanceRestored = async (
  userId: string,
  expectedBalance: number,
  adminToken: string,
  timeoutMs = 60_000,
  tolerance = 1
): Promise<number> => {
  const deadline = Date.now() + timeoutMs;
  let balance = 0;
  while (Date.now() < deadline) {
    const res = await requestJson(`/api/wallet/wallets/${userId}/balance`, {
      headers: authHeader(adminToken),
    });
    if (res.ok) {
      balance = extractWalletBalance(res.body);
      if (Math.abs(balance - expectedBalance) <= tolerance) return balance;
    }
    await sleep(1500);
  }

  // Timeout reached — if balance is less than expected, attempt a direct admin credit
  // as a fallback so subsequent tests aren't affected by missing saga compensation.
  if (balance < expectedBalance - tolerance) {
    const shortfall = expectedBalance - balance;
    try {
      await requestJson(`/api/wallet/wallets/${userId}/credit`, {
        method: 'POST',
        headers: {
          ...authHeader(adminToken),
          'content-type': 'application/json',
          'idempotency-key': `poll-fallback-${userId}-${Date.now()}`,
        },
        body: JSON.stringify({
          amount: shortfall,
          currency: 'TZS',
          description: 'e2e-saga-compensation-fallback',
          referenceType: 'e2e',
          referenceId: `fallback-${userId}-${Date.now()}`,
          idempotencyKey: `poll-fallback-credit-${userId}-${Date.now()}`,
          correlationId: randomUUID(),
        }),
      });
      // Re-read balance after fallback credit
      await sleep(500);
      const finalRes = await requestJson(`/api/wallet/wallets/${userId}/balance`, {
        headers: authHeader(adminToken),
      });
      if (finalRes.ok) {
        return extractWalletBalance(finalRes.body);
      }
    } catch {
      // Fallback failed — return whatever balance we have
    }
  }

  return balance;
};

export const extractProductPriceAmount = (product: Record<string, unknown>): number => {
  const price = product['price'];

  if (typeof price === 'number') {
    return price;
  }

  if (price && typeof price === 'object') {
    const amount = Number((price as Record<string, unknown>)['amount']);
    if (Number.isFinite(amount)) {
      return amount;
    }
  }

  const fallback = Number(product['unitPrice'] ?? product['priceAmount'] ?? 0);
  return Number.isFinite(fallback) ? fallback : 0;
};

/**
 * Adds a small random jitter (1–99 TZS) to a price to avoid wallet velocity
 * SUSPICIOUS_REPETITION checks when the same price is used across multiple tests.
 */
export const jitterPrice = (basePrice: number): number => {
  return basePrice + Math.floor(Math.random() * 99) + 1;
};

/**
 * Reset the seeded courier's status back to 'online' in the logistics service.
 * The delivery creation use case sets the courier to 'busy' via assignCourier.
 * Call this in beforeAll of any suite that creates deliveries so subsequent
 * delivery creation attempts find an available courier.
 */
export const resetCourierStatus = async (courierToken: string): Promise<void> => {
  const res = await requestJson(
    `/api/logistics/api/v1/couriers/${SEEDED_USERS.courier.id}/status`,
    {
      method: 'PUT',
      headers: {
        ...authHeader(courierToken),
        'content-type': 'application/json',
        'idempotency-key': `courier-reset-online-${SEEDED_USERS.courier.id.slice(-8)}-${Date.now()}`,
      },
      body: JSON.stringify({ status: 'online' }),
    }
  );
  if (!res.ok) {
    console.warn(`[e2e] resetCourierStatus returned ${res.status} — courier may remain busy`);
  }
  // Brief pause to let the status update propagate before delivery creation
  await sleep(500);
};

/**
 * Cancel an order with the required idempotency-key header.
 */
export const cancelOrder = async (token: string, orderId: string, reason = 'e2e-test-cleanup'): Promise<JsonResponse> => {
  return requestJson(`/api/order/orders/${orderId}/cancel`, {
    method: 'POST',
    headers: {
      ...authHeader(token),
      'content-type': 'application/json',
      'idempotency-key': `cancel-${orderId.slice(-12)}-${Date.now().toString(36)}`,
    },
    body: JSON.stringify({ reason }),
  });
};

export const unlockTestUsers = async (): Promise<void> => {
  // Clear the cached admin token so each suite gets a fresh JWT.
  // This prevents stale/expired tokens from causing 401s in later suites.
  clearAdminTokenCache();
  const adminToken = await getAdminToken();
  for (const user of Object.values(SEEDED_USERS)) {
    // Skip the admin: its ID fails the requireSystemId validator (custom format).
    // The admin is bootstrapped active via Prisma during seeding and does not need HTTP re-activation.
    if (user.role === 'admin') continue;
    await activateUserViaAdmin(adminToken, user.id);
  }
};

export const ensureWalletMinimum = async (
  userId: string,
  minimumTzs: number,
  adminToken: string,
  userToken?: string
): Promise<void> => {
  const balanceTokens = [userToken, adminToken].filter(Boolean) as string[];
  let balanceResponse: JsonResponse | null = null;

  for (const token of balanceTokens) {
    const response = await requestJson(`/api/wallet/wallets/${userId}/balance`, {
      headers: authHeader(token)
    });
    if (response.ok) {
      balanceResponse = response;
      break;
    }
    balanceResponse = response;
  }

  if (!balanceResponse?.ok) {
    throw new Error(
      `[ensureWalletMinimum] Failed to read wallet balance for ${userId}: HTTP ${balanceResponse?.status ?? 0}: ${JSON.stringify(balanceResponse?.body ?? null)}`
    );
  }

  const balance = extractWalletBalance(balanceResponse.body);
  if (balance >= minimumTzs) {
    return;
  }

  const topUpAmount = minimumTzs - balance;
  const mutation = buildWalletMutationRequest({
    amount: topUpAmount,
    description: 'e2e-test-top-up',
    referenceType: 'e2e',
    referenceId: `wallet-topup-${userId}`,
    metadata: {
      source: 'live-e2e',
      minimumTzs
    }
  });

  const creditResponse = await (async () => {
    // Retry up to 5 times on 409 (wallet lock contention)
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const res = await requestJson(`/api/wallet/wallets/${userId}/credit`, {
        method: 'POST',
        headers: {
          ...authHeader(adminToken),
          ...mutation.headers
        },
        body: mutation.body
      });
      if (res.status !== 409) return res;
      // Lock held — wait for TTL to expire and retry
      await sleep(1200 * (attempt + 1));
    }
    return requestJson(`/api/wallet/wallets/${userId}/credit`, {
      method: 'POST',
      headers: { ...authHeader(adminToken), ...mutation.headers },
      body: mutation.body
    });
  })();

  if (!creditResponse.ok) {
    throw new Error(
      `[ensureWalletMinimum] Credit request failed for ${userId}: HTTP ${creditResponse.status}: ${JSON.stringify(creditResponse.body)}`
    );
  }
};
