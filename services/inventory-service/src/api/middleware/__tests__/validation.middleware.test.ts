import { Request, Response, NextFunction } from 'express';
import { validateRequest } from '../validation.middleware';

describe('Validation Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = { body: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
  });

  it('should call next when validation passes', () => {
    const schema = {
      validate: jest.fn().mockReturnValue({ value: { name: 'test' } })
    };

    mockReq.body = { name: 'test' };

    validateRequest(schema)(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('should return 400 when validation fails', () => {
    const schema = {
      validate: jest.fn().mockReturnValue({
        error: { details: [{ message: 'Validation error' }] }
      })
    };

    validateRequest(schema)(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Validation error' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should update request body with validated value', () => {
    const validatedValue = { name: 'validated' };
    const schema = {
      validate: jest.fn().mockReturnValue({ value: validatedValue })
    };

    mockReq.body = { name: 'test' };

    validateRequest(schema)(mockReq as Request, mockRes as Response, mockNext);

    expect(mockReq.body).toEqual(validatedValue);
  });
});
