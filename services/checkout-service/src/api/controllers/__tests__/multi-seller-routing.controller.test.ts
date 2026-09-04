/**
 * Checkout controller — multi-seller routing tests
 *
 * Verifies backlog §1.4: when a confirm-checkout request carries per-seller
 * quotes for more than one seller, the controller must route to the
 * MultiSellerCheckoutUseCase (the registered __multiSellerCheckoutUseCase).
 * A single-seller (or missing) sellerQuotes map must NOT take that path.
 */

import { Request, Response } from 'express';
import { CheckoutController } from '../checkout.controller';

describe('CheckoutController multi-seller routing', () => {
  let controller: CheckoutController;
  let mockCheckoutRepository: any;
  let mockEventBus: any;
  let mockMultiSellerUseCase: any;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  const session = {
    id: 'session-ms-1',
    userId: 'user-1',
    status: 'initiated',
    totalAmount: 1_000_000,
    subtotal: 900_000,
    taxAmount: 90_000,
    shippingCost: 10_000,
    discountAmount: 0,
    shippingAddressId: 'addr-1',
    billingAddressId: 'addr-2',
    shippingMethodId: 'ship-1',
    items: [],
    expiresAt: new Date(Date.now() + 3600_000),
    createdAt: new Date(Date.now() - 60_000),
    updatedAt: new Date(Date.now() - 30_000),
  };

  const sellerQuotes = {
    'seller-1': { quoteId: 'qte-ms-1' },
    'seller-2': { quoteId: 'qte-ms-2' },
  };

  beforeEach(() => {
    mockCheckoutRepository = {
      getSession: jest.fn().mockResolvedValue({ ...session, metadata: {} }),
      saveCheckoutSession: jest.fn().mockResolvedValue(undefined),
    };
    mockEventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    mockMultiSellerUseCase = {
      execute: jest.fn().mockResolvedValue({
        success: true,
        masterOrderId: 'mos-ms-1',
        sellerOrders: [
          { sellerId: 'seller-1', orderId: 'ord-1' },
          { sellerId: 'seller-2', orderId: 'ord-2' },
        ],
        totalAmount: 1_000_000,
      }),
    };
    (globalThis as any).__multiSellerCheckoutUseCase = mockMultiSellerUseCase;

    controller = new CheckoutController(mockCheckoutRepository, mockEventBus);

    mockRequest = {
      headers: {},
      params: {},
      body: {},
    };
    mockResponse = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
    };
  });

  afterEach(() => {
    delete (globalThis as any).__multiSellerCheckoutUseCase;
  });

  test('routes to MultiSellerCheckoutUseCase when sellerQuotes spans > 1 seller', async () => {
    mockRequest.body = {
      sessionId: 'session-ms-1',
      paymentMethodId: 'COD',
      sellerQuotes,
      deliveryAddress: {
        street: 'Mikocheni',
        city: 'Dar es Salaam',
        postalCode: '00000',
        country: 'Tanzania',
      },
    };

    await controller.confirmCheckout(mockRequest as Request, mockResponse as Response);

    expect(mockMultiSellerUseCase.execute).toHaveBeenCalledTimes(1);
    const request = mockMultiSellerUseCase.execute.mock.calls[0][0];
    expect(request.sessionId).toBe('session-ms-1');
    expect(request.buyerId).toBe('user-1');
    expect(request.paymentMethod).toBe('COD');
    expect(request.sellerQuotes).toEqual(sellerQuotes);

    expect(mockResponse.status).not.toHaveBeenCalled();
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          masterOrderId: 'mos-ms-1',
          sellerOrders: expect.any(Array),
        }),
      }),
    );
  });

  test('does NOT route to MultiSellerCheckoutUseCase for a single-seller sellerQuotes map', async () => {
    mockRequest.body = {
      sessionId: 'session-ms-1',
      paymentMethodId: 'SELLER_VERIFICATION',
      sellerQuotes: { 'seller-1': { quoteId: 'qte-ms-1' } },
    };

    await controller.confirmCheckout(mockRequest as Request, mockResponse as Response);

    expect(mockMultiSellerUseCase.execute).not.toHaveBeenCalled();
    // Falls through to the normal single-seller confirmation path
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
  });

  test('surface a rejected multi-seller checkout as 422 with the use-case error', async () => {
    mockMultiSellerUseCase.execute.mockResolvedValueOnce({
      success: false,
      error: { code: 'EXPIRED', message: 'Delivery quote invalid for seller-1: EXPIRED', sellerId: 'seller-1' },
    });

    mockRequest.body = {
      sessionId: 'session-ms-1',
      paymentMethodId: 'COD',
      sellerQuotes,
    };

    await controller.confirmCheckout(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(422);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'EXPIRED',
          sellerId: 'seller-1',
        }),
      }),
    );
  });
});