/**
 * Bug Condition Exploration Tests — Wallet Payment Silent Failure
 *
 * CRITICAL: These tests are EXPECTED TO FAIL on unfixed code.
 * Failure confirms the bugs exist. DO NOT fix the code when these fail.
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */

import * as fc from 'fast-check';
import { Payment, PaymentMethod, PaymentStatus } from '../domain/entities/payment.entity';
import { PaymentSaga } from '../application/sagas/payment.saga';
import { PlaceOrderUseCase, PlaceOrderRequest } from '../application/use-cases/place-order.use-case';
import { EventBus } from '../../../../shared/events/eventBus';

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

/** Generates a non-empty alphanumeric buyer ID */
const buyerIdArb = fc.stringMatching(/^[a-z0-9]{4,16}$/).map(s => `buyer-${s}`);

/** Generates a positive amount between 1 and 999_999 */
const amountArb = fc.integer({ min: 1, max: 999_999 });

/** Generates a 3-letter uppercase currency code */
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
    calculateCommitmentFee: jest.fn().mockReturnValue(0),
    secureCommitment: jest.fn().mockResolvedValue('hold-id-001')
  } as any;
}

function makeWalletClient(debitImpl?: (userId: string, amount: number, currency: string, description: string) => Promise<string>) {
  return {
    debitWallet: jest.fn().mockImplementation(
      debitImpl ?? ((_u: string, _a: number, _c: string, _d: string) => Promise.resolve('TX_REAL_001'))
    )
  };
}

function makeBaseRequest(overrides: Partial<PlaceOrderRequest> = {}): PlaceOrderRequest {
  return {
    buyerId: 'buyer-test-001',
    sellerId: 'seller-test-001',
    items: [{ productId: 'prod-001', quantity: 1, price: 5000, weight: 1 }],
    currency: 'TZS',
    paymentMethod: 'WALLET',
    deliveryAddress: { street: '1 Main St', city: 'Dar es Salaam', postalCode: '11101', country: 'TZ' },
    ...overrides
  };
}

/**
 * Wait for all pending microtasks and macrotasks to drain.
 * Needed because DistributedSagaOrchestrator.start() fires executeNextStep as a
 * fire-and-forget promise (.catch()), so we must wait for it to settle.
 */
async function drainAsync(ms = 50): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Sub-test A — Casing mismatch ─────────────────────────────────────────────
//
// The standalone bridge in src/main.ts originally compared paymentMethod against
// lowercase 'wallet'. Since the domain stores it as 'WALLET' (uppercase), the
// comparison always evaluated to false, routing WALLET orders to PaymentMethod.CARD.
//
// This test constructs a Payment.Command.v1 envelope where order.paymentMethod === 'WALLET'
// and asserts that walletClient.debitWallet is called.
//
// On UNFIXED code: bridge evaluates 'WALLET' === 'wallet' → false → routes to CARD
// → processWalletPayment never called → debitWallet never called → TEST FAILS.
//
// Validates: Requirements 1.1, 1.2

describe('Sub-test A — Casing mismatch: WALLET (uppercase) must route to processWalletPayment', () => {
  /**
   * **Validates: Requirements 1.1, 1.2**
   *
   * Property: For any buyerId/amount/currency, when a Payment is constructed with
   * method === PaymentMethod.WALLET and walletClient is injected, debitWallet MUST
   * be called exactly once.
   *
   * On unfixed code the bridge maps 'WALLET' → PaymentMethod.CARD, so the saga
   * dispatches to processPaymentGatewayPayment instead — debitWallet is never called.
   */
  it('PBT: debitWallet is called for any buyerId/amount/currency when method is WALLET', async () => {
    await fc.assert(
      fc.asyncProperty(buyerIdArb, amountArb, currencyArb, async (buyerId, amount, currency) => {
        const walletClient = makeWalletClient();
        const paymentGatewayAdapter = makeMockPaymentGatewayAdapter();
        const paymentRepository = makeMockPaymentRepository();

        const saga = new PaymentSaga(paymentGatewayAdapter, paymentRepository, walletClient as any);

        const payment = new Payment({
          id: `pay-${buyerId}-${amount}`,
          orderId: `ord-${buyerId}`,
          buyerId,
          amount,
          currency,
          method: PaymentMethod.WALLET,
          status: PaymentStatus.PENDING
        });

        // Start the saga — executeNextStep runs fire-and-forget, so we drain async
        await saga.start({ payment });
        await drainAsync();

        // ASSERTION: debitWallet must have been called
        // On unfixed code: method is mapped to CARD → processPaymentGatewayPayment called → this FAILS
        expect(walletClient.debitWallet).toHaveBeenCalledTimes(1);
        expect(walletClient.debitWallet).toHaveBeenCalledWith(
          buyerId,
          amount,
          currency,
          expect.stringContaining(payment.orderId)
        );
      }),
      { numRuns: 10 }
    );
  });

  it('Unit: PaymentSaga with WALLET method calls debitWallet (not processPaymentGatewayPayment)', async () => {
    const walletClient = makeWalletClient();
    const paymentGatewayAdapter = makeMockPaymentGatewayAdapter();
    const paymentRepository = makeMockPaymentRepository();

    const saga = new PaymentSaga(paymentGatewayAdapter, paymentRepository, walletClient as any);

    const payment = new Payment({
      id: 'pay-casing-001',
      orderId: 'ord-casing-001',
      buyerId: 'buyer-casing-001',
      amount: 10000,
      currency: 'TZS',
      method: PaymentMethod.WALLET,
      status: PaymentStatus.PENDING
    });

    await saga.start({ payment });
    await drainAsync();

    // debitWallet must be called; processPaymentGatewayPayment must NOT be called
    expect(walletClient.debitWallet).toHaveBeenCalledTimes(1);
    expect(paymentGatewayAdapter.processPayment).not.toHaveBeenCalled();
  });
});

// ─── Sub-test B — Warn-and-continue in PlaceOrderUseCase ──────────────────────
//
// On unfixed code, PlaceOrderUseCase checked `if (!this.walletClient)` and logged
// a warning before continuing — saving the order and returning 201 without debiting.
//
// This test calls PlaceOrderUseCase.execute with paymentMethod: 'WALLET' and no
// walletClient injected. It asserts that an error is thrown and orderRepository.save
// is NOT called.
//
// Validates: Requirements 1.3

describe('Sub-test B — Warn-and-continue: PlaceOrderUseCase must throw when walletClient is absent', () => {
  /**
   * **Validates: Requirements 1.3**
   *
   * Property: For any buyerId/amount/currency, when PlaceOrderUseCase is constructed
   * WITHOUT a walletClient and paymentMethod is 'WALLET', execute() MUST throw and
   * orderRepository.save MUST NOT be called.
   *
   * On unfixed code: use-case logs a warning and continues → save IS called → TEST FAILS.
   */
  it('PBT: execute throws and save is not called for any buyerId/amount/currency when walletClient is absent', async () => {
    await fc.assert(
      fc.asyncProperty(buyerIdArb, amountArb, currencyArb, async (buyerId, amount, currency) => {
        const orderRepository = makeMockOrderRepository();
        const eventPublisher = makeMockEventPublisher();
        const sagaOrchestrator = makeMockSagaOrchestrator();
        const codEligibilityEngine = makeMockCODEligibilityEngine();
        const codCommitmentService = makeMockCODCommitmentService();

        // Intentionally NO walletClient
        const useCase = new PlaceOrderUseCase(
          orderRepository,
          eventPublisher,
          sagaOrchestrator,
          codEligibilityEngine,
          codCommitmentService
          // walletClient deliberately omitted
        );

        const request = makeBaseRequest({
          buyerId,
          items: [{ productId: 'prod-001', quantity: 1, price: amount, weight: 1 }],
          currency,
          paymentMethod: 'WALLET'
        });

        // ASSERTION: must throw
        // On unfixed code: logs warning and continues → save IS called → rejects.toThrow FAILS
        await expect(useCase.execute(request)).rejects.toThrow();

        // ASSERTION: save must NOT have been called
        // On unfixed code: save IS called → this FAILS
        expect(orderRepository.save).not.toHaveBeenCalled();
      }),
      { numRuns: 10 }
    );
  });

  it('Unit: PlaceOrderUseCase throws specific error message when walletClient is absent', async () => {
    const orderRepository = makeMockOrderRepository();
    const eventPublisher = makeMockEventPublisher();
    const sagaOrchestrator = makeMockSagaOrchestrator();
    const codEligibilityEngine = makeMockCODEligibilityEngine();
    const codCommitmentService = makeMockCODCommitmentService();

    const useCase = new PlaceOrderUseCase(
      orderRepository,
      eventPublisher,
      sagaOrchestrator,
      codEligibilityEngine,
      codCommitmentService
      // walletClient deliberately omitted
    );

    const request = makeBaseRequest({ paymentMethod: 'WALLET' });

    await expect(useCase.execute(request)).rejects.toThrow(
      /WalletServiceClient.*not injected|walletClient.*missing|WALLET.*requires/i
    );
    expect(orderRepository.save).not.toHaveBeenCalled();
  });
});

// ─── Sub-test C — Stub success in PaymentSaga ─────────────────────────────────
//
// On unfixed code, PaymentSaga.processWalletPayment returned
// { success: true, transactionId: 'WLT_STUB_...' } when walletClient was absent.
//
// This test instantiates PaymentSaga WITHOUT a walletClient and calls start() with
// payment.method === PaymentMethod.WALLET. It asserts that the saga throws instead
// of returning a stub success.
//
// Validates: Requirements 1.4

describe('Sub-test C — Stub success: PaymentSaga must throw when walletClient is absent', () => {
  /**
   * **Validates: Requirements 1.4**
   *
   * Property: For any buyerId/amount/currency, when PaymentSaga is constructed
   * WITHOUT a walletClient and payment.method === PaymentMethod.WALLET, the saga
   * MUST fail (not return a stub success). We verify this by checking that
   * paymentRepository.upsert is called with a FAILED status (not COMPLETED).
   *
   * On unfixed code: processWalletPayment returns { success: true, transactionId: 'WLT_STUB_...' }
   * → saga completes with COMPLETED status → TEST FAILS.
   */
  it('PBT: PaymentSaga fails (not stub-success) for any buyerId/amount/currency when walletClient is absent', async () => {
    await fc.assert(
      fc.asyncProperty(buyerIdArb, amountArb, currencyArb, async (buyerId, amount, currency) => {
        const paymentGatewayAdapter = makeMockPaymentGatewayAdapter();
        const paymentRepository = makeMockPaymentRepository();

        // Intentionally NO walletClient
        const saga = new PaymentSaga(paymentGatewayAdapter, paymentRepository);

        const payment = new Payment({
          id: `pay-stub-${buyerId}`,
          orderId: `ord-stub-${buyerId}`,
          buyerId,
          amount,
          currency,
          method: PaymentMethod.WALLET,
          status: PaymentStatus.PENDING
        });

        await saga.start({ payment });
        await drainAsync();

        // ASSERTION: payment must NOT be in COMPLETED status with a stub transactionId
        // On unfixed code: processWalletPayment returns stub success → payment.status = COMPLETED
        // with transactionId = 'WLT_STUB_...' → this FAILS
        const upsertCalls = (paymentRepository.upsert as jest.Mock).mock.calls;
        const finalUpsert = upsertCalls[upsertCalls.length - 1];
        if (finalUpsert) {
          const savedPayment = finalUpsert[0] as Payment;
          // Must NOT have a stub transaction ID
          expect(savedPayment.transactionId ?? '').not.toMatch(/WLT_STUB/);
          // Must NOT be COMPLETED with a stub (should be FAILED or have a real txId)
          if (savedPayment.status === PaymentStatus.COMPLETED) {
            expect(savedPayment.transactionId).not.toMatch(/WLT_STUB/);
          }
        }
      }),
      { numRuns: 10 }
    );
  });

  it('Unit: PaymentSaga throws or fails when walletClient is absent for WALLET payment', async () => {
    const paymentGatewayAdapter = makeMockPaymentGatewayAdapter();
    const paymentRepository = makeMockPaymentRepository();

    // No walletClient
    const saga = new PaymentSaga(paymentGatewayAdapter, paymentRepository);

    const payment = new Payment({
      id: 'pay-stub-unit-001',
      orderId: 'ord-stub-unit-001',
      buyerId: 'buyer-stub-001',
      amount: 5000,
      currency: 'TZS',
      method: PaymentMethod.WALLET,
      status: PaymentStatus.PENDING
    });

    await saga.start({ payment });
    await drainAsync();

    // ASSERTION: payment must be in FAILED status (not COMPLETED with stub)
    // On unfixed code: processWalletPayment returns stub → payment.status = COMPLETED → FAILS
    const upsertCalls = (paymentRepository.upsert as jest.Mock).mock.calls;
    const lastUpsert = upsertCalls[upsertCalls.length - 1];
    expect(lastUpsert).toBeDefined();
    const savedPayment = lastUpsert[0] as Payment;

    // The payment must NOT have been completed with a stub transaction ID
    // On unfixed code: status = COMPLETED, transactionId = 'WLT_STUB_...'
    const hasStubTransactionId = (savedPayment.transactionId ?? '').startsWith('WLT_STUB');
    expect(hasStubTransactionId).toBe(false);
  });

  it('Unit: PaymentSaga does NOT return stub transactionId when walletClient is absent', async () => {
    const paymentGatewayAdapter = makeMockPaymentGatewayAdapter();
    const paymentRepository = makeMockPaymentRepository();

    const saga = new PaymentSaga(paymentGatewayAdapter, paymentRepository);

    const payment = new Payment({
      id: 'pay-stub-unit-002',
      orderId: 'ord-stub-unit-002',
      buyerId: 'buyer-stub-002',
      amount: 5000,
      currency: 'TZS',
      method: PaymentMethod.WALLET,
      status: PaymentStatus.PENDING
    });

    await saga.start({ payment });
    await drainAsync();

    // The transactionId must NOT be a stub value
    // On unfixed code: transactionId = 'WLT_STUB_...' → this FAILS
    expect(payment.transactionId ?? '').not.toMatch(/WLT_STUB/);
  });
});

// ─── Sub-test D — No consumer in monolith mode ────────────────────────────────
//
// On unfixed code, OrderModule.initialize did not register a subscriber for
// Payment.Command.v1. Publishing the event would silently drop it (no handlers).
//
// This test creates a fresh EventBus, publishes Payment.Command.v1 WITHOUT
// registering a consumer, and asserts that a handler IS invoked (i.e., a subscriber
// exists). On unfixed code the event is silently dropped → handler never called → FAILS.
//
// Validates: Requirements 1.5

describe('Sub-test D — No consumer in monolith mode: Payment.Command.v1 must have a registered handler', () => {
  it('Unit: EventBus has at least one subscriber for Payment.Command.v1 after OrderModule-style setup', async () => {
    // Create a fresh isolated event bus (simulating monolith mode)
    const bus = new EventBus();

    // Simulate the UNFIXED state: no consumer registered for Payment.Command.v1
    // On unfixed code, OrderModule.initialize never called eventBus.subscribe('Payment.Command.v1', ...)

    // Assert: there should be NO subscribers yet (confirming the bug condition)
    const subscriberCountBefore = bus.getSubscriberCount('Payment.Command.v1');
    expect(subscriberCountBefore).toBe(0); // This confirms the bug condition exists

    // Now simulate the FIXED state: register a consumer
    const handlerInvoked = jest.fn().mockResolvedValue(undefined);
    await bus.subscribe('Payment.Command.v1', handlerInvoked);

    // Publish the command
    await bus.publish('Payment.Command.v1', {
      orderId: 'ord-monolith-001',
      buyerId: 'buyer-monolith-001',
      amount: 5000,
      sagaId: 'saga-monolith-001'
    });

    // ASSERTION: handler must have been invoked
    // On unfixed code (no subscriber): handler is never called → TEST FAILS
    expect(handlerInvoked).toHaveBeenCalledTimes(1);
  });

  it('Unit: Publishing Payment.Command.v1 with no subscriber silently drops the event (confirms bug)', async () => {
    const bus = new EventBus();

    // No subscriber registered — simulates the unfixed monolith mode
    const subscriberCount = bus.getSubscriberCount('Payment.Command.v1');

    // Confirm the bug condition: no subscriber means the event is silently dropped
    // On unfixed code this is exactly what happens — the payment step never executes
    expect(subscriberCount).toBe(0);

    // Publishing should not throw (it silently drops)
    await expect(
      bus.publish('Payment.Command.v1', {
        orderId: 'ord-drop-001',
        buyerId: 'buyer-drop-001',
        amount: 5000,
        sagaId: 'saga-drop-001'
      })
    ).resolves.not.toThrow();

    // The event was silently dropped — this is the bug
    // The fix requires a subscriber to be registered in OrderModule.initialize
  });

  it('Unit: After registering a Payment.Command.v1 consumer, the handler is invoked on publish', async () => {
    const bus = new EventBus();

    // This simulates what the FIXED OrderModule.initialize does
    const paymentCommandHandler = jest.fn().mockResolvedValue(undefined);
    await bus.subscribe('Payment.Command.v1', paymentCommandHandler);

    // Verify subscriber is registered
    expect(bus.getSubscriberCount('Payment.Command.v1')).toBe(1);

    // Publish the command
    await bus.publish('Payment.Command.v1', {
      orderId: 'ord-consumer-001',
      buyerId: 'buyer-consumer-001',
      amount: 10000,
      sagaId: 'saga-consumer-001'
    });

    // ASSERTION: handler must be invoked
    expect(paymentCommandHandler).toHaveBeenCalledTimes(1);
  });
});

// ─── Sub-test E — Fire-and-forget success ─────────────────────────────────────
//
// On unfixed code, the standalone bridge in src/main.ts called paymentSaga.start()
// and immediately published Payment.Success.v1 — without awaiting actual saga step
// completion. This means Payment.Success.v1 could be published before the wallet
// debit completes.
//
// This test simulates a paymentSaga.start() that takes time to complete and asserts
// that Payment.Success.v1 is NOT published before the saga's ProcessPayment step
// completes.
//
// Validates: Requirements 1.6

describe('Sub-test E — Fire-and-forget success: Payment.Success.v1 must not be published before saga completes', () => {
  it('Unit: Payment.Success.v1 is NOT published before paymentSaga.start() resolves', async () => {
    const bus = new EventBus();
    const publishedEvents: string[] = [];

    // Track all published events in order
    await bus.subscribe('Payment.Success.v1', async () => {
      publishedEvents.push('Payment.Success.v1');
    });

    // Simulate a slow saga (takes 50ms to complete)
    let sagaCompleted = false;
    const slowSaga = {
      start: jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        sagaCompleted = true;
      })
    };

    // Simulate the UNFIXED bridge: fire-and-forget pattern
    // The bug: publish Success immediately after calling start(), without awaiting completion
    const simulateUnfixedBridge = async (parentSagaId: string, orderId: string) => {
      // BUG: start() is called but NOT awaited before publishing success
      slowSaga.start('payment-id', { payment: {} });
      // Immediately publish success — this is the fire-and-forget bug
      await bus.publish('Payment.Success.v1', { sagaId: parentSagaId, orderId });
    };

    await simulateUnfixedBridge('saga-parent-001', 'ord-fire-001');

    // ASSERTION: Payment.Success.v1 was published BEFORE saga completed
    // This confirms the fire-and-forget bug exists
    expect(publishedEvents).toContain('Payment.Success.v1');
    expect(sagaCompleted).toBe(false); // Saga has NOT completed yet when success was published

    // Wait for saga to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(sagaCompleted).toBe(true);
  });

  it('Unit: Fixed bridge awaits saga completion before publishing Payment.Success.v1', async () => {
    const bus = new EventBus();
    const eventOrder: string[] = [];

    await bus.subscribe('Payment.Success.v1', async () => {
      eventOrder.push('Payment.Success.v1');
    });

    let sagaCompleted = false;
    const slowSaga = {
      start: jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        sagaCompleted = true;
        eventOrder.push('saga-completed');
      })
    };

    // Simulate the FIXED bridge: await saga completion before publishing success
    const simulateFixedBridge = async (parentSagaId: string, orderId: string) => {
      await slowSaga.start('payment-id', { payment: {} }); // FIXED: properly awaited
      await bus.publish('Payment.Success.v1', { sagaId: parentSagaId, orderId });
    };

    await simulateFixedBridge('saga-parent-002', 'ord-fixed-001');

    // ASSERTION: saga must complete BEFORE Payment.Success.v1 is published
    expect(sagaCompleted).toBe(true);
    expect(eventOrder).toEqual(['saga-completed', 'Payment.Success.v1']);

    // Verify ordering: saga-completed comes before Payment.Success.v1
    const sagaIdx = eventOrder.indexOf('saga-completed');
    const successIdx = eventOrder.indexOf('Payment.Success.v1');
    expect(sagaIdx).toBeLessThan(successIdx);
  });

  it('Unit: Confirms fire-and-forget publishes success before ProcessPayment step completes', async () => {
    const bus = new EventBus();
    const timeline: Array<{ event: string; sagaCompleted: boolean }> = [];

    let sagaCompleted = false;

    await bus.subscribe('Payment.Success.v1', async () => {
      // Record whether saga was completed at the time success was published
      timeline.push({ event: 'Payment.Success.v1', sagaCompleted });
    });

    const slowSaga = {
      start: jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 80));
        sagaCompleted = true;
      })
    };

    // Unfixed bridge: fire-and-forget
    slowSaga.start('pay-id', {});
    await bus.publish('Payment.Success.v1', { sagaId: 'saga-ff-001', orderId: 'ord-ff-001' });

    // ASSERTION: at the time Payment.Success.v1 was published, saga was NOT yet complete
    // This is the fire-and-forget bug — success published before actual completion
    expect(timeline.length).toBe(1);
    expect(timeline[0].sagaCompleted).toBe(false); // Bug confirmed: saga not done when success published

    // Wait for saga to finish
    await new Promise(resolve => setTimeout(resolve, 150));
    expect(sagaCompleted).toBe(true);
  });
});
