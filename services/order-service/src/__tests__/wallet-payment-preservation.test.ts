/**
 * Preservation Property Tests — Wallet Payment Silent Failure Bugfix
 *
 * These tests MUST PASS on the current (unfixed/fixed) code.
 * They confirm baseline behavior to preserve after the fix is applied.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import * as fc from 'fast-check';
import { Payment, PaymentMethod, PaymentStatus } from '../domain/entities/payment.entity';
import { PaymentSaga } from '../application/sagas/payment.saga';
import { PlaceOrderUseCase, PlaceOrderRequest } from '../application/use-cases/place-order.use-case';
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
const amountArb = fc.integer({ min: 1000, max: 500000 });
const currencyArb = fc.constantFrom('TZS', 'USD', 'KES', 'EUR');
const itemsArb = fc.array(
  fc.record({
    productId: fc.stringMatching(/^[a-z0-9]{4,12}$/).map((s: string) => 'prod-' + s),
    quantity: fc.integer({ min: 1, max: 10 }),
    price: fc.integer({ min: 100, max: 50000 }),
    weight: fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true })
  }),
  { minLength: 1, maxLength: 5 }
);

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

function makeMockOrderRepository() {
  return {
    save: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValue(null),
    findByTrackingNumber: jest.fn().mockResolvedValue(null)
  } as any;
}

function makeMockEventPublisher() {
  return {
    publish: jest.fn().mockResolvedValue(undefined)
  } as any;
}

function makeMockSagaOrchestrator() {
  return {
    start: jest.fn().mockResolvedValue(undefined)
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

function makeBaseRequest(overrides: Partial<PlaceOrderRequest> = {}): PlaceOrderRequest {
  return {
    buyerId: 'buyer-test-001',
    sellerId: 'seller-test-001',
    items: [{ productId: 'prod-001', quantity: 1, price: 5000, weight: 1 }],
    currency: 'TZS',
    paymentMethod: 'COD',
    deliveryFee: 2000,
    deliveryAddress: { street: '1 Main St', city: 'Dar es Salaam', postalCode: '11101', country: 'TZ' },
    ...overrides
  };
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
   * Property: For any buyerId/sellerId/items combination with paymentMethod: 'COD',
   * walletClient.debitWallet MUST NOT be called, COD eligibility checks MUST run,
   * and commitment fee MUST be secured.
   */
  it('PBT: debitWallet is never called for any COD order', async () => {
    await fc.assert(
      fc.asyncProperty(buyerIdArb, sellerIdArb, itemsArb, async (buyerId, sellerId, items) => {
        const orderRepository = makeMockOrderRepository();
        const eventPublisher = makeMockEventPublisher();
        const sagaOrchestrator = makeMockSagaOrchestrator();
        const codEligibilityEngine = makeMockCODEligibilityEngine();
        const codCommitmentService = makeMockCODCommitmentService();
        const walletClient = makeSuccessWalletClient();

        const useCase = new PlaceOrderUseCase(
          orderRepository,
          eventPublisher,
          sagaOrchestrator,
          codEligibilityEngine,
          codCommitmentService,
          walletClient as any
        );

        const request = makeBaseRequest({
          buyerId,
          sellerId,
          items,
          paymentMethod: 'COD',
          deliveryFee: 2000
        });

        await useCase.execute(request);

        // ASSERTION: debitWallet must NEVER be called for COD orders
        expect(walletClient.debitWallet).not.toHaveBeenCalled();

        // ASSERTION: COD eligibility checks must run
        expect(codEligibilityEngine.checkBuyerEligibility).toHaveBeenCalledWith(buyerId);
        expect(codEligibilityEngine.checkSellerEligibility).toHaveBeenCalledWith(sellerId);

        // ASSERTION: commitment fee must be secured
        expect(codCommitmentService.secureCommitment).toHaveBeenCalled();

        // ASSERTION: order must be saved
        expect(orderRepository.save).toHaveBeenCalled();
      }),
      { numRuns: 10 }
    );
  });

  it('Unit: COD order does not call debitWallet and runs eligibility checks', async () => {
    const orderRepository = makeMockOrderRepository();
    const eventPublisher = makeMockEventPublisher();
    const sagaOrchestrator = makeMockSagaOrchestrator();
    const codEligibilityEngine = makeMockCODEligibilityEngine();
    const codCommitmentService = makeMockCODCommitmentService();
    const walletClient = makeSuccessWalletClient();

    const useCase = new PlaceOrderUseCase(
      orderRepository,
      eventPublisher,
      sagaOrchestrator,
      codEligibilityEngine,
      codCommitmentService,
      walletClient as any
    );

    const request = makeBaseRequest({ paymentMethod: 'COD', deliveryFee: 2000 });
    await useCase.execute(request);

    expect(walletClient.debitWallet).not.toHaveBeenCalled();
    expect(codEligibilityEngine.checkBuyerEligibility).toHaveBeenCalledWith('buyer-test-001');
    expect(codEligibilityEngine.checkSellerEligibility).toHaveBeenCalledWith('seller-test-001');
    expect(codCommitmentService.secureCommitment).toHaveBeenCalled();
    expect(orderRepository.save).toHaveBeenCalled();
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
      amount: 10000,
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
      amount: 10000,
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
        const orderRepository = makeMockOrderRepository();
        const eventPublisher = makeMockEventPublisher();
        const sagaOrchestrator = makeMockSagaOrchestrator();
        const codEligibilityEngine = makeMockCODEligibilityEngine();
        const codCommitmentService = makeMockCODCommitmentService();
        const walletClient = makeSuccessWalletClient();

        const useCase = new PlaceOrderUseCase(
          orderRepository,
          eventPublisher,
          sagaOrchestrator,
          codEligibilityEngine,
          codCommitmentService,
          walletClient as any
        );

        const request = makeBaseRequest({
          buyerId,
          items: [{ productId: 'prod-001', quantity: 1, price: amount, weight: 1 }],
          currency,
          paymentMethod: 'WALLET'
        });

        const result = await useCase.execute(request);

        // ASSERTION: debitWallet must be called exactly once
        expect(walletClient.debitWallet).toHaveBeenCalledTimes(1);

        // ASSERTION: debitWallet must be called with the correct buyerId and currency
        expect(walletClient.debitWallet).toHaveBeenCalledWith(
          buyerId,
          expect.any(Number),
          currency,
          expect.any(String)
        );

        // ASSERTION: order must be persisted
        expect(orderRepository.save).toHaveBeenCalledTimes(1);

        // ASSERTION: result must contain orderId and deliveryCode (HTTP 201 equivalent)
        expect(result.orderId).toBeDefined();
        expect(result.deliveryCode).toBeDefined();
        expect(result.status).toBeDefined();
      }),
      { numRuns: 10 }
    );
  });

  it('Unit: Successful WALLET order returns orderId, debitWallet called once, order saved', async () => {
    const orderRepository = makeMockOrderRepository();
    const eventPublisher = makeMockEventPublisher();
    const sagaOrchestrator = makeMockSagaOrchestrator();
    const codEligibilityEngine = makeMockCODEligibilityEngine();
    const codCommitmentService = makeMockCODCommitmentService();
    const walletClient = makeSuccessWalletClient();

    const useCase = new PlaceOrderUseCase(
      orderRepository,
      eventPublisher,
      sagaOrchestrator,
      codEligibilityEngine,
      codCommitmentService,
      walletClient as any
    );

    const request = makeBaseRequest({ paymentMethod: 'WALLET' });
    const result = await useCase.execute(request);

    expect(walletClient.debitWallet).toHaveBeenCalledTimes(1);
    expect(walletClient.debitWallet).toHaveBeenCalledWith(
      'buyer-test-001',
      5000,
      'TZS',
      expect.stringContaining('Payment for order')
    );
    expect(orderRepository.save).toHaveBeenCalledTimes(1);
    expect(result.orderId).toBeDefined();
    expect(result.deliveryCode).toBeDefined();
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
        const orderRepository = makeMockOrderRepository();
        const eventPublisher = makeMockEventPublisher();
        const sagaOrchestrator = makeMockSagaOrchestrator();
        const codEligibilityEngine = makeMockCODEligibilityEngine();
        const codCommitmentService = makeMockCODCommitmentService();
        const walletClient = makeFailingWalletClient('Insufficient funds');

        const useCase = new PlaceOrderUseCase(
          orderRepository,
          eventPublisher,
          sagaOrchestrator,
          codEligibilityEngine,
          codCommitmentService,
          walletClient as any
        );

        const request = makeBaseRequest({
          buyerId,
          items: [{ productId: 'prod-001', quantity: 1, price: amount, weight: 1 }],
          currency,
          paymentMethod: 'WALLET'
        });

        // ASSERTION: must throw when walletClient fails
        await expect(useCase.execute(request)).rejects.toThrow();

        // ASSERTION: order must NOT be persisted
        expect(orderRepository.save).not.toHaveBeenCalled();
      }),
      { numRuns: 10 }
    );
  });

  it('Unit: Failed WALLET order (insufficient funds) throws and does not save order', async () => {
    const orderRepository = makeMockOrderRepository();
    const eventPublisher = makeMockEventPublisher();
    const sagaOrchestrator = makeMockSagaOrchestrator();
    const codEligibilityEngine = makeMockCODEligibilityEngine();
    const codCommitmentService = makeMockCODCommitmentService();
    const walletClient = makeFailingWalletClient('Insufficient funds');

    const useCase = new PlaceOrderUseCase(
      orderRepository,
      eventPublisher,
      sagaOrchestrator,
      codEligibilityEngine,
      codCommitmentService,
      walletClient as any
    );

    const request = makeBaseRequest({ paymentMethod: 'WALLET' });

    await expect(useCase.execute(request)).rejects.toThrow(/Wallet payment failed|Insufficient funds/i);
    expect(orderRepository.save).not.toHaveBeenCalled();
  });

  it('Unit: Failed WALLET order (service unavailable) throws and does not save order', async () => {
    const orderRepository = makeMockOrderRepository();
    const eventPublisher = makeMockEventPublisher();
    const sagaOrchestrator = makeMockSagaOrchestrator();
    const codEligibilityEngine = makeMockCODEligibilityEngine();
    const codCommitmentService = makeMockCODCommitmentService();
    const walletClient = makeFailingWalletClient('Wallet service unavailable');

    const useCase = new PlaceOrderUseCase(
      orderRepository,
      eventPublisher,
      sagaOrchestrator,
      codEligibilityEngine,
      codCommitmentService,
      walletClient as any
    );

    const request = makeBaseRequest({ paymentMethod: 'WALLET' });

    await expect(useCase.execute(request)).rejects.toThrow();
    expect(orderRepository.save).not.toHaveBeenCalled();
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
      amount: 10000,
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
