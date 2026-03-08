import { NextFunction, Request, Response } from 'express';
import {
  asyncErrorHandler,
  errorHandler,
  gracefulDegradationHandler,
  recoveryHandler,
  timeoutHandler
} from './error-handling.middleware';
import { ErrorType, ValidationError } from '../domain/errors';

jest.mock('../infrastructure/monitoring/alerting', () => ({
  handleCriticalError: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('../config/security.config', () => ({
  logSecurityConfigSummary: jest.fn()
}));

jest.mock('../config/monitoring.config', () => ({
  logMonitoringConfigSummary: jest.fn()
}));

type MockReq = Partial<Request> & { get: jest.Mock };
type MockRes = Partial<Response> & {
  status: jest.Mock;
  json: jest.Mock;
  set: jest.Mock;
  on: jest.Mock;
  headersSent: boolean;
  statusCode: number;
};

function createReq(overrides: Partial<Request> = {}): MockReq {
  const headers: Record<string, string | undefined> = {
    'X-Request-ID': 'req-1',
    'x-request-id': 'req-1',
    'User-Agent': 'jest'
  };

  return {
    method: 'GET',
    url: '/orders',
    ip: '127.0.0.1',
    get: jest.fn((name: string) => headers[name]),
    ...overrides
  } as MockReq;
}

function createRes(): MockRes {
  const response = {
    status: jest.fn(),
    json: jest.fn(),
    set: jest.fn(),
    on: jest.fn(),
    headersSent: false,
    statusCode: 200
  } as MockRes;

  response.status.mockReturnValue(response);
  response.json.mockReturnValue(response);
  response.set.mockReturnValue(response);
  response.on.mockReturnValue(response);

  return response;
}

describe('error-handling.middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps operational AppError to structured response', () => {
    const req = createReq();
    const res = createRes();
    const next = jest.fn() as jest.MockedFunction<NextFunction>;

    errorHandler(new ValidationError('Invalid payload'), req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(400);
    const payload = res.json.mock.calls[0][0] as { error: { type: string; message: string } };
    expect(payload.error.type).toBe(ErrorType.VALIDATION_ERROR);
    expect(payload.error.message).toBe('Invalid payload');
  });

  it('maps programming errors to generic 500 response', () => {
    const req = createReq();
    const res = createRes();
    const next = jest.fn() as jest.MockedFunction<NextFunction>;

    errorHandler(new Error('unexpected bug'), req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(500);
    const payload = res.json.mock.calls[0][0] as { error: { type: string } };
    expect(payload.error.type).toBe('INTERNAL_ERROR');
  });

  it('forwards async route rejection to next()', async () => {
    const wrapped = asyncErrorHandler(async () => {
      throw new Error('fail');
    });
    const next = jest.fn() as jest.MockedFunction<NextFunction>;
    wrapped(createReq() as Request, createRes() as Response, next);

    await Promise.resolve();
    expect(next).toHaveBeenCalled();
  });

  it('adds service status and supports degraded recovery responses', () => {
    const req = createReq() as Request & { degradedMode?: boolean; serviceStatus?: unknown };
    const res = createRes();
    const next = jest.fn() as jest.MockedFunction<NextFunction>;
    const originalJson = res.json as jest.Mock;

    gracefulDegradationHandler(req, res as Response, next);
    expect(req.serviceStatus).toBeDefined();

    recoveryHandler(req, res as Response, next);
    req.degradedMode = true;
    (res.json as unknown as (data: unknown) => unknown)({
      error: { type: ErrorType.DATABASE_ERROR }
    });

    const payload = originalJson.mock.calls[0][0] as { warning?: string; cached?: boolean };
    expect(payload.cached).toBe(true);
    expect(payload.warning).toContain('database');
  });

  it('triggers timeout errors when request exceeds threshold', () => {
    jest.useFakeTimers();
    const req = createReq();
    const res = createRes();
    const next = jest.fn() as jest.MockedFunction<NextFunction>;

    const middleware = timeoutHandler(5);
    middleware(req as Request, res as Response, next);
    jest.advanceTimersByTime(10);

    expect(next).toHaveBeenCalled();
    const timeoutCall = next.mock.calls.find((call: unknown[]) => call[0] instanceof Error);
    expect(timeoutCall).toBeDefined();
    const timeoutError = timeoutCall?.[0] as unknown as Error & { status?: number };
    expect(timeoutError.status).toBe(408);
    jest.useRealTimers();
  });
});
