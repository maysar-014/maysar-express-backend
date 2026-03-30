import { Request, Response, NextFunction } from 'express';
import { errorHandler } from './error.middleware';

describe('Error Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
  });

  it('should handle generic errors', () => {
    const error = new Error('Test error');
    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({
        message: 'Test error',
        timestamp: expect.any(Date)
      })
    }));
  });

  it('should handle errors with status code', () => {
    const error = new Error('Not found') as Error & { statusCode: number };
    error.statusCode = 404;
    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(404);
  });

  it('should handle validation errors', () => {
    const error = new Error('Validation failed');
    error.name = 'ValidationError';
    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });
});
