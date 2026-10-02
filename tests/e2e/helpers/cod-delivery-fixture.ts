/**
 * COD delivery fixture (BLG-022 / BLG-023).
 *
 * Why this exists
 * ---------------
 * Checkout creates a `logistics_Shipment`. A `logistics_Delivery` only appears
 * later, via courier assignment/acceptance, which the platform drives through
 * `DeliverySaga` — constructed and registered but never started. The COD OTP
 * endpoints (`POST /cod/:id/otp`, `/cod/:id/verify`) both operate on a
 * *pre-existing* delivery, so with no delivery there is nothing to verify. The
 * COD lifecycle and order-tracking e2e tests used to compensate with
 * `console.warn('skipping assertions'); return;`, which reported PASS while
 * executing zero assertions.
 *
 * This creates the delivery directly through Prisma, following the pattern
 * already sanctioned by `scripts/seed-e2e-users.ts` (`seedDelivery`). That is
 * deliberate: `POST /api/logistics/api/v1/deliveries` looks like the public route
 * for this, but `create-delivery.use-case.ts` only *returns a plan* (courier,
 * route, cost) and never persists a row, so it cannot be used here.
 *
 * This proves the OTP flow against a real delivery row without starting the
 * production saga. Starting `DeliverySaga` stays a separate product decision.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

/** Mirrors logistics.routes.ts SYSTEM_ID_PATTERN. */
const SYSTEM_ID_PATTERN = /^[a-z]{2,6}(?:_[a-z]{2,6})?_[0-9A-HJKMNP-TV-Z]{26}$/;

/** Crockford base32 (excludes I, L, O, U) — the pattern's alphabet. */
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

let prismaSingleton: PrismaClient | null = null;

/** Shared client, so the fixture does not open a second pool. */
export const getFixturePrisma = (): PrismaClient => {
  if (!prismaSingleton) prismaSingleton = new PrismaClient();
  return prismaSingleton;
};

export const closeFixturePrisma = async (): Promise<void> => {
  if (prismaSingleton) {
    await prismaSingleton.$disconnect();
    prismaSingleton = null;
  }
};

/**
 * Builds a delivery ID satisfying SYSTEM_ID_PATTERN. The suffix is derived from
 * the order so a given order always maps to the same ID, keeping the fixture
 * idempotent and re-runnable.
 */
export const buildDeliveryId = (orderId: string): string => {
  // 26 chars from a stable hash of the order id — deterministic, and never
  // collides with the seeded `log_del_01ARZ3NDEKTSV4RRFFQ69G5FAV`.
  let state = 0x811c9dc5 >>> 0;
  for (let i = 0; i < orderId.length; i += 1) {
    state ^= orderId.charCodeAt(i);
    state = Math.imul(state, 0x01000193) >>> 0;
  }
  let suffix = '';
  for (let i = 0; i < 26; i += 1) {
    // Rehash each step so the 26 chars are not 26 copies of one byte.
    state = (Math.imul(state ^ (state >>> 15), 0x2545f491) + i * 0x9e3779b1) >>> 0;
    suffix += CROCKFORD[state % CROCKFORD.length];
  }
  const id = `log_del_${suffix}`;
  if (!SYSTEM_ID_PATTERN.test(id)) {
    // A broken generator must fail loudly, not seed an invalid ID.
    throw new Error(`Generated delivery ID violates SYSTEM_ID_PATTERN: ${id}`);
  }
  return id;
};
export interface CodDeliveryFixtureInput {
  orderId: string;
  courierId: string;
  buyerId: string;
  sellerId: string;
  codAmount: number;
  codCommitmentHoldId?: string | null;
  /**
   * Defaults to true. Wallet orders need a delivery too (tracking must work for
   * every order, not just COD), and those deliveries are not COD — so callers
   * pass false for them. `InitiateCODDeliveryUseCase` treats a non-COD delivery
   * as a successful no-op, which is correct here: no OTP is issued or expected.
   */
  isCOD?: boolean;
}

export interface CodDeliveryFixtureResult {
  deliveryId: string;
  created: boolean;
}

/**
 * Creates (or resets) a COD delivery for `orderId`, returning its ID.
 *
 * Status starts at `assigned` so tests can drive picked_up → in_transit →
 * delivered, matching the existing state-machine assertions.
 *
 * `isCOD` must be true: `InitiateCODDeliveryUseCase` treats a non-COD delivery
 * as a *successful no-op* (it logs and returns before starting the saga), so a
 * false here would silently skip the entire flow while still returning 200.
 */
export const createCodDeliveryFixture = async (
  input: CodDeliveryFixtureInput
): Promise<CodDeliveryFixtureResult> => {
  const prisma = getFixturePrisma() as any;
  const deliveryId = buildDeliveryId(input.orderId);

  const existing = await prisma.logistics_Delivery.findUnique({
    where: { id: deliveryId },
    select: { id: true },
  });

  const data = {
    orderId: input.orderId,
    courierId: input.courierId,
    buyerId: input.buyerId,
    sellerId: input.sellerId,
    status: 'assigned',
    isCOD: input.isCOD ?? true,
    codAmount: input.isCOD === false ? 0 : input.codAmount,
    codCurrency: 'TZS',
    codCommitmentHoldId: input.codCommitmentHoldId ?? null,
    pickupStreet: 'Uhuru Street 1',
    pickupCity: 'Dar es Salaam',
    pickupRegion: 'Dar es Salaam',
    pickupLatitude: -6.7924,
    pickupLongitude: 39.2083,
    pickupContactName: 'Fixture Pickup',
    pickupContactPhone: '+255700000001',
    deliveryStreet: 'Kariakoo Market',
    deliveryCity: 'Dar es Salaam',
    deliveryRegion: 'Dar es Salaam',
    deliveryLatitude: -6.81,
    deliveryLongitude: 39.28,
    deliveryContactName: 'Fixture Delivery',
    deliveryContactPhone: '+255700000002',
    packageWeight: 1.0,
    packageValue: input.codAmount,
    estimatedDeliveryTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
    // Cleared so a re-run never reuses a previous run's OTP or expiry.
    otp: null,
    otpExpiresAt: null,
  };

  await prisma.logistics_Delivery.upsert({
    where: { id: deliveryId },
    update: { ...data, updatedAt: new Date() },
    create: { id: deliveryId, ...data, createdAt: new Date(), updatedAt: new Date() },
  });

  return { deliveryId, created: existing === null };
};

/**
 * Reads back the OTP issued for a delivery.
 *
 * Necessary because `POST /cod/:id/otp` deliberately does not return the code —
 * it goes to the buyer out of band, as in production. In an e2e test the only
 * place to read it is the delivery row itself.
 */
export const readDeliveryOtp = async (
  deliveryId: string
): Promise<{ otp: string | null; otpExpiresAt: Date | null; status: string }> => {
  const prisma = getFixturePrisma() as any;
  const row = await prisma.logistics_Delivery.findUnique({
    where: { id: deliveryId },
    select: { otp: true, otpExpiresAt: true, status: true },
  });
  if (!row) throw new Error(`No delivery ${deliveryId} to read an OTP from`);
  return { otp: row.otp ?? null, otpExpiresAt: row.otpExpiresAt ?? null, status: row.status };
};

/** Waits for the OTP to be persisted, since issuance is saga-driven. */
export const waitForDeliveryOtp = async (
  deliveryId: string,
  { attempts = 20, intervalMs = 250 }: { attempts?: number; intervalMs?: number } = {}
): Promise<string> => {
  for (let i = 0; i < attempts; i += 1) {
    const { otp } = await readDeliveryOtp(deliveryId);
    if (otp) return otp;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(
    `No OTP persisted for delivery ${deliveryId} after ${attempts} attempts — ` +
    'the COD saga did not issue one'
  );
};

/** Removes the fixture delivery so a failed run cannot leak rows into the next. */
export const deleteCodDeliveryFixture = async (orderId: string): Promise<void> => {
  const prisma = getFixturePrisma() as any;
  await prisma.logistics_Delivery.deleteMany({ where: { id: buildDeliveryId(orderId) } });
};