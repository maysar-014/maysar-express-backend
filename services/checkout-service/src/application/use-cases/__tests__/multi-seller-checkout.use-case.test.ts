/**
 * MultiSellerCheckoutUseCase tests
 *
 * Covers the per-seller delivery-quote gate applied during multi-seller
 * checkout confirmation (delivery-pricing-engine spec task 11 + the
 * consolidation wiring gap documented in backlog §1.4):
 *
 *   - every seller in the session must have a valid, unconsumed quote
 *   - a missing or rejected quote blocks the whole checkout
 *   - quotes are marked consumed only after the atomic multi-order transaction succeeds
 */

import { MultiSellerCheckoutUseCase } from '../multi-seller-checkout.use-case';

describe('MultiSellerCheckoutUseCase', () => {
  const originalPrisma = (globalThis as any).prisma;
  const originalPlaceOrder = (globalThis as any).__placeOrderUseCase;

  let prisma: any;
  let placeOrderUseCase: any;
  let quoteValidationService: any;
  let eventBus: any;
  let useCase: MultiSellerCheckoutUseCase;

  const baseRequest = {
    sessionId: 'session-1',
    buyerId: 'buyer-1',
    paymentMethod: 'COD',
    deliveryAddress: {
      street: 'Mikocheni',
      city: 'Dar es Salaam',
      postalCode: '00000',
      country: 'Tanzania',
    },
    sellerQuotes: {
      'seller-1': { quoteId: 'qte-multi-1' },
      'seller-2': { quoteId: 'qte-multi-2' },
    },
  };

  beforeEach(() => {
    prisma = {
      checkout_CheckoutSession: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'session-1',
          buyerId: 'buyer-1',
          expiresAt: new Date(Date.now() + 60_000),
          metadata: {
            items: [
              { productId: 'prod-1', quantity: 1, priceAtTime: 60000, weight: 1 },
              { productId: 'prod-2', quantity: 1, priceAtTime: 40000, weight: 2 },
            ],
          },
        }),
      },
      product: {
        findUnique: jest.fn(async ({ where }: any) => {
          if (where.id === 'prod-1') return { sellerId: 'seller-1' };
          if (where.id === 'prod-2') return { sellerId: 'seller-2' };
          return null;
        }),
      },
      $transaction: jest.fn(async (callback: any) => callback({
        order_Order: { findUnique: jest.fn().mockResolvedValue({ totalAmount: 60000 }) },
        order_MasterOrder: { create: jest.fn().mockResolvedValue({ id: 'mos-1' }) },
      })),
    };
    (globalThis as any).prisma = prisma;

    placeOrderUseCase = {
      execute: jest.fn().mockResolvedValue({
        orderId: `ord-${Math.random().toString(36).slice(2, 8)}`,
        trackingNumber: `TRK-${Math.random().toString(36).slice(2, 8)}`,
        verificationDeadlineAt: new Date(Date.now() + 86_400_000).toISOString(),
      }),
    };
    (globalThis as any).__placeOrderUseCase = placeOrderUseCase;

    quoteValidationService = {
      validate: jest.fn().mockResolvedValue({ valid: true, deliveryFee: 3000, pricingVersion: 2 }),
      markConsumed: jest.fn().mockResolvedValue(undefined),
    };
    eventBus = { publish: jest.fn().mockResolvedValue(undefined) };

    useCase = new MultiSellerCheckoutUseCase(quoteValidationService, eventBus);
  });

  afterEach(() => {
    (globalThis as any).prisma = originalPrisma;
    (globalThis as any).__placeOrderUseCase = originalPlaceOrder;
  });

  test('validates every per-seller quote, creates one order per seller, and marks all quotes consumed', async () => {
    const result = await useCase.execute(baseRequest as any);

    expect(result.success).toBe(true);
    const data = result as any;
    expect(data.masterOrderId).toBeDefined();
    expect(data.sellerOrders).toHaveLength(2);

    expect(quoteValidationService.validate).toHaveBeenCalledTimes(2);
    expect(quoteValidationService.validate).toHaveBeenCalledWith('qte-multi-1');
    expect(quoteValidationService.validate).toHaveBeenCalledWith('qte-multi-2');

    expect(placeOrderUseCase.execute).toHaveBeenCalledTimes(2);
    expect(quoteValidationService.markConsumed).toHaveBeenCalledTimes(2);
    expect(quoteValidationService.markConsumed).toHaveBeenCalledWith('qte-multi-1');
    expect(quoteValidationService.markConsumed).toHaveBeenCalledWith('qte-multi-2');
  });

  test('missing quote for one seller blocks checkout with MISSING_DELIVERY_QUOTE + sellerId', async () => {
    const result = await useCase.execute({
      ...baseRequest,
      sellerQuotes: { 'seller-1': { quoteId: 'qte-multi-1' } },
    } as any);

    expect(result.success).toBe(false);
    const error = (result as any).error;
    expect(error.code).toBe('MISSING_DELIVERY_QUOTE');
    expect(error.sellerId).toBe('seller-2');
    expect(placeOrderUseCase.execute).not.toHaveBeenCalled();
    expect(quoteValidationService.markConsumed).not.toHaveBeenCalled();
  });

  test('an expired per-seller quote blocks checkout with the rejection reason', async () => {
    quoteValidationService.validate.mockImplementation(async (quoteId: string) =>
      quoteId === 'qte-multi-2'
        ? { valid: false, rejectionReason: 'EXPIRED' }
        : { valid: true, deliveryFee: 3000, pricingVersion: 2 },
    );

    const result = await useCase.execute(baseRequest as any);

    expect(result.success).toBe(false);
    const error = (result as any).error;
    expect(error.code).toBe('EXPIRED');
    expect(error.sellerId).toBe('seller-2');
    expect(placeOrderUseCase.execute).not.toHaveBeenCalled();
    expect(quoteValidationService.markConsumed).not.toHaveBeenCalled();
  });

  test('missing checkout session returns CHECKOUT_SESSION_NOT_FOUND', async () => {
    prisma.checkout_CheckoutSession.findUnique.mockResolvedValueOnce(null);

    const result = await useCase.execute(baseRequest as any);

    expect(result.success).toBe(false);
    expect((result as any).error.code).toBe('CHECKOUT_SESSION_NOT_FOUND');
  });
});