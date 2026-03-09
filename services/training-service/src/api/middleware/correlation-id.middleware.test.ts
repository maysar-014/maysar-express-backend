import type { NextFunction, Request, Response } from 'express';
import { correlationIdMiddleware } from './correlation-id.middleware';

describe('correlationIdMiddleware', () => {
  it('propagates existing x-correlation-id from request headers', () => {
    const req = {
      headers: {
        'x-correlation-id': 'corr-existing'
      }
    } as unknown as Request;
    const setHeader = jest.fn();
    const res = { setHeader } as unknown as Response;
    const next = jest.fn() as NextFunction;

    correlationIdMiddleware(req, res, next);

    expect(req.headers['x-correlation-id']).toBe('corr-existing');
    expect(setHeader).toHaveBeenCalledWith('x-correlation-id', 'corr-existing');
    expect(next).toHaveBeenCalled();
  });

  it('generates correlation id when header is missing', () => {
    const req = { headers: {} } as unknown as Request;
    const setHeader = jest.fn();
    const res = { setHeader } as unknown as Response;
    const next = jest.fn() as NextFunction;

    correlationIdMiddleware(req, res, next);

    const headerValue = req.headers['x-correlation-id'];
    expect(typeof headerValue).toBe('string');
    expect((headerValue as string).length).toBeGreaterThan(0);
    expect(setHeader).toHaveBeenCalledWith('x-correlation-id', headerValue);
    expect(next).toHaveBeenCalled();
  });
});
