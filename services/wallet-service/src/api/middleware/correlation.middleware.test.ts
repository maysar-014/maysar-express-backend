import type { NextFunction, Request, Response } from 'express';
import { correlationMiddleware } from './correlation.middleware';

describe('correlationMiddleware', () => {
  it('uses existing x-correlation-id header when provided', () => {
    const next = jest.fn();
    const req = {
      headers: { 'x-correlation-id': 'corr-123' },
      body: {}
    } as unknown as Request;

    correlationMiddleware(req, {} as Response, next as NextFunction);

    expect(req.body.correlationId).toBe('corr-123');
    expect(req.headers['x-correlation-id']).toBe('corr-123');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('generates and propagates a correlation id when missing', () => {
    const next = jest.fn();
    const req = {
      headers: {},
      body: {}
    } as unknown as Request;

    correlationMiddleware(req, {} as Response, next as NextFunction);

    expect(typeof req.body.correlationId).toBe('string');
    expect((req.body.correlationId as string).length).toBeGreaterThan(0);
    expect(req.headers['x-correlation-id']).toBe(req.body.correlationId);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
