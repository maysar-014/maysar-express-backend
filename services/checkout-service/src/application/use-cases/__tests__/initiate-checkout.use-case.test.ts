/**
 * InitiateCheckoutUseCase tests
 *
 * The authoritative shipping cost comes from the validated delivery quote —
 * any client-supplied `shippingCost` is ignored (price-manipulation guard).
 * See delivery-pricing-engine spec tasks 16/19/20.
 */

import { InitiateCheckoutUseCase } from '../initiate-checkout.use-case';
import { PricingPolicy } from '../../../domain/policies/pricing.policy';

describe('InitiateCheckoutUseCase', () => {
  let useCase: InitiateCheckoutUseCase;
  let mockCheckoutRepository: any;
  let mockCartRepository: any;
  let mockEventBus: any;
  let mockQuoteService: {
    validate: jest.Mock;
    markConsumed: jest.Mock;
  };
  let pricingPolicy: PricingPolicy;

  const QUOTE_DELIVERY_FEE = 10;
  const QUOTE_PRICING_VERSION = 2;
  const VALID_QUOTE_ID = 'qte_validquote1';

  beforeEach(() => {
    pricingPolicy = new PricingPolicy({
      taxRate: 0.1,
      shippingCost: 10,
      minOrderForFreeShipping: 100
    });

    mockCheckoutRepository = {
      saveCheckoutSession: jest.fn().mockResolvedValue(undefined),
      getCheckoutSession: jest.fn()
    };

    mockCartRepository = {
      getCart: jest.fn().mockResolvedValue({
        id: 'cart-1',
        items: [{ productId: 'prod-1', quantity: 2, priceAtTime: 50 }]
      })
    };

    mockEventBus = {
      publish: jest.fn().mockResolvedValue(undefined)
    };

    mockQuoteService = {
      validate: jest.fn().mockResolvedValue({
        valid: true,
        deliveryFee: QUOTE_DELIVERY_FEE,
        pricingVersion: QUOTE_PRICING_VERSION,
      }),
      markConsumed: jest.fn().mockResolvedValue(undefined),
    };

    useCase = new InitiateCheckoutUseCase(
      pricingPolicy,
      mockCheckoutRepository,
      mockCartRepository,
      mockEventBus,
      undefined,
      mockQuoteService as any,
    );
  });

  // ── Basic flow ─────────────────────────────────────────────────────────────

  it('should initiate checkout successfully with a valid quoteId', async () => {
    const result = await useCase.execute(
      'cart-1',
      'user-1',
      'addr-1',
      'addr-2',
      'ship-1',
      999999, // ignored by design
      undefined,
      { items: undefined, orderSource: 'CART' },
      VALID_QUOTE_ID,
    );

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.pricing).toBeDefined();
    expect(mockQuoteService.validate).toHaveBeenCalledWith(VALID_QUOTE_ID);
  });

  it('should calculate pricing from the validated quote (server-authoritative), ignoring client shippingCost', async () => {
    const result = await useCase.execute(
      'cart-1',
      'user-1',
      'addr-1',
      'addr-2',
      'ship-1',
      999999, // client tried to send a huge shipping cost
      undefined,
      { items: undefined, orderSource: 'CART' },
      VALID_QUOTE_ID,
    );

    expect(result.pricing?.subtotal).toBe(100);
    expect(result.pricing?.taxAmount).toBe(10);
    expect(result.pricing?.shippingCost).toBe(QUOTE_DELIVERY_FEE); // from quote, not client
    expect(result.pricing?.total).toBe(120);
  });

  it('should save checkout session', async () => {
    await useCase.execute(
      'cart-1',
      'user-1',
      'addr-1',
      'addr-2',
      'ship-1',
      10,
      undefined,
      { items: undefined, orderSource: 'CART' },
      VALID_QUOTE_ID,
    );

    expect(mockCheckoutRepository.saveCheckoutSession).toHaveBeenCalled();
  });

  it('should publish CheckoutInitiated event', async () => {
    await useCase.execute(
      'cart-1',
      'user-1',
      'addr-1',
      'addr-2',
      'ship-1',
      10,
      undefined,
      { items: undefined, orderSource: 'CART' },
      VALID_QUOTE_ID,
    );

    expect(mockEventBus.publish).toHaveBeenCalledWith(
      'CheckoutInitiated',
      expect.objectContaining({
        cartId: 'cart-1',
        userId: 'user-1',
        totalAmount: 120
      })
    );
  });

  it('should fall back to a dev cart when cart not found in non-production', async () => {
    mockCartRepository.getCart.mockResolvedValueOnce(null);

    const result = await useCase.execute(
      'cart-999',
      'user-1',
      'addr-1',
      'addr-2',
      'ship-1',
      10,
      undefined,
      { items: undefined, orderSource: 'CART' },
      VALID_QUOTE_ID,
    );

    expect(result.success).toBe(true);
    expect(mockCheckoutRepository.saveCheckoutSession).toHaveBeenCalled();
    expect(mockEventBus.publish).toHaveBeenCalledWith(
      'CheckoutInitiated',
      expect.objectContaining({
        cartId: 'cart-999',
        userId: 'user-1'
      })
    );
  });

  it('should reject when cart is empty', async () => {
    mockCartRepository.getCart.mockResolvedValueOnce({
      id: 'cart-1',
      items: []
    });

    const result = await useCase.execute(
      'cart-1',
      'user-1',
      'addr-1',
      'addr-2',
      'ship-1',
      10,
      undefined,
      { items: undefined, orderSource: 'CART' },
      VALID_QUOTE_ID,
    );

    expect(result.success).toBe(false);
  });

  it('should reject missing required fields', async () => {
    const result = await useCase.execute(
      'cart-1',
      'user-1',
      '',
      'addr-2',
      'ship-1',
      10,
      undefined,
      { items: undefined, orderSource: 'CART' },
      VALID_QUOTE_ID,
    );

    expect(result.success).toBe(false);
    expect(result.errors?.length).toBeGreaterThan(0);
  });

  it('should handle database errors', async () => {
    mockCheckoutRepository.saveCheckoutSession.mockRejectedValueOnce(
      new Error('Database error')
    );

    const result = await useCase.execute(
      'cart-1',
      'user-1',
      'addr-1',
      'addr-2',
      'ship-1',
      10,
      undefined,
      { items: undefined, orderSource: 'CART' },
      VALID_QUOTE_ID,
    );

    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        field: 'system',
        message: 'Database error'
      })
    );
  });

  it('should pass a validated free-delivery quote (fee 0) through verbatim', async () => {
    mockQuoteService.validate.mockResolvedValueOnce({
      valid: true,
      deliveryFee: 0,
      pricingVersion: QUOTE_PRICING_VERSION,
    });
    mockCartRepository.getCart.mockResolvedValueOnce({
      id: 'cart-1',
      items: [{ productId: 'prod-1', quantity: 1, priceAtTime: 150 }]
    });

    const result = await useCase.execute(
      'cart-1',
      'user-1',
      'addr-1',
      'addr-2',
      'ship-1',
      0,
      undefined,
      { items: undefined, orderSource: 'CART' },
      VALID_QUOTE_ID,
    );

    expect(result.pricing?.shippingCost).toBe(0);
  });

  it('should set checkout expiration to 1 hour', async () => {
    const beforeTime = Date.now();
    await useCase.execute(
      'cart-1',
      'user-1',
      'addr-1',
      'addr-2',
      'ship-1',
      10,
      undefined,
      { items: undefined, orderSource: 'CART' },
      VALID_QUOTE_ID,
    );
    const afterTime = Date.now();

    const savedSession = mockCheckoutRepository.saveCheckoutSession.mock.calls[0][0];
    const expirationTime = savedSession.expiresAt.getTime();

    expect(expirationTime).toBeGreaterThanOrEqual(beforeTime + 3600000 - 1000);
    expect(expirationTime).toBeLessThanOrEqual(afterTime + 3600000 + 1000);
  });
// ── Quote security gate (spec tasks 16/19/20) ──────────────────────────────

  it('should reject checkout when quoteId is missing, referencing quoteId', async () => {
    const result = await useCase.execute(
      'cart-1',
      'user-1',
      'addr-1',
      'addr-2',
      'ship-1',
      0,
      undefined,
      { items: undefined, orderSource: 'CART' },
    );

    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'quoteId' })
    );
    expect(mockCheckoutRepository.saveCheckoutSession).not.toHaveBeenCalled();
    expect(mockQuoteService.markConsumed).not.toHaveBeenCalled();
  });

  it('should reject an expired quote', async () => {
    mockQuoteService.validate.mockResolvedValueOnce({
      valid: false,
      rejectionReason: 'EXPIRED',
    });

    const result = await useCase.execute(
      'cart-1',
      'user-1',
      'addr-1',
      'addr-2',
      'ship-1',
      0,
      undefined,
      { items: undefined, orderSource: 'CART' },
      'qte_expired1',
    );

    expect(result.success).toBe(false);
    expect(result.errors?.[0]?.field).toBe('quoteId');
    expect(result.errors?.[0]?.message.toLowerCase()).toContain('expired');
    expect(mockCheckoutRepository.saveCheckoutSession).not.toHaveBeenCalled();
  });

  it('should reject a consumed quote', async () => {
    mockQuoteService.validate.mockResolvedValueOnce({
      valid: false,
      rejectionReason: 'CONSUMED',
    });

    const result = await useCase.execute(
      'cart-1',
      'user-1',
      'addr-1',
      'addr-2',
      'ship-1',
      0,
      undefined,
      { items: undefined, orderSource: 'CART' },
      'qte_consumed1',
    );

    expect(result.success).toBe(false);
    expect(result.errors?.[0]?.message.toLowerCase()).toContain('already been used');
    expect(mockQuoteService.markConsumed).not.toHaveBeenCalled();
  });

  it('should record shippingCost from the validated quote even when the client sends 0 or a huge fake value', async () => {
    mockQuoteService.validate.mockResolvedValue({
      valid: true,
      deliveryFee: 1234,
      pricingVersion: QUOTE_PRICING_VERSION,
    });

    for (const fakeShippingCost of [0, 999999]) {
      const result = await useCase.execute(
        'cart-1',
        'user-1',
        'addr-1',
        'addr-2',
        'ship-1',
        fakeShippingCost,
        undefined,
        { items: undefined, orderSource: 'CART' },
        VALID_QUOTE_ID,
      );

      expect(result.success).toBe(true);
      const savedSession = mockCheckoutRepository.saveCheckoutSession.mock.calls.at(-1)[0];
      expect(savedSession.shippingCost).toBe(1234);
      expect(result.pricing?.shippingCost).toBe(1234);
    }
  });

  it('should record quoteId and pricingVersion on the session', async () => {
    await useCase.execute(
      'cart-1',
      'user-1',
      'addr-1',
      'addr-2',
      'ship-1',
      10,
      undefined,
      { items: undefined, orderSource: 'CART' },
      VALID_QUOTE_ID,
    );

    const savedSession = mockCheckoutRepository.saveCheckoutSession.mock.calls[0][0];
    expect(savedSession.quoteId).toBe(VALID_QUOTE_ID);
    expect(savedSession.pricingVersion).toBe(QUOTE_PRICING_VERSION);
  });

  it('should mark the quote consumed only after the session is saved', async () => {
    await useCase.execute(
      'cart-1',
      'user-1',
      'addr-1',
      'addr-2',
      'ship-1',
      10,
      undefined,
      { items: undefined, orderSource: 'CART' },
      VALID_QUOTE_ID,
    );

    expect(mockCheckoutRepository.saveCheckoutSession).toHaveBeenCalledTimes(1);
    expect(mockQuoteService.markConsumed).toHaveBeenCalledTimes(1);
    expect(mockQuoteService.markConsumed).toHaveBeenCalledWith(VALID_QUOTE_ID);
  });
});