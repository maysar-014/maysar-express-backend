import type { NextFunction, Request, Response } from 'express';
import { correlationMiddleware } from './correlation.middleware';

describe('correlationMiddleware', () => {
  it('uses existing x-correlation-id header when provided', () => {
    const next = jest.fn();
    const correlationId = '123e4567-e89b-42d3-a456-426614174000';
    const req = {
      headers: { 'x-correlation-id': correlationId },
      body: {}
    } as unknown as Request;

    correlationMiddleware(req, {} as Response, next as NextFunction);

    expect(req.body.correlationId).toBeUndefined();
    expect(req.headers['x-correlation-id']).toBe(correlationId);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('generates and propagates a correlation id when missing', () => {
    const next = jest.fn();
    const req = {
      headers: {},
      body: {}
    } as unknown as Request;

    correlationMiddleware(req, {} as Response, next as NextFunction);

    expect(req.body.correlationId).toBeUndefined();
    expect(typeof req.headers['x-correlation-id']).toBe('string');
    expect((req.headers['x-correlation-id'] as string).length).toBeGreaterThan(0);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('does not overwrite an explicitly invalid body correlation id', () => {
    const next = jest.fn();
    const req = {
      headers: {},
      body: { correlationId: '' }
    } as unknown as Request;

    correlationMiddleware(req, {} as Response, next as NextFunction);

    expect(req.body.correlationId).toBe('');
    expect(typeof req.headers['x-correlation-id']).toBe('string');
    expect(req.headers['x-correlation-id']).not.toBe('');
    expect(next).toHaveBeenCalledTimes(1);
  });
});
