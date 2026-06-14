/**
 * Seeded test user registry — single source of truth for all deterministic test actors.
 *
 * Users are registered through `scripts/seed-e2e-users.ts` and must not be created or
 * deleted during E2E test runs. See `docs/test-users.md` for the canonical reference.
 *
 * All accounts share the same password: Maysar@2024!
 */

export type SeededRole = 'buyer' | 'seller' | 'courier' | 'enabler' | 'supplier' | 'admin';

export interface SeededUser {
  readonly role: SeededRole;
  readonly email: string;
  readonly password: string;
  readonly id: string;
}

export const SEEDED_USERS: Record<SeededRole, SeededUser> = {
  buyer: {
    role: 'buyer',
    email: 'buyer@maysar.co.tz',
    password: 'Maysar@2024!',
    id: 'usr_01KRFXQZC36NK3CDEWJJS21RP8',
  },
  seller: {
    role: 'seller',
    email: 'seller@maysar.co.tz',
    password: 'Maysar@2024!',
    id: 'usr_01KRFZ1E5G6CWAQ4BXKVNPYG3Z',
  },
  courier: {
    role: 'courier',
    email: 'courier@maysar.co.tz',
    password: 'Maysar@2024!',
    id: 'usr_01KRFZ1E7W4JDR9N9PMGYDD77S',
  },
  enabler: {
    role: 'enabler',
    email: 'enabler@maysar.co.tz',
    password: 'Maysar@2024!',
    id: 'usr_01KRFZ1E8HMAE7MMH175PJ9337',
  },
  supplier: {
    role: 'supplier',
    email: 'supplier@maysar.co.tz',
    password: 'Maysar@2024!',
    id: 'usr_01KRFZ1E73P67T886TR2QDY0VT',
  },
  admin: {
    role: 'admin',
    email: 'admin@maysar.co.tz',
    password: 'Maysar@2024!',
    id: 'usr_ADMIN000000000000000000001',
  },
} as const;

/**
 * Minimum wallet balance (TZS) the buyer should have before wallet-dependent tests run.
 * Set high enough to cover multiple order+cancel cycles across all e2e test suites.
 */
export const WALLET_TOP_UP_MINIMUM = 2_000_000;
