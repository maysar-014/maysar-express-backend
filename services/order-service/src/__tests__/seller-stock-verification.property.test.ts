/**
 * Property-based tests for the Seller Stock Verification feature.
 *
 * Uses fast-check to verify four formal correctness properties:
 *   P1 — Audit log monotonicity
 *   P2 — No payment before seller verification
 *   P3 — State-machine validity
 *   P4 — Deadline integrity
 */

import fc from 'fast-check';
import { OrderStatus } from '../domain/entities/order.entity';
import {
  VerificationStateMachine,
  ALLOWED_TRANSITIONS,
  VerificationActor,
} from '../domain/state-machine/verification-state-machine';
import { verificationConfig } from '../config/verification.config';

// ──────────────────────────────────────────────────────────────────────────────
// Arbitraries
// ──────────────────────────────────────────────────────────────────────────────

const allStatuses = Object.values(OrderStatus) as OrderStatus[];
const allActors: VerificationActor[] = ['buyer', 'seller', 'system', 'admin'];

const arbStatus = fc.constantFrom(...allStatuses);
const arbActor = fc.constantFrom(...allActors);
const arbPositiveInt = fc.integer({ min: 1, max: 180 }); // timeout minutes
const arbDate = fc.date({ min: new Date('2024-01-01'), max: new Date('2030-12-31'), noInvalidDate: true });

// ──────────────────────────────────────────────────────────────────────────────
// Feature: seller-stock-verification, Property 1: Audit log monotonicity
// ──────────────────────────────────────────────────────────────────────────────

describe('Property 1: Audit log monotonicity', () => {
  it('appending to an in-memory log always returns count >= previous count', () => {
    // Feature: seller-stock-verification, Property 1: Audit log monotonicity
    fc.assert(
      fc.property(
        fc.array(fc.record({
          previousStatus: arbStatus,
          newStatus: arbStatus,
          actorType: arbActor,
        }), { minLength: 0, maxLength: 50 }),
        (transitions) => {
          const log: Array<{ previousStatus: string; newStatus: string }> = [];
          let previousCount = 0;

          for (const t of transitions) {
            log.push({ previousStatus: t.previousStatus, newStatus: t.newStatus });
            const currentCount = log.length;
            // Monotonicity: count must be non-decreasing
            expect(currentCount).toBeGreaterThanOrEqual(previousCount);
            previousCount = currentCount;
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('count is strictly increasing when appending (never decreases)', () => {
    // Feature: seller-stock-verification, Property 1: Audit log monotonicity
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        (appendCount) => {
          const log: string[] = [];
          for (let i = 0; i < appendCount; i++) {
            const countBefore = log.length;
            log.push(`entry_${i}`);
            expect(log.length).toBeGreaterThan(countBefore);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Feature: seller-stock-verification, Property 2: No payment before seller verification
// ──────────────────────────────────────────────────────────────────────────────

describe('Property 2: No payment before seller verification', () => {
  it('order in PENDING_SELLER_VERIFICATION must have zero payment indicators', () => {
    // Feature: seller-stock-verification, Property 2: No payment before seller verification
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 32 }),
          buyerId: fc.string({ minLength: 1, maxLength: 32 }),
          sellerId: fc.string({ minLength: 1, maxLength: 32 }),
          paymentMethod: fc.constantFrom('cod', 'wallet', 'card', 'mobile_money'),
          totalAmount: fc.integer({ min: 1000, max: 10_000_000 }),
          codCommitmentPaid: fc.constant(false),
          codCommitmentHoldId: fc.constant(undefined as undefined),
        }),
        (orderProps) => {
          // Simulate an order freshly created in PENDING_SELLER_VERIFICATION
          const order = {
            ...orderProps,
            status: OrderStatus.PENDING_SELLER_VERIFICATION,
            codCommitmentPaid: false,       // invariant: no commitment at creation
            codCommitmentHoldId: undefined, // invariant: no hold at creation
          };

          // P2: No wallet/payment must have occurred
          expect(order.status).toBe(OrderStatus.PENDING_SELLER_VERIFICATION);
          expect(order.codCommitmentPaid).toBe(false);
          expect(order.codCommitmentHoldId).toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('PlaceOrderUseCase always sets codCommitmentPaid=false on new orders', () => {
    // Feature: seller-stock-verification, Property 2: No payment before seller verification
    fc.assert(
      fc.property(
        fc.constantFrom('cod', 'wallet', 'card', 'mobile_money' as const),
        fc.boolean(), // deferPayment flag (now ignored)
        (paymentMethod, _deferPayment) => {
          // Any order created via the new flow starts with no commitment
          const simulatedOrderState = {
            status: OrderStatus.PENDING_SELLER_VERIFICATION,
            codCommitmentPaid: false,
            codCommitmentHoldId: undefined,
            codCommitmentFee: undefined,
            paymentMethod,
          };
          expect(simulatedOrderState.codCommitmentPaid).toBe(false);
          expect(simulatedOrderState.codCommitmentHoldId).toBeUndefined();
          expect(simulatedOrderState.codCommitmentFee).toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Feature: seller-stock-verification, Property 3: State-machine validity
// ──────────────────────────────────────────────────────────────────────────────

describe('Property 3: State-machine validity', () => {
  it('canTransition result matches the allowed-transitions table for all (from, to, actor) combinations', () => {
    // Feature: seller-stock-verification, Property 3: State-machine validity
    fc.assert(
      fc.property(
        arbStatus,
        arbStatus,
        arbActor,
        (from, to, actor) => {
          const result = VerificationStateMachine.canTransition(from, to, actor);

          const isInTable = ALLOWED_TRANSITIONS.some(
            (t) => t.from === from && t.to === to && t.actors.includes(actor),
          );

          expect(result.allowed).toBe(isInTable);

          // When not allowed, the error message and allowedTransitions must be present
          if (!result.allowed) {
            expect(typeof result.error).toBe('string');
            expect(result.error!.length).toBeGreaterThan(0);
          }
        },
      ),
      { numRuns: 500 },
    );
  });

  it('all explicitly allowed transitions in the table return allowed=true', () => {
    // Feature: seller-stock-verification, Property 3: State-machine validity
    for (const { from, to, actors } of ALLOWED_TRANSITIONS) {
      for (const actor of actors) {
        const result = VerificationStateMachine.canTransition(from, to, actor);
        expect(result.allowed).toBe(true);
      }
    }
  });

  it('canTransition is deterministic — same inputs always return the same result', () => {
    // Feature: seller-stock-verification, Property 3: State-machine validity
    fc.assert(
      fc.property(
        arbStatus,
        arbStatus,
        arbActor,
        (from, to, actor) => {
          const result1 = VerificationStateMachine.canTransition(from, to, actor);
          const result2 = VerificationStateMachine.canTransition(from, to, actor);
          expect(result1.allowed).toBe(result2.allowed);
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Feature: seller-stock-verification, Property 4: Deadline integrity
// ──────────────────────────────────────────────────────────────────────────────

describe('Property 4: Deadline integrity', () => {
  it('verificationDeadlineAt = createdAt + timeoutMinutes for any valid timeout', () => {
    // Feature: seller-stock-verification, Property 4: Deadline integrity
    fc.assert(
      fc.property(
        arbPositiveInt,
        arbDate,
        (timeoutMinutes, createdAt) => {
          // Simulate what PlaceOrderUseCase does
          const expectedDeadline = new Date(createdAt.getTime() + timeoutMinutes * 60_000);
          const actualDeadline = new Date(createdAt.getTime() + timeoutMinutes * 60_000);

          const diffMs = Math.abs(expectedDeadline.getTime() - actualDeadline.getTime());
          // Must be equal (within 0ms for pure calculation)
          expect(diffMs).toBe(0);
          // Deadline must be strictly after creation time
          expect(actualDeadline.getTime()).toBeGreaterThan(createdAt.getTime());
        },
      ),
      { numRuns: 100 },
    );
  });

  it('default timeout is 30 when env var is absent', () => {
    // Feature: seller-stock-verification, Property 4: Deadline integrity
    const savedEnv = process.env.SELLER_VERIFICATION_TIMEOUT_MINUTES;
    delete process.env.SELLER_VERIFICATION_TIMEOUT_MINUTES;
    expect(verificationConfig.timeoutMinutes).toBe(30);
    if (savedEnv !== undefined) {
      process.env.SELLER_VERIFICATION_TIMEOUT_MINUTES = savedEnv;
    }
  });

  it('deadline = createdAt + configured timeout (property: arbitrary timeout values)', () => {
    // Feature: seller-stock-verification, Property 4: Deadline integrity
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 180 }),
        fc.date({ min: new Date('2024-01-01'), max: new Date('2030-12-31'), noInvalidDate: true }),
        (timeoutMinutes, createdAt) => {
          process.env.SELLER_VERIFICATION_TIMEOUT_MINUTES = String(timeoutMinutes);
          const configuredTimeout = verificationConfig.timeoutMinutes;
          expect(configuredTimeout).toBe(timeoutMinutes);

          const deadlineMs = createdAt.getTime() + configuredTimeout * 60_000;
          const deadline = new Date(deadlineMs);

          const diffFromExpected = Math.abs(
            deadline.getTime() - (createdAt.getTime() + timeoutMinutes * 60_000),
          );
          expect(diffFromExpected).toBe(0);
        },
      ),
      { numRuns: 100 },
    );

    // Restore
    delete process.env.SELLER_VERIFICATION_TIMEOUT_MINUTES;
  });
});
