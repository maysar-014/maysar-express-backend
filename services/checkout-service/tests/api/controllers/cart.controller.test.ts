import { Request, Response } from 'express';
import { CartController } from '../../../src/api/controllers/cart.controller';

describe('CartController', () => {
  const cartId = 'chk_cart_01ARZ3NDEKTSV4RRFFQ69G5FAV';
  const userId = 'usr_test_0001';
  const productId = 'cat_prd_01ARZ3NDEKTSV4RRFFQ69G5FAV';

  let controller: CartController;
  let mockRepository: {
    save: jest.Mock;
    getById: jest.Mock;
    getByUserId: jest.Mock;
    delete: jest.Mock;
  };
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      getById: jest.fn().mockResolvedValue({
        id: cartId,
        userId,
        items: []
      }),
      getByUserId: jest.fn().mockResolvedValue(null),
      delete: jest.fn().mockResolvedValue(undefined)
    };

    controller = new CartController(mockRepository);
    mockRequest = {
      body: {},
      headers: { 'x-correlation-id': 'corr-123' }
    };
    mockResponse = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis()
    };
  });

  it('adds an item to the cart', async () => {
    mockRequest.body = {
      cartId,
      userId,
      productId,
      quantity: 2,
      priceAtTime: 50
    };

    await controller.addToCart(mockRequest as Request, mockResponse as Response);

    expect(mockRepository.save).toHaveBeenCalledWith(
      cartId,
      userId,
      expect.objectContaining({ items: expect.arrayContaining([expect.objectContaining({ productId })]) })
    );
    expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('rejects invalid add-to-cart payloads', async () => {
    mockRequest.body = { cartId, userId };

    await controller.addToCart(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
  });

  it('removes an item from the cart', async () => {
    mockRequest.body = {
      cartId,
      userId,
      productId
    };
    mockRepository.getById.mockResolvedValueOnce({
      id: cartId,
      userId,
      items: [{ productId, quantity: 1, priceAtTime: 50 }]
    });

    await controller.removeFromCart(mockRequest as Request, mockResponse as Response);

    expect(mockRepository.save).toHaveBeenCalled();
    expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('updates item quantity', async () => {
    mockRequest.body = {
      cartId,
      userId,
      productId,
      quantity: 5
    };
    mockRepository.getById.mockResolvedValueOnce({
      id: cartId,
      userId,
      items: [{ productId, quantity: 1, priceAtTime: 50 }]
    });

    await controller.updateCartItem(mockRequest as Request, mockResponse as Response);

    expect(mockRepository.save).toHaveBeenCalled();
    expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('returns the current cart for an authenticated user', async () => {
    Object.assign(mockRequest, {
      user: { userId }
    });
    mockRepository.getByUserId.mockResolvedValueOnce({
      id: cartId,
      userId,
      items: [{ productId, quantity: 1, priceAtTime: 50 }]
    });

    await controller.getCurrentCart(mockRequest as Request, mockResponse as Response);

    expect(mockRepository.getByUserId).toHaveBeenCalledWith(userId);
    expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('clears a cart', async () => {
    mockRequest.params = { cartId };
    mockRequest.body = { userId };

    await controller.clearCart(mockRequest as Request, mockResponse as Response);

    expect(mockRepository.save).toHaveBeenCalledWith(
      cartId,
      userId,
      expect.objectContaining({ items: [] })
    );
    expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('merges carts', async () => {
    const sourceCartId = 'chk_cart_01ARZ3NDEKTSV4RRFFQ69G5FAB';
    const targetCartId = 'chk_cart_01ARZ3NDEKTSV4RRFFQ69G5FAC';

    mockRepository.getById
      .mockResolvedValueOnce({
        id: sourceCartId,
        userId,
        items: [{ productId, quantity: 2, priceAtTime: 50 }]
      })
      .mockResolvedValueOnce({
        id: targetCartId,
        userId,
        items: [{ productId: 'cat_prd_01ARZ3NDEKTSV4RRFFQ69G5FAD', quantity: 1, priceAtTime: 100 }]
      });

    mockRequest.body = {
      sourceCartId,
      targetCartId,
      userId
    };

    await controller.mergeCarts(mockRequest as Request, mockResponse as Response);

    expect(mockRepository.delete).toHaveBeenCalledWith(sourceCartId);
    expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
