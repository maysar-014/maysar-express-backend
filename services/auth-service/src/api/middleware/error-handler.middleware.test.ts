jest.mock('../../infrastructure/services/logger.service', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  }
}));

import type { NextFunction, Request, Response } from 'express';
import { logger } from '../../infrastructure/services/logger.service';
import { asyncHandler, errorHandler } from './error-handler.middleware';
import { errorHandlerMiddleware as trainingErrorHandler } from '../../../../training-service/src/api/middleware/error-handler.middleware';
import { ValidationError as TrainingValidationError } from '../../../../training-service/src/domain/errors/domain.error';

const createResponse = (): Response => {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
  return response as unknown as Response;
};

describe('error-handler middleware contracts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('asyncHandler forwards asynchronous errors to next', async () => {
    const req = {} as Request;
    const res = createResponse();
    const next = jest.fn() as jest.MockedFunction<NextFunction>;
    const wrapped = asyncHandler(async () => {
      throw new Error('boom');
    });

    wrapped(req, res, next);
    await Promise.resolve();

    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it('auth errorHandler maps known error names and includes dev diagnostics', () => {
    process.env.NODE_ENV = 'development';
    const req = {
      url: '/path',
      method: 'GET',
      ip: '127.0.0.1',
      path: '/path',
      body: {},
      params: {},
      query: {},
      get: jest.fn().mockReturnValue('agent')
    } as unknown as Request;
    const res = createResponse();
    const next = jest.fn() as jest.MockedFunction<NextFunction>;

    errorHandler({ name: 'ForbiddenError', message: 'denied', stack: 'stack' }, req, res, next);

    expect(logger.error).toHaveBeenCalledWith(
      'Request error',
      expect.objectContaining({ method: 'GET', url: '/path' })
    );
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Forbidden',
        stack: 'stack',
        error: 'denied'
      })
    );
  });

  it('training errorHandler maps validation errors and correlation id', () => {
    const req = {
      headers: { 'x-correlation-id': 'corr-1' }
    } as unknown as Request;
    const res = createResponse();
    const next = jest.fn() as jest.MockedFunction<NextFunction>;
    const err = new TrainingValidationError(['field missing']);

    trainingErrorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Validation failed',
        errors: ['field missing'],
        correlationId: 'corr-1'
      })
    );
  });
});
