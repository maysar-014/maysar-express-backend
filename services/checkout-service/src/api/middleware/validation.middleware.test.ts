import { Request, Response, NextFunction } from 'express';
import { validateCheckout } from './validation.middleware';

describe('Validation Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = { body: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
  });

  it('should pass valid checkout data', () => {
    mockReq.body = {
      cartId: 'cart-123',
      userId: 'user-123',
      items: [{ productId: 'p1', quantity: 1, price: 100 }]
    };
    validateCheckout(mockReq as Request, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it('should reject invalid data', () => {
    mockReq.body = { invalid: true };
    validateCheckout(mockReq as Request, mockRes as Response, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it('should reject empty cart', () => {
    mockReq.body = { cartId: 'cart-123', items: [] };
    validateCheckout(mockReq as Request, mockRes as Response, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });
});
