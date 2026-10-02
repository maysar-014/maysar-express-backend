/**
 * Preservation Property Tests — Wallet Payment Silent Failure Bugfix
 *
 * These tests MUST PASS on the current (unfixed/fixed) code.
 * They confirm baseline behavior to preserve after the fix is applied.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import * as fc from 'fast-check';
import { GLOBAL_MINIMUM_BASKET_VALUE_TZS } from '@shared/business/minimum-basket-value';
import { Payment, PaymentMethod, PaymentStatus } from '../domain/entities/payment.entity';
import { PaymentSaga } from '../application/sagas/payment.saga';
import { BuyerConfirmCheckoutUseCase } from '../application/use-cases/buyer-confirm-checkout.use-case';
import { OrderStatus } from '../domain/entities/order.entity';
import { OrderFulfillmentSaga } from '../application/sagas/order-fulfillment.saga';

// Mock the saga log repository to avoid DB dependency in unit tests
jest.mock('../infrastructure/repositories/saga.repository', () => ({
  sagaLogRepository: {
    save: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    getById: jest.fn().mockResolvedValue(null),
    saveStep: jest.fn().mockResolvedValue(undefined),
    updateStep: jest.fn().mockResolvedValue(undefined),
    getSteps: jest.fn().mockResolvedValue([]),
    findStuck: jest.fn().mockResolvedValue([])
  }
}));

// ─── Shared arbitraries ────────────────────────────────────────────────────────

const buyerIdArb = fc.stringMatching(/^[a-z0-9]{4,16}$/).map((s: string) => 'buyer-' + s);
const sellerIdArb = fc.stringMatching(/^[a-z0-9]{4,16}$/).map((s: string) => 'seller-' + s);
// These properties assert payment-outcome semantics (a failed authorisation must
// surface an error and must NOT persist the order). They are not basket-validation
// properties. The generator therefore starts at the production minimum basket value:
// starting it lower made fast-check generate a sub-threshold amount on its first
// run, so the minimum-basket rule rejected the order before the payment path was
// ever reached and the property failed for the wrong reason. Bound to the shared
// constant so it cannot drift out of step with production again.
const amountArb = fc.integer({ min: GLOBAL_MINIMUM_BASKET_VALUE_TZS, max: 500000 });
const currencyArb = fc.constantFrom('TZS', 'USD', 'KES', 'EUR');

// ─── Minimal stubs ─────────────────────────────────────────────────────────────

function makeMockPaymentGatewayAdapter() {
  return {
    processPayment: jest.fn().mockResolvedValue({ success: true, transactionId: 'PAYMENT_GATEWAY_TX_001' })
  } as any;
}

function makeMockPaymentRepository() {
  return {
    upsert: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValue(null)
  } as any;
}

function makeMockEventPublisher() {
  return {
    publish: jest.fn().mockResolvedValue(undefined)
  } as any;
}

function makeMockCODEligibilityEngine() {
  return {
    checkBuyerEligibility: jest.fn().mockResolvedValue({ eligible: true }),
    checkSellerEligibility: jest.fn().mockResolvedValue({ eligible: true }),
    checkOrderEligibility: jest.fn().mockResolvedValue({ eligible: true })
  } as any;
}

function makeMockCODCommitmentService() {
  return {
    calculateCommitmentFee: jest.fn().mockReturnValue(500),
    secureCommitment: jest.fn().mockResolvedValue('hold-id-001')
  } as any;
}

function makeSuccessWalletClient() {
  return {
    debitWallet: jest.fn().mockResolvedValue('TX_REAL_001'),
    placeHold: jest.fn().mockResolvedValue('hold-001'),
    releaseHold: jest.fn().mockResolvedValue(undefined),
    captureHold: jest.fn().mockResolvedValue(undefined)
  };
}

function makeFailingWalletClient(errorMessage = 'Insufficient funds') {
  return {
    debitWallet: jest.fn().mockRejectedValue(new Error(errorMessage)),
    placeHold: jest.fn().mockResolvedValue('hold-001'),
    releaseHold: jest.fn().mockResolvedValue(undefined),
    captureHold: jest.fn().mockResolvedValue(undefined)
  };
}

// ─── Checkout-path stubs (BuyerConfirmCheckoutUseCase) ─────────────────────────
//
// Payment is no longer performed by PlaceOrderUseCase. Under the seller
// verification workflow every order is persisted as PENDING_SELLER_VERIFICATION
// with no payment step, and the wallet is debited later by
// BuyerConfirmCheckoutUseCase, which is wired at index.ts:137 and reached from
// verification.controller.ts. It charges the wallet only on the
// SELLER_VERIFIED → CONFIRMED (actor: buyer) transition, so the fixtures below
// place the order in exactly that state.

/** An order in the only state from which a buyer may confirm checkout. */
function makeVerifiedOrder(overrides: Record<string, any> = {}) {
  return {
    id: 'order-test-001',
    buyerId: 'buyer-test-001',
    sellerId: 'seller-test-001',
    status: OrderStatus.SELLER_VERIFIED,
    paymentMethod: 'WALLET',
    totalAmount: { amount: 100000, currency: 'TZS' },
    deliveryFee: 2000,
    logisticsEstimate: 5000,
    ...overrides,
  } as any;
}

function makeMockAuditLogRepository() {
  return { append: jest.fn().mockResolvedValue(undefined) } as any;
}

/**
 * Builds the checkout use case over in-memory doubles.
 *
 * `BuyerConfirmCheckoutUseCase` persists through `globalThis.prisma` when it is
 * present and falls back to the injected repositories when it is not. The prisma
 * global is cleared here so these tests exercise the repository branch and stay
 * hermetic — without this the suite reaches for a real PrismaClient and fails
 * with "Database not initialized. Call initialize() first."
 */
function makeCheckoutUseCase(overrides: {
  order?: any;
  walletClient?: any;
  codEligibilityEngine?: any;
  codCommitmentService?: any;
} = {}) {
  const order = overrides.order ?? makeVerifiedOrder();
  const orderRepository = {
    findById: jest.fn().mockResolvedValue(order),
    update: jest.fn().mockResolvedValue(undefined),
  } as any;
  const auditLogRepository = makeMockAuditLogRepository();
  const eventPublisher = makeMockEventPublisher();
  const codEligibilityEngine = overrides.codEligibilityEngine ?? makeMockCODEligibilityEngine();
  const codCommitmentService = overrides.codCommitmentService ?? makeMockCODCommitmentService();
  const walletClient = overrides.walletClient ?? makeSuccessWalletClient();

  const useCase = new BuyerConfirmCheckoutUseCase(
    orderRepository,
    auditLogRepository,
    eventPublisher,
    codEligibilityEngine,
    codCommitmentService,
    walletClient as any,
  );

  return { useCase, order, orderRepository, auditLogRepository, eventPublisher, codEligibilityEngine, codCommitmentService, walletClient };
}

/** Confirms checkout for the order held by `bundle`, as its buyer. */
async function confirmCheckout(bundle: ReturnType<typeof makeCheckoutUseCase>, input: Record<string, any> = {}) {
  return bundle.useCase.execute({
    orderId: bundle.order.id,
    buyerId: bundle.order.buyerId,
    ...input,
  } as any);
}

async function drainAsync(ms = 50): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Preservation A — COD orders ──────────────────────────────────────────────
//
// For all random buyerId/sellerId/items combinations with paymentMethod: 'COD',
// assert that walletClient.debitWallet is NEVER called, COD eligibility checks run,
// and commitment fee is secured.
//
// Validates: Requirements 3.1

describe('Preservation A — COD orders: walletClient.debitWallet is NEVER called', () => {
  /**
   * **Validates: Requirements 3.1**
   *
   * Property: For any COD order confirmed at checkout, walletClient.debitWallet
   * MUST NOT be called, COD eligibility checks MUST run, and the commitment fee
   * MUST be secured.
   *
   * Retargeted from PlaceOrderUseCase to BuyerConfirmCheckoutUseCase. Under the
   * seller verification workflow PlaceOrderUseCase performs no payment step at
   * all, so asserting "debitWallet not called" against it was vacuously true and
   * the eligibility/commitment assertions could not hold there. Both now hold for
   * real on the use case that actually charges.
   */
  it('PBT: debitWallet is never called for any COD order', async () => {
    await fc.assert(
      fc.asyncProperty(
        buyerIdArb,
        sellerIdArb,
        fc.integer({ min: 0, max: 20_000 }),
        fc.integer({ min: 0, max: 20_000 }),
        async (buyerId, sellerId, deliveryFee, logisticsEstimate) => {
          const bundle = makeCheckoutUseCase({
            order: makeVerifiedOrder({
              buyerId,
              sellerId,
              paymentMethod: 'COD',
              deliveryFee,
              logisticsEstimate,
            }),
          });

          await confirmCheckout(bundle);

          // ASSERTION: debitWallet must NEVER be called for COD orders
          expect(bundle.walletClient.debitWallet).not.toHaveBeenCalled();

          // ASSERTION: COD eligibility checks must run
          expect(bundle.codEligibilityEngine.checkBuyerEligibility).toHaveBeenCalledWith(buyerId);
          expect(bundle.codEligibilityEngine.checkSellerEligibility).toHaveBeenCalledWith(sellerId);

          // ASSERTION: commitment fee must be secured
          expect(bundle.codCommitmentService.secureCommitment).toHaveBeenCalled();

          // ASSERTION: order must be confirmed and persisted
          expect(bundle.orderRepository.update).toHaveBeenCalledTimes(1);
          expect(bundle.order.status).toBe(OrderStatus.CONFIRMED);
        },
      ),
      { numRuns: 10 }
    );
  });

  it('Unit: COD order does not call debitWallet and runs eligibility checks', async () => {
    const bundle = makeCheckoutUseCase({
      order: makeVerifiedOrder({ paymentMethod: 'COD', deliveryFee: 2000 }),
    });

    await confirmCheckout(bundle);

    expect(bundle.walletClient.debitWallet).not.toHaveBeenCalled();
    expect(bundle.codEligibilityEngine.checkBuyerEligibility).toHaveBeenCalledWith('buyer-test-001');
    expect(bundle.codEligibilityEngine.checkSellerEligibility).toHaveBeenCalledWith('seller-test-001');
    expect(bundle.codCommitmentService.secureCommitment).toHaveBeenCalled();
    expect(bundle.orderRepository.update).toHaveBeenCalledTimes(1);
  });
});

// ─── Preservation B — CARD and MOBILE_PAYMENT orders ─────────────────────────
//
// For all random inputs with paymentMethod in ['CARD', 'MOBILE_PAYMENT'],
// assert that processPaymentGatewayPayment is called and walletClient.debitWallet is NEVER called.
//
// Validates: Requirements 3.2

describe('Preservation B — CARD and MOBILE_PAYMENT orders: routes to PaymentGateway, never debits wallet', () => {
  /**
   * **Validates: Requirements 3.2**
   *
   * Property: For any buyerId/amount/currency with paymentMethod in ['CARD', 'MOBILE_PAYMENT'],
   * processPaymentGatewayPayment MUST be called and walletClient.debitWallet MUST NOT be called.
   */
  it('PBT: debitWallet is never called for CARD or MOBILE_PAYMENT orders', async () => {
    const paymentMethodArb = fc.constantFrom<'CARD' | 'MOBILE_PAYMENT'>('CARD', 'MOBILE_PAYMENT');

    await fc.assert(
      fc.asyncProperty(buyerIdArb, amountArb, currencyArb, paymentMethodArb, async (buyerId, amount, currency, paymentMethod) => {
        const paymentGatewayAdapter = makeMockPaymentGatewayAdapter();
        const paymentRepository = makeMockPaymentRepository();
        const walletClient = makeSuccessWalletClient();

        const domainMethod = paymentMethod === 'CARD' ? PaymentMethod.CARD : PaymentMethod.MOBILE_MONEY;

        const saga = new PaymentSaga(paymentGatewayAdapter, paymentRepository, walletClient as any);

        const payment = new Payment({
          id: 'pay-' + buyerId + '-' + amount,
          orderId: 'ord-' + buyerId,
          buyerId,
          amount,
          currency,
          method: domainMethod,
          status: PaymentStatus.PENDING
        });

        await saga.start({ payment });
        await drainAsync();

        // ASSERTION: processPaymentGatewayPayment (via paymentGatewayAdapter.processPayment) must be called
        expect(paymentGatewayAdapter.processPayment).toHaveBeenCalled();

        // ASSERTION: debitWallet must NEVER be called
        expect(walletClient.debitWallet).not.toHaveBeenCalled();
      }),
      { numRuns: 10 }
    );
  });

  it('Unit: CARD payment routes to PaymentGateway and never calls debitWallet', async () => {
    const paymentGatewayAdapter = makeMockPaymentGatewayAdapter();
    const paymentRepository = makeMockPaymentRepository();
    const walletClient = makeSuccessWalletClient();

    const saga = new PaymentSaga(paymentGatewayAdapter, paymentRepository, walletClient as any);

    const payment = new Payment({
      id: 'pay-card-001',
      orderId: 'ord-card-001',
      buyerId: 'buyer-card-001',
      amount: 100000, // must clear the 50,000 TZS global minimum basket (MIN_BASKET_VALUE_TZS)
      currency: 'TZS',
      method: PaymentMethod.CARD,
      status: PaymentStatus.PENDING
    });

    await saga.start({ payment });
    await drainAsync();

    expect(paymentGatewayAdapter.processPayment).toHaveBeenCalledTimes(1);
    expect(walletClient.debitWallet).not.toHaveBeenCalled();
  });

  it('Unit: MOBILE_PAYMENT routes to PaymentGateway and never calls debitWallet', async () => {
    const paymentGatewayAdapter = makeMockPaymentGatewayAdapter();
    const paymentRepository = makeMockPaymentRepository();
    const walletClient = makeSuccessWalletClient();

    const saga = new PaymentSaga(paymentGatewayAdapter, paymentRepository, walletClient as any);

    const payment = new Payment({
      id: 'pay-mobile-001',
      orderId: 'ord-mobile-001',
      buyerId: 'buyer-mobile-001',
      amount: 100000, // must clear the 50,000 TZS global minimum basket (MIN_BASKET_VALUE_TZS)
      currency: 'TZS',
      method: PaymentMethod.MOBILE_MONEY,
      status: PaymentStatus.PENDING
    });

    await saga.start({ payment });
    await drainAsync();

    expect(paymentGatewayAdapter.processPayment).toHaveBeenCalledTimes(1);
    expect(walletClient.debitWallet).not.toHaveBeenCalled();
  });
});

// ─── Preservation C — Successful WALLET order (walletClient present) ──────────
//
// For all random buyerId/amount/currency combinations with paymentMethod: 'WALLET'
// and a mock walletClient that succeeds, assert HTTP 201 is returned,
// debitWallet is called exactly once, and the order is persisted.
//
// Validates: Requirements 3.3

describe('Preservation C — Successful WALLET order: debitWallet called once, order persisted', () => {
  /**
   * **Validates: Requirements 3.3**
   *
   * Property: For any buyerId/amount/currency with paymentMethod: 'WALLET' and a
   * walletClient that succeeds, debitWallet MUST be called exactly once with the
   * correct arguments, and the order MUST be persisted.
   */
  it('PBT: debitWallet called exactly once and order persisted for any successful WALLET order', async () => {
    await fc.assert(
      fc.asyncProperty(buyerIdArb, amountArb, currencyArb, async (buyerId, amount, currency) => {
        const bundle = makeCheckoutUseCase({
          order: makeVerifiedOrder({ buyerId, totalAmount: { amount, currency } }),
        });

        const result = await confirmCheckout(bundle);

        // ASSERTION: debitWallet must be called exactly once
        expect(bundle.walletClient.debitWallet).toHaveBeenCalledTimes(1);

        // ASSERTION: debitWallet must be called with the correct buyer, amount and
        // currency. The fifth argument is the order id, stored as the transaction's
        // referenceId so a later cancellation can find the debit and refund it.
        expect(bundle.walletClient.debitWallet).toHaveBeenCalledWith(
          buyerId,
          amount,
          currency,
          expect.stringContaining('Payment for order'),
          'order-test-001'
        );

        // ASSERTION: order must be persisted and confirmed
        expect(bundle.orderRepository.update).toHaveBeenCalledTimes(1);
        expect(bundle.order.status).toBe(OrderStatus.CONFIRMED);

        // ASSERTION: result must identify the confirmed order
        expect(result.orderId).toBe('order-test-001');
        expect(result.newStatus).toBe(OrderStatus.CONFIRMED);
      }),
      { numRuns: 10 }
    );
  });

  it('Unit: Successful WALLET order returns orderId, debitWallet called once, order saved', async () => {
    const bundle = makeCheckoutUseCase();

    const result = await confirmCheckout(bundle);

    expect(bundle.walletClient.debitWallet).toHaveBeenCalledTimes(1);
    expect(bundle.walletClient.debitWallet).toHaveBeenCalledWith(
      'buyer-test-001',
      100000,
      'TZS',
      expect.stringContaining('Payment for order'),
      'order-test-001'
    );
    expect(bundle.orderRepository.update).toHaveBeenCalledTimes(1);
    expect(result.orderId).toBe('order-test-001');
    expect(result.newStatus).toBe(OrderStatus.CONFIRMED);
  });
});

// ─── Preservation D — Failed WALLET order (walletClient throws) ───────────────
//
// For all random inputs with paymentMethod: 'WALLET' and a mock walletClient that
// throws (insufficient funds), assert that an error response is returned and the
// order is NOT persisted.
//
// Validates: Requirements 3.4

describe('Preservation D — Failed WALLET order: error returned, order NOT persisted', () => {
  /**
   * **Validates: Requirements 3.4**
   *
   * Property: For any buyerId/amount/currency with paymentMethod: 'WALLET' and a
   * walletClient that throws, execute() MUST throw and orderRepository.save MUST
   * NOT be called.
   */
  it('PBT: execute throws and order is not saved when walletClient throws for any input', async () => {
    await fc.assert(
      fc.asyncProperty(buyerIdArb, amountArb, currencyArb, async (buyerId, amount, currency) => {
        const bundle = makeCheckoutUseCase({
          order: makeVerifiedOrder({ buyerId, totalAmount: { amount, currency } }),
          // Neither 'Insufficient funds' nor a generic outage is a lock/contention/
          // timeout error, so the use case must not retry — one failed debit is one
          // failed attempt. A message containing any of those words would legitimately
          // be retried once and would change the expected call count.
          walletClient: makeFailingWalletClient('Insufficient funds'),
        });

        // ASSERTION: must throw when walletClient fails
        await expect(confirmCheckout(bundle)).rejects.toThrow(/Wallet payment failed/i);

        // ASSERTION: order must NOT be persisted
        expect(bundle.orderRepository.update).not.toHaveBeenCalled();
      }),
      { numRuns: 10 }
    );
  });

  it('Unit: Failed WALLET order (insufficient funds) throws and does not save order', async () => {
    const bundle = makeCheckoutUseCase({
      walletClient: makeFailingWalletClient('Insufficient funds'),
    });

    await expect(confirmCheckout(bundle)).rejects.toThrow(/Wallet payment failed|Insufficient funds/i);
    expect(bundle.orderRepository.update).not.toHaveBeenCalled();
  });

  it('Unit: Failed WALLET order (service unavailable) throws and does not save order', async () => {
    const bundle = makeCheckoutUseCase({
      walletClient: makeFailingWalletClient('Wallet service unavailable'),
    });

    await expect(confirmCheckout(bundle)).rejects.toThrow(/Wallet payment failed|Wallet service unavailable/i);
    expect(bundle.orderRepository.update).not.toHaveBeenCalled();
  });

  it('Unit: WALLET order with no wallet client fails closed with PAYMENT_UNAVAILABLE', async () => {
    // Mirrors the production guard at buyer-confirm-checkout.use-case.ts:98-100. A
    // missing client must fail closed rather than silently confirming an unpaid
    // order, which is the silent-failure class this suite exists to prevent.
    const bundle = makeCheckoutUseCase();
    const useCase = new BuyerConfirmCheckoutUseCase(
      bundle.orderRepository,
      bundle.auditLogRepository,
      bundle.eventPublisher,
      undefined,
      undefined,
      undefined,
    );

    await expect(
      useCase.execute({ orderId: 'order-test-001', buyerId: 'buyer-test-001' } as any),
    ).rejects.toMatchObject({ code: 'PAYMENT_UNAVAILABLE', statusCode: 503 });
    expect(bundle.orderRepository.update).not.toHaveBeenCalled();
  });

  it('Unit: a transient lock error is retried once before the order is rejected', async () => {
    // The retry is deliberate and narrow: only lock/contention/timeout messages are
    // retried, and only once. This pins both halves — a contention error succeeds
    // on the second attempt, and the caller is charged exactly once overall.
    const walletClient = makeFailingWalletClient('Wallet lock contention');
    walletClient.debitWallet
      .mockRejectedValueOnce(new Error('Wallet lock contention'))
      .mockResolvedValueOnce('TX_RETRY_001');

    const bundle = makeCheckoutUseCase({ walletClient });

    await confirmCheckout(bundle);

    expect(walletClient.debitWallet).toHaveBeenCalledTimes(2);
    expect(bundle.orderRepository.update).toHaveBeenCalledTimes(1);
  });
});

// ─── Preservation E — Saga step progression ───────────────────────────────────
//
// Assert that OrderFulfillmentSaga step order (StockReservation → Payment → Delivery)
// is unchanged for COD, CARD, and MOBILE_PAYMENT orders.
//
// Validates: Requirements 3.5, 3.6

describe('Preservation E — Saga step progression: StockReservation → Payment → Delivery unchanged', () => {
  /**
   * **Validates: Requirements 3.5, 3.6**
   *
   * Property: OrderFulfillmentSaga must define exactly three steps in the order:
   * StockReservation, Payment, Delivery — for all payment methods.
   */
  it('Unit: OrderFulfillmentSaga defines steps in correct order: StockReservation → Payment → Delivery', () => {
    // We inspect the saga steps by accessing the protected defineSteps method
    // via a test subclass
    class TestableOrderFulfillmentSaga extends OrderFulfillmentSaga {
      public getStepNames(): string[] {
        return this.defineSteps().map(step => step.name);
      }
    }

    const mockEventIdempotency = {
      withIdempotency: jest.fn().mockImplementation((_key: string, _op: string, fn: () => Promise<void>) => fn())
    } as any;

    const saga = new TestableOrderFulfillmentSaga(mockEventIdempotency);
    const stepNames = saga.getStepNames();

    // ASSERTION: exactly 3 steps
    expect(stepNames).toHaveLength(3);

    // ASSERTION: steps in correct order
    expect(stepNames[0]).toBe('StockReservation');
    expect(stepNames[1]).toBe('Payment');
    expect(stepNames[2]).toBe('Delivery');
  });

  it('Unit: OrderFulfillmentSaga step names are unchanged regardless of payment method', () => {
    class TestableOrderFulfillmentSaga extends OrderFulfillmentSaga {
      public getStepNames(): string[] {
        return this.defineSteps().map(step => step.name);
      }
    }

    const mockEventIdempotency = {
      withIdempotency: jest.fn().mockImplementation((_key: string, _op: string, fn: () => Promise<void>) => fn())
    } as any;

    const saga = new TestableOrderFulfillmentSaga(mockEventIdempotency);
    const stepNames = saga.getStepNames();

    // The saga step progression must be the same regardless of payment method
    // (payment method routing happens inside the Payment step, not at the saga level)
    expect(stepNames).toEqual(['StockReservation', 'Payment', 'Delivery']);
  });

  it('PBT: OrderFulfillmentSaga always has 3 steps in the same order for any payload', async () => {
    class TestableOrderFulfillmentSaga extends OrderFulfillmentSaga {
      public getStepNames(): string[] {
        return this.defineSteps().map(step => step.name);
      }
    }

    const mockEventIdempotency = {
      withIdempotency: jest.fn().mockImplementation((_key: string, _op: string, fn: () => Promise<void>) => fn())
    } as any;

    await fc.assert(
      fc.asyncProperty(buyerIdArb, sellerIdArb, amountArb, async (_buyerId, _sellerId, _amount) => {
        const saga = new TestableOrderFulfillmentSaga(mockEventIdempotency);
        const stepNames = saga.getStepNames();

        // ASSERTION: step order is always StockReservation → Payment → Delivery
        expect(stepNames).toEqual(['StockReservation', 'Payment', 'Delivery']);
        expect(stepNames).toHaveLength(3);
      }),
      { numRuns: 10 }
    );
  });

  it('Unit: PaymentSaga defines FraudCheck and ProcessPayment steps in correct order', () => {
    class TestablePaymentGatewaySaga extends PaymentSaga {
      public getStepNames(): string[] {
        return this.defineSteps().map(step => step.name);
      }
    }

    const paymentGatewayAdapter = makeMockPaymentGatewayAdapter();
    const paymentRepository = makeMockPaymentRepository();
    const walletClient = makeSuccessWalletClient();

    const saga = new TestablePaymentGatewaySaga(paymentGatewayAdapter, paymentRepository, walletClient as any);
    const stepNames = saga.getStepNames();

    // ASSERTION: PaymentSaga steps are FraudCheck → ProcessPayment
    expect(stepNames).toHaveLength(2);
    expect(stepNames[0]).toBe('FraudCheck');
    expect(stepNames[1]).toBe('ProcessPayment');
  });

  it('Unit: COD payment in PaymentSaga completes ProcessPayment step without calling PaymentGateway or debitWallet', async () => {
    const paymentGatewayAdapter = makeMockPaymentGatewayAdapter();
    const paymentRepository = makeMockPaymentRepository();
    const walletClient = makeSuccessWalletClient();

    const saga = new PaymentSaga(paymentGatewayAdapter, paymentRepository, walletClient as any);

    const payment = new Payment({
      id: 'pay-cod-001',
      orderId: 'ord-cod-001',
      buyerId: 'buyer-cod-001',
      amount: 100000, // must clear the 50,000 TZS global minimum basket (MIN_BASKET_VALUE_TZS)
      currency: 'TZS',
      method: PaymentMethod.COD,
      status: PaymentStatus.PENDING
    });

    await saga.start({ payment });
    await drainAsync();

    // ASSERTION: neither PaymentGateway nor wallet debit should be called for COD
    expect(paymentGatewayAdapter.processPayment).not.toHaveBeenCalled();
    expect(walletClient.debitWallet).not.toHaveBeenCalled();

    // ASSERTION: payment should be persisted as COMPLETED for COD
    const upsertCalls = (paymentRepository.upsert as jest.Mock).mock.calls;
    const finalUpsert = upsertCalls[upsertCalls.length - 1];
    if (finalUpsert) {
      const savedPayment = finalUpsert[0] as Payment;
      expect(savedPayment.status).toBe(PaymentStatus.COMPLETED);
    }
  });
});
