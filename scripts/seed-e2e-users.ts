import * as dotenv from 'dotenv';
import { Prisma, PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs';
import { createClient } from 'redis';

// Load .env FIRST so DATABASE_URL is set before PrismaClient is instantiated.
dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });

type JsonBody = Record<string, unknown> | string | number | boolean | null;

/**
 * SeedUser no longer has a hardcoded `id` — the system assigns one.
 * The real assigned ID is captured after registration and written to seed-output.json.
 */
type SeedUser = {
  role: 'system' | 'buyer' | 'seller' | 'courier' | 'supplier' | 'enabler';
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  walletTarget: number;
};

/**
 * Output shape written to seed-output.json for Playwright to consume.
 */
type SeedOutput = {
  generatedAt: string;
  users: {
    role: string;
    email: string;
    id: string;
    phoneNumber: string;
  }[];
  product: {
    id: string;
    title: string;
    price: number;
    sellerId: string;
    categoryId: string;
    variantId?: string;
  } | null;
  delivery: {
    id: string;
  } | null;
};

const DEFAULT_PASSWORD = 'Maysar@2024!';
const BASE_URL = resolveBaseUrl();
// Prisma client is initialized lazily inside main() after dotenv has loaded DATABASE_URL.
let prisma: PrismaClient;
const SEED_PRODUCT_NAME = 'Maysar Seeded Demo Product';

// Seed output file — Playwright reads this to get real assigned IDs
const SEED_OUTPUT_PATH = path.resolve(process.cwd(), 'seed-output.json');

/**
 * SEED_USERS: no hardcoded IDs — the system decides.
 * Emails are stable so re-runs can look up existing accounts (409 → DB lookup).
 */
const SEED_USERS: SeedUser[] = [
  {
    role: 'system',
    email: 'admin@maysar.co.tz',
    password: DEFAULT_PASSWORD,
    firstName: 'Super',
    lastName: 'Admin',
    phoneNumber: '+255700000001',
    walletTarget: 0
  },
  {
    role: 'buyer',
    email: 'buyer@maysar.co.tz',
    password: DEFAULT_PASSWORD,
    firstName: 'Amina',
    lastName: 'Hassan',
    phoneNumber: '+255700000002',
    walletTarget: 2_000_000
  },
  {
    role: 'seller',
    email: 'seller@maysar.co.tz',
    password: DEFAULT_PASSWORD,
    firstName: 'Juma',
    lastName: 'Mwangi',
    phoneNumber: '+255700000003',
    walletTarget: 50_000
  },
  {
    role: 'supplier',
    email: 'supplier@maysar.co.tz',
    password: DEFAULT_PASSWORD,
    firstName: 'Fatuma',
    lastName: 'Ally',
    phoneNumber: '+255700000004',
    walletTarget: 0
  },
  {
    role: 'courier',
    email: 'courier@maysar.co.tz',
    password: DEFAULT_PASSWORD,
    firstName: 'Baraka',
    lastName: 'Kimani',
    phoneNumber: '+255700000005',
    walletTarget: 0
  },
  {
    role: 'enabler',
    email: 'enabler@maysar.co.tz',
    password: DEFAULT_PASSWORD,
    firstName: 'Zawadi',
    lastName: 'Omondi',
    phoneNumber: '+255700000006',
    walletTarget: 0
  }
];

function resolveBaseUrl(): string {
  const envFile = ['1', 'true', 'yes'].includes(String(process.env.RUN_LIVE_E2E || '').trim().toLowerCase())
    ? '.env'
    : String(process.env.NODE_ENV || '').trim().toLowerCase() === 'test'
      ? '.env.test'
      : '.env';

  dotenv.config({ path: path.resolve(process.cwd(), envFile), override: true });

  return String(
    process.env.E2E_BASE_URL
      || process.env.PLATFORM_BASE_URL
      || process.env.BASE_URL
      || 'http://localhost:3000'
  ).trim().replace(/\/+$/, '');
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestJson(pathname: string, init: RequestInit = {}): Promise<{
  status: number;
  ok: boolean;
  body: JsonBody;
  text: string;
}> {
  const response = await fetch(`${BASE_URL}${pathname}`, init);
  const text = await response.text();

  if (!text) {
    return { status: response.status, ok: response.ok, body: {}, text };
  }

  try {
    return { status: response.status, ok: response.ok, body: JSON.parse(text) as JsonBody, text };
  } catch {
    return { status: response.status, ok: response.ok, body: text, text };
  }
}

function asRecord(value: JsonBody): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function authHeader(token: string): { authorization: string } {
  return { authorization: `Bearer ${token}` };
}

function createIdempotencyKey(prefix = 'e2e'): string {
  return `${prefix}-${Date.now()}-${randomUUID().slice(0, 8)}`;
}

async function registerUser(user: SeedUser): Promise<string | null> {
  const response = await requestJson('/api/auth/register', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-contract-test': '1'
    },
    body: JSON.stringify({
      // No hardcoded `id` — let the system assign one
      email: user.email,
      password: user.password,
      role: user.role,
      phoneNumber: user.phoneNumber,
      firstName: user.firstName,
      lastName: user.lastName,
      profile: {
        name: `${user.firstName} ${user.lastName}`,
        requestedRole: user.role
      }
    })
  });

  if (response.status !== 201 && response.status !== 409) {
    throw new Error(`Registration failed for ${user.email}: HTTP ${response.status} ${response.text}`);
  }

  // Return the userId assigned by the user-service
  const body = asRecord(response.body);
  const userId = body['userId'];
  return typeof userId === 'string' && userId.trim() ? userId.trim() : null;
}

async function loginUser(user: SeedUser): Promise<string> {
  let lastResponse: { status: number; ok: boolean; body: JsonBody; text: string } | null = null;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const response = await requestJson('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        password: user.password
      })
    });
    lastResponse = response;

    if (response.status === 200) {
      const body = asRecord(response.body);
      const accessToken = body['accessToken'];
      if (typeof accessToken === 'string' && accessToken.trim()) {
        return accessToken;
      }
      throw new Error(`Login response for ${user.email} did not include accessToken`);
    }

    if (response.status === 401 && attempt < 7) {
      await sleep(400 * (attempt + 1));
      continue;
    }
  }

  if (lastResponse?.status === 401) {
    const adminToken = await loginAdmin();
    // Look up the real user ID from DB by email before activating
    const userRow = await prisma.user_User.findFirst({
      where: { email: user.email },
      select: { id: true }
    }).catch(() => null);
    const activateId = userRow?.id;
    if (activateId) {
      await activateUser(adminToken, activateId);
    }
    await sleep(250);
    const retry = await requestJson('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: user.password })
    });
    if (retry.status === 200) {
      const body = asRecord(retry.body);
      const accessToken = body['accessToken'];
      if (typeof accessToken === 'string' && accessToken.trim()) {
        return accessToken;
      }
    }
  }

  throw new Error(`Login failed for ${user.email}: HTTP ${lastResponse?.status ?? 0} ${lastResponse?.text ?? ''}`);
}

let cachedAdminToken: string | null = null;

async function loginAdmin(): Promise<string> {
  if (cachedAdminToken) {
    return cachedAdminToken;
  }

  const response = await requestJson('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: SEED_USERS[0].email,
      password: SEED_USERS[0].password
    })
  });

  if (response.status !== 200) {
    throw new Error(`Admin login failed: HTTP ${response.status} ${response.text}`);
  }

  const body = asRecord(response.body);
  const accessToken = body['accessToken'];
  if (typeof accessToken !== 'string' || !accessToken.trim()) {
    throw new Error('Admin login did not return an access token');
  }

  cachedAdminToken = accessToken;
  return accessToken;
}

/**
 * Directly activates the admin user via Prisma to break the circular HTTP dependency.
 * The admin cannot log in (to get a token to activate itself) until it is active,
 * so we bypass the HTTP flow for this one bootstrapping step.
 * Accepts the real DB id returned by the user-service (may differ from the seeded id).
 */
async function bootstrapAdminActivation(realAdminId: string): Promise<void> {
  await prisma.user_User.update({
    where: { id: realAdminId },
    data: { status: 'ACTIVE' as any }
  });
}

async function activateUser(adminToken: string, userId: string): Promise<void> {
  const response = await requestJson(`/api/auth/admin/users/${userId}/status`, {
    method: 'PATCH',
    headers: {
      ...authHeader(adminToken),
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      status: 'active',
      reason: 'seed-e2e-users'
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to activate ${userId}: HTTP ${response.status} ${response.text}`);
  }
}

async function ensureWalletBalance(adminToken: string, userId: string, targetBalance: number): Promise<void> {
  if (targetBalance <= 0) {
    return;
  }

  let balanceResponse = await requestJson(`/api/wallet/wallets/${userId}/balance`, {
    headers: authHeader(adminToken)
  });

  // Wallet doesn't exist yet — the UserRegistered.v1 handler may still be processing.
  // Retry a few times to give it a chance before falling back to direct Prisma creation.
  if (balanceResponse.status === 404) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      await sleep(500 * attempt);
      balanceResponse = await requestJson(`/api/wallet/wallets/${userId}/balance`, {
        headers: authHeader(adminToken)
      });
      if (balanceResponse.status !== 404) break;
    }
  }

  // Wallet doesn't exist yet — create it directly via Prisma, then retry
  if (balanceResponse.status === 404) {
    console.log(`  ↳ wallet not found for ${userId} — creating directly via Prisma`);
    try {
      const { createUlid } = await import('../shared/ids/id');
      const walletId = `wal_${createUlid()}`;
      await (prisma as any).wallet_Wallet.create({
        data: {
          id: walletId,
          userId,
          balance: new Prisma.Decimal(0),
          currency: 'TZS',
          status: 'ACTIVE',
          frozenAmount: new Prisma.Decimal(0),
          version: 0,
        }
      });
      console.log(`  ↳ wallet created (id: ${walletId})`);
      // Re-fetch balance
      balanceResponse = await requestJson(`/api/wallet/wallets/${userId}/balance`, {
        headers: authHeader(adminToken)
      });
    } catch (createErr: any) {
      console.warn(`  ↳ wallet creation failed: ${createErr?.message?.split('\n')[0]}`);
      return;
    }
  }

  if (!balanceResponse.ok) {
    throw new Error(`Failed to read wallet balance for ${userId}: HTTP ${balanceResponse.status} ${balanceResponse.text}`);
  }

  const body = asRecord(balanceResponse.body);
  const rawBalance = body['balance'] ?? body['availableBalance'] ?? (asRecord(body['data'] as JsonBody)['balance']) ?? 0;
  const balance = Number(rawBalance);
  if (Number.isNaN(balance)) {
    throw new Error(`Unable to parse wallet balance for ${userId}: ${balanceResponse.text}`);
  }

  if (balance >= targetBalance) {
    return;
  }

  const idempotencyKey = createIdempotencyKey(`sw-${userId.slice(-12)}`);
  const correlationId = randomUUID();

  const creditResponse = await requestJson(`/api/wallet/wallets/${userId}/credit`, {
    method: 'POST',
    headers: {
      ...authHeader(adminToken),
      'content-type': 'application/json',
      'idempotency-key': idempotencyKey,
      'x-correlation-id': correlationId
    },
    body: JSON.stringify({
      userId,
      amount: targetBalance - balance,
      currency: 'TZS',
      description: 'e2e-seed-balance',
      referenceType: 'seed',
      referenceId: userId,
      idempotencyKey,
      correlationId,
      metadata: {
        source: 'seed-e2e-users',
        targetBalance
      }
    })
  });

  if (!creditResponse.ok) {
    throw new Error(`Failed to top up wallet for ${userId}: HTTP ${creditResponse.status} ${creditResponse.text}`);
  }
}

async function seedSellerProduct(sellerId: string): Promise<Record<string, unknown>> {
  let category = await prisma.category.findFirst({
    select: { id: true, name: true, slug: true },
    orderBy: { createdAt: 'asc' }
  });

  // Create a default category if none exists (fresh DB after reset)
  if (!category) {
    category = await prisma.category.create({
      data: {
        name: 'General',
        slug: 'general',
        description: 'General products category',
        displayOrder: 0,
        isActive: true,
      },
      select: { id: true, name: true, slug: true }
    });
    console.log(`  ↳ created default catalog category (id: ${category.id})`);
  }

  let location = await prisma.businessAddress.findFirst({
    select: { id: true, city: true, street: true, country: true },
    orderBy: { id: 'asc' }
  });

  // Create a default business address if none exists
  if (!location) {
    const business = await (prisma as any).businessregistry_businesses?.findFirst?.() 
      ?? await prisma.business.findFirst().catch(() => null);
    
    let businessId: string;
    if (!business) {
      const newBusiness = await prisma.business.create({
        data: {
          name: 'Seed Business',
          businessType: 'SOLE_PROPRIETORSHIP' as any,
          registrationNumber: `SEED-${Date.now()}`,
          ownerId: sellerId,
          // `industry` is a required String[] on Business; omitting it fails
          // with a null constraint violation. The seed business is generic, so
          // an explicit empty list is the honest value (not a fabricated one).
          industry: [],
        }
      });
      businessId = newBusiness.id;
    } else {
      businessId = business.id;
    }

    location = await prisma.businessAddress.create({
      data: {
        businessId,
        type: 'MAIN' as any,
        street: 'Uhuru Street 1',
        city: 'Dar es Salaam',
        region: 'Dar es Salaam',
        country: 'Tanzania',
        isPrimary: true,
      },
      select: { id: true, city: true, street: true, country: true }
    });
    console.log(`  ↳ created default business address (id: ${location.id})`);
  }

  const existing = await prisma.product.findFirst({
    where: {
      sellerId,
      title: SEED_PRODUCT_NAME
    },
    include: {
      category: true,
      variants: true
    },
    orderBy: { createdAt: 'desc' }
  });

  const product =
    existing ??
    await prisma.product.create({
      data: {
        sellerId,
        categoryId: category.id,
        brand: 'Maysar',
        title: SEED_PRODUCT_NAME,
        description: 'Seeded demo product for live E2E coverage.',
        supplierLocationId: location.id,
        supplierLocation: `${location.street}, ${location.city}, ${location.country}`,
        status: 'published',
        visibility: 'public',
        slug: `maysar-seeded-demo-product-${sellerId.slice(-8)}`,
        tags: ['seed', 'e2e', 'demo'],
        qualityScore: 80,
        enablerEnabled: false,
        codAccepted: true,
        freeDelivery: false,
        condition: 'new',
        variants: {
          create: [
            {
              sku: `MAYSAR-SEED-${sellerId.slice(-6)}`,
              name: 'Default',
              price: new Prisma.Decimal(250000),
              status: 'active'
            }
          ]
        }
      },
      include: {
        category: true,
        variants: true
      }
    });

  if (existing && existing.variants.length === 0) {
    await prisma.productVariant.create({
      data: {
        productId: existing.id,
        sku: `MAYSAR-SEED-${sellerId.slice(-6)}`,
        name: 'Default',
        price: new Prisma.Decimal(250000),
        status: 'active'
      }
    });
    const refreshed = await prisma.product.findUnique({
      where: { id: existing.id },
      include: { category: true, variants: true }
    });
    if (refreshed) {
      return {
        id: refreshed.id,
        title: refreshed.title,
        name: refreshed.title,
        price: 250000,
        sellerId: refreshed.sellerId,
        categoryId: refreshed.categoryId,
        supplierLocationId: refreshed.supplierLocationId,
        supplierLocation: refreshed.supplierLocation,
        status: refreshed.status,
        variants: refreshed.variants
      };
    }
  }

  return {
    id: product.id,
    title: product.title,
    name: product.title,
    price: 250000,
    sellerId: product.sellerId,
    categoryId: product.categoryId,
    supplierLocationId: product.supplierLocationId,
    supplierLocation: product.supplierLocation,
    status: product.status,
    variants: product.variants
  };
}

async function resetCourierLogisticsStatus(courierId: string): Promise<void> {
  try {
    await (prisma as any).logistics_Courier.updateMany({
      where: { id: courierId },
      data: { status: 'online' },
    });
  } catch (err: any) {
    console.warn(`  ↳ courier logistics status reset skipped: ${err?.message?.split('\n')[0]}`);
  }
}

/**
 * Seed a delivery record directly via Prisma so delivery.e2e.test.ts always
 * has a valid seededDeliveryId without needing to call POST /api/logistics/api/v1/deliveries
 * (which requires a courier to be available via findAvailableCouriers — fragile in e2e).
 *
 * The delivery is created in 'assigned' status linked to the seeded courier.
 * The delivery ID is stable across runs (upsert by courierId + orderId combo via direct find).
 */
const SEED_DELIVERY_ORDER_ID = 'e2e-seed-delivery-order-001';

async function seedDelivery(courierId: string): Promise<string | null> {
  // Stable delivery ID — must match SYSTEM_ID_PATTERN: [a-z]{2,6}(?:_[a-z]{2,6})?_[0-9A-HJKMNP-TV-Z]{26}
  const SEED_DELIVERY_ID = 'log_del_01ARZ3NDEKTSV4RRFFQ69G5FAV';

  try {
    // Clean up any old invalid-format delivery records for this seed order
    await (prisma as any).logistics_Delivery.deleteMany({
      where: {
        orderId: SEED_DELIVERY_ORDER_ID,
        NOT: { id: SEED_DELIVERY_ID },
      },
    });
    await (prisma as any).logistics_Delivery.upsert({
      where: { id: SEED_DELIVERY_ID },
      update: {
        // Reset to 'assigned' so state machine tests can advance it
        status: 'assigned',
        courierId,
        updatedAt: new Date(),
      },
      create: {
        id: SEED_DELIVERY_ID,
        orderId: SEED_DELIVERY_ORDER_ID,
        courierId,
        status: 'assigned',
        pickupStreet: 'Uhuru Street 1',
        pickupCity: 'Dar es Salaam',
        pickupRegion: 'Dar es Salaam',
        pickupLatitude: -6.7924,
        pickupLongitude: 39.2083,
        pickupContactName: 'Seed Pickup',
        pickupContactPhone: '+255700000001',
        deliveryStreet: 'Kariakoo Market',
        deliveryCity: 'Dar es Salaam',
        deliveryRegion: 'Dar es Salaam',
        deliveryLatitude: -6.8100,
        deliveryLongitude: 39.2800,
        deliveryContactName: 'Seed Delivery',
        deliveryContactPhone: '+255700000002',
        packageWeight: 1.0,
        packageValue: 5000,
        isCOD: false,
        estimatedDeliveryTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
      },
    });
    console.log(`  ↳ seeded delivery ready (id: ${SEED_DELIVERY_ID})`);
    return SEED_DELIVERY_ID;
  } catch (err: any) {
    console.warn(`  ↳ delivery seeding skipped: ${err?.message?.split('\n')[0]}`);
    return null;
  }
}

async function seedCourierProfile(courierId: string, user: SeedUser): Promise<void> {
  try {
    await (prisma as any).logistics_Courier.upsert({
      where: { id: courierId },
      update: {
        status: 'online',
        onTimeDeliveryRate: 0.95,
        customerRating: 4.8,
        completedDeliveries: 10,
      },
      create: {
        id: courierId,
        name: `${user.firstName} ${user.lastName}`,
        phone: user.phoneNumber,
        email: user.email,
        status: 'online',
        vehicleType: 'motorcycle',
        vehicleLicensePlate: 'T123ABC',
        vehicleCapacity: 20.0,
        vehicleFuelType: 'petrol',
        currentLatitude: -6.7924,
        currentLongitude: 39.2083,
        onTimeDeliveryRate: 0.95,
        customerRating: 4.8,
        completedDeliveries: 10,
        totalEarnings: 0,
        averageDeliveryTime: 30,
      },
    });
    console.log(`  ↳ courier profile seeded in logistics service`);
  } catch (err: any) {
    console.warn(`  ↳ courier logistics seed skipped: ${err?.message?.split('\n')[0]}`);
  }
}

async function seedEnablerProfile(userId: string, _token: string): Promise<void> {
  try {
    // Use Prisma directly to upsert the enabler profile — avoids HTTP routing issues
    // where GET /:id expects profile ID but we only have user ID
    const existing = await (prisma as any).enabler_Profile.findUnique({
      where: { userId },
      select: { id: true, status: true },
    });

    if (existing) {
      if (existing.status !== 'APPROVED' && existing.status !== 'ACTIVE') {
        await (prisma as any).enabler_Profile.update({
          where: { id: existing.id },
          data: { status: 'APPROVED' },
        });
        console.log(`  ↳ enabler profile status updated to APPROVED`);
      } else {
        console.log(`  ↳ enabler profile already exists and is active`);
      }
      return;
    }
  } catch (dbErr: any) {
    // If direct DB access fails, fall through to HTTP approach
    console.warn(`  ↳ enabler DB check skipped: ${dbErr?.message?.split('\n')[0]}`);
  }

  // HTTP fallback: register via API then approve
  const adminTk = await loginAdmin();
  const registerRes = await requestJson('/api/enabler/enablers/register', {
    method: 'POST',
    headers: { ...authHeader(adminTk), 'content-type': 'application/json' },
    body: JSON.stringify({
      userId,
      businessName: 'Zawadi Enabler Business',
      contactEmail: 'zawadi.omondi@example.com',
      contactPhone: '+255767890001',
      businessDescription: 'E2E seeded enabler for automated testing.',
      hasBusinessLicense: true,
      salesExperience: 2,
    }),
  });

  if (registerRes.status === 201 || registerRes.status === 200) {
    console.log(`  ↳ enabler profile registered`);
    const profileBody = registerRes.body as Record<string, unknown>;
    const profileData = (profileBody['data'] ?? profileBody) as Record<string, unknown>;
    const enablerId = String(profileData['id'] ?? '');
    if (enablerId) {
      await requestJson(`/api/enabler/enablers/${enablerId}/approve`, {
        method: 'POST',
        headers: { ...authHeader(adminTk), 'content-type': 'application/json' },
        body: JSON.stringify({
          adminId: (await prisma.user_User.findFirst({ where: { email: 'admin@maysar.co.tz' }, select: { id: true } }).catch(() => null))?.id ?? 'admin',
          completenessEvents: ['identity_verified'],
        }),
      });
      console.log(`  ↳ enabler profile approved`);
    }
  } else if (registerRes.status === 409) {
    // Already exists — approve via Prisma
    try {
      await (prisma as any).enabler_Profile.updateMany({
        where: { userId },
        data: { status: 'APPROVED' },
      });
      console.log(`  ↳ enabler profile force-approved via DB (409 path)`);
    } catch (dbErr: any) {
      console.warn(`  ↳ enabler force-approve failed: ${dbErr?.message?.split('\n')[0]}`);
    }
  } else {
    console.warn(`  ↳ enabler registration returned ${registerRes.status}: ${registerRes.text.slice(0, 120)}`);
  }
}

async function main(): Promise<void> {
  // Initialize Prisma AFTER dotenv has loaded DATABASE_URL
  prisma = new PrismaClient();
  console.log(`Seeding E2E users through auth API at ${BASE_URL}`);

  // Register the admin first, then activate it directly via Prisma.
  // The user-service may assign a different ID than SEED_USERS[0].id, so we
  // capture the real DB id from the registration response and use it to activate.
  // On re-runs (409), we fall back to a DB lookup by the SYSTEM role.
  let realAdminId = await registerUser(SEED_USERS[0]);

  if (!realAdminId) {
    // Re-run scenario (409) or id not returned — look up by role in DB
    // Retry up to 5 times in case the DB is briefly busy during app startup.
    let adminRow: { id: string } | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        adminRow = await prisma.user_User.findFirst({
          where: { role: 'SYSTEM' as any },
          select: { id: true }
        });
        if (adminRow) break;
      } catch (dbErr: any) {
        if (attempt < 4) {
          console.warn(`  ↳ DB lookup attempt ${attempt + 1} failed: ${dbErr?.message} — retrying...`);
          await sleep(2000 * (attempt + 1));
        } else {
          throw dbErr;
        }
      }
    }
    if (!adminRow) {
      throw new Error('bootstrapAdminActivation: admin user not found in DB after registration');
    }
    realAdminId = adminRow.id;
  }

  await bootstrapAdminActivation(realAdminId);
  console.log(`  ↳ admin bootstrapped via direct DB activation (id: ${realAdminId})`);

  // Look up all non-admin users by email to get their real IDs for bulk unlock
  const nonAdminEmailIds: string[] = [];
  for (const u of SEED_USERS.slice(1)) {
    const row = await prisma.user_User.findFirst({ where: { email: u.email }, select: { id: true } }).catch(() => null);
    if (row) nonAdminEmailIds.push(row.id);
  }

  // Reset any previously-locked or pending non-admin users in user_User directly.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (nonAdminEmailIds.length > 0) {
        await prisma.user_User.updateMany({
          where: { id: { in: nonAdminEmailIds } },
          data: { status: 'ACTIVE' as any, failedLoginAttempts: 0, lockoutUntil: null }
        });
        await prisma.user.updateMany({
          where: { id: { in: nonAdminEmailIds } },
          data: { status: 'ACTIVE' as any, failedLoginAttempts: 0, lockoutUntil: null }
        });
      }
      break;
    } catch (dbErr: any) {
      if (attempt < 2) { await sleep(2000); } else { throw dbErr; }
    }
  }
  console.log(`  ↳ non-admin users pre-unlocked in user_User and auth_users`);

  // Clear wallet transactions for all seeded-by-email users (velocity reset)
  const allEmailIds = [realAdminId, ...nonAdminEmailIds].filter(Boolean);
  const deletedTx = await prisma.wallet_Transaction.deleteMany({
    where: { userId: { in: allEmailIds } }
  });
  if (deletedTx.count > 0) {
    console.log(`  ↳ cleared ${deletedTx.count} wallet transactions (velocity reset)`);
  }

  // Cancel stale open orders for the buyer (look up by email)
  // Use raw SQL to bypass Prisma enum type restrictions and cover both
  // uppercase (PENDING/CONFIRMED) and any other non-terminal statuses.
  const buyerRow = await prisma.user_User.findFirst({ where: { email: 'buyer@maysar.co.tz' }, select: { id: true } }).catch(() => null);
  if (buyerRow) {
    try {
      // Cancel all non-terminal orders using raw SQL — covers any status case variation
      await prisma.$executeRaw`
        UPDATE orders
        SET status = 'CANCELLED', "updatedAt" = NOW()
        WHERE "buyerId" = ${buyerRow.id}
          AND status NOT IN ('CANCELLED', 'DELIVERED')
      `;
      console.log(`  ↳ cancelled all stale non-terminal orders for buyer (COD eligibility + wallet lock reset)`);
    } catch (orderCancelErr: any) {
      // Fallback to Prisma ORM if raw SQL fails
      try {
        const openOrders = await prisma.order_Order.updateMany({
          where: { buyerId: buyerRow.id, status: { in: ['PENDING', 'CONFIRMED', 'ASSIGNED', 'IN_TRANSIT'] as any[] } },
          data: { status: 'CANCELLED' as any }
        });
        if (openOrders.count > 0) {
          console.log(`  ↳ cancelled ${openOrders.count} stale open order(s) via ORM fallback`);
        }
      } catch (ormErr: any) {
        console.warn(`  ↳ Stale order cancel skipped: ${ormErr?.message?.split('\n')[0]}`);
      }
    }
  }

  // Flush stale Redis wallet locks BEFORE user loop so they start clean
  await flushWalletLocks();

  // ── Per-user seed loop ──────────────────────────────────────────────────────
  // Track real assigned IDs for seed-output.json
  const seedOutput: SeedOutput = {
    generatedAt: new Date().toISOString(),
    users: [],
    product: null,
    delivery: null,
  };

  // Track courier real ID for delivery seeding
  let courierRealId: string | null = null;

  for (const user of SEED_USERS) {
    let realUserId: string;

    if (user.role === 'system') {
      // Admin was already bootstrapped above
      realUserId = realAdminId;
    } else {
      // Register and capture real ID
      const returnedId = await registerUser(user);
      if (returnedId) {
        realUserId = returnedId;
      } else {
        // 409 re-run — look up by email
        const row = await prisma.user_User.findFirst({ where: { email: user.email }, select: { id: true } }).catch(() => null);
        if (!row) throw new Error(`Cannot resolve real ID for ${user.email}`);
        realUserId = row.id;
      }
      // Activate the user
      await activateUser(await loginAdmin(), realUserId);
    }

    const token = await loginUser(user);
    console.log(`✓ seeded ${user.role}: ${user.email} (id: ${realUserId})`);

    // Record in output
    seedOutput.users.push({ role: user.role, email: user.email, id: realUserId, phoneNumber: user.phoneNumber });

    if (user.role === 'seller') {
      const seededProduct = await seedSellerProduct(realUserId);
      console.log(`  ↳ seeded product: ${String(seededProduct['title'] ?? SEED_PRODUCT_NAME)}`);
      const variants = seededProduct['variants'] as any[];
      seedOutput.product = {
        id: String(seededProduct['id']),
        title: String(seededProduct['title'] ?? SEED_PRODUCT_NAME),
        price: Number(seededProduct['price'] ?? 250000),
        sellerId: String(seededProduct['sellerId']),
        categoryId: String(seededProduct['categoryId']),
        variantId: variants?.[0]?.id,
      };
    }

    if (user.role === 'enabler') {
      await seedEnablerProfile(realUserId, token);
    }

    if (user.role === 'courier') {
      courierRealId = realUserId;
      await seedCourierProfile(realUserId, user);
      const deliveryId = await seedDelivery(realUserId);
      if (deliveryId) {
        seedOutput.delivery = { id: deliveryId };
      }
    }

    if (user.walletTarget > 0) {
      const adminToken = await loginAdmin();
      await ensureWalletBalance(adminToken, realUserId, user.walletTarget);
      console.log(`  ↳ wallet set to at least ${user.walletTarget.toLocaleString()} TZS`);
    }
  }

  // Reset courier logistics status now that we have the real ID
  if (courierRealId) {
    await resetCourierLogisticsStatus(courierRealId);
  }

  // Write seed output for Playwright consumption
  fs.writeFileSync(SEED_OUTPUT_PATH, JSON.stringify(seedOutput, null, 2), 'utf-8');
  console.log(`\n📄 Seed output written to: ${SEED_OUTPUT_PATH}`);
  console.log('   Playwright tests should read this file to get real user IDs.\n');

  // ── Post-seed: ensure verification flags are set on all user tables ─────────
  // Build an id→phoneNumber map from the output
  const phoneByRole: Record<string, string> = {
    system:   '+255700000001',
    buyer:    '+255700000002',
    seller:   '+255700000003',
    supplier: '+255700000004',
    courier:  '+255700000005',
    enabler:  '+255700000006',
  };
  for (const u of seedOutput.users) {
    const phone = phoneByRole[u.role] ?? null;
    // Update auth_users
    try {
      await prisma.user.update({
        where: { id: u.id },
        data: {
          isEmailVerified: true,
          isPhoneVerified: true,
          ...(phone ? { phoneNumber: phone } : {}),
          status: 'ACTIVE' as any
        }
      });
    } catch { /* ignore if not found */ }
    // Update users (user-service table)
    try {
      await prisma.user_User.update({
        where: { id: u.id },
        data: {
          isEmailVerified: true,
          isPhoneVerified: true,
          status: 'ACTIVE' as any
        }
      });
    } catch { /* ignore if not found */ }
  }
  console.log('  ↳ isEmailVerified=true, isPhoneVerified=true set on all seeded users (both tables)');

  console.log('Seed complete.');

  // Final flush: clear any wallet locks acquired during seed operations (top-ups)
  await flushWalletLocks();
}

async function flushWalletLocks(): Promise<void> {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const redisClient = createClient({ url: redisUrl });
    await redisClient.connect();
    const lockKeys = await redisClient.keys('lock:wallet:*');
    if (lockKeys.length > 0) {
      await redisClient.del(lockKeys);
      console.log(`  ↳ cleared ${lockKeys.length} Redis wallet lock(s)`);
    }
    await redisClient.quit();
  } catch (redisErr: any) {
    console.warn(`  ↳ Redis lock flush skipped: ${redisErr?.message}`);
  }
}

main().catch((error: any) => {
  console.error('Seed failed:', error?.message || error);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
