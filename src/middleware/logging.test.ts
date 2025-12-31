import { Request, Response, NextFunction } from 'express';
import { loggingMiddleware, healthCheck, generateCorrelationId } from './logging';

describe('Logging Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      url: '/api/test',
      ip: '127.0.0.1',
      get: jest.fn((header: string) => {
        if (header === 'User-Agent') return 'test-agent';
        return undefined;
      }) as any, // Cast to bypass strict typing for mock
    };

    mockResponse = {
      statusCode: 200,
      get: jest.fn((header: string) => {
        if (header === 'Content-Length') return '1024';
        return undefined;
      }),
      on: jest.fn((event: string, callback: () => void) => {
        if (event === 'finish') {
          // Simulate response finish
          setTimeout(callback, 10);
        }
      }),
    };

    mockNext = jest.fn();
  });

  it('should log request and response', async () => {
    await loggingMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    // Wait for response finish event
    await new Promise(resolve => setTimeout(resolve, 20));

    expect(mockNext).toHaveBeenCalled();
    expect(mockRequest.correlationId).toBeDefined();
  });

  it('should generate valid correlation ID', () => {
    const correlationId = generateCorrelationId();

    expect(correlationId).toMatch(/^req_\d+_[a-z0-9]+$/);
    expect(correlationId.length).toBeGreaterThan(10);
  });

  it('should return health check response', () => {
    const jsonMock = jest.fn();
    mockResponse.json = jsonMock;

    healthCheck(mockRequest as Request, mockResponse as Response);

    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'healthy',
        service: 'maysar-backend',
        environment: expect.any(String),
        uptime: expect.any(Number),
      })
    );
  });

  it('should sanitize sensitive request body data', async () => {
    const sensitiveRequest = {
      ...mockRequest,
      method: 'POST',
      body: {
        email: 'user@example.com',
        password: 'secret123',
        token: 'sensitive-token',
        creditCard: '4111111111111111',
        normalField: 'normal-value',
      },
    };

    // Mock logger to capture logged data
    const mockLogger = require('winston').createLogger();
    const infoSpy = jest.spyOn(mockLogger, 'info');

    await loggingMiddleware(
      sensitiveRequest as Request,
      mockResponse as Response,
      mockNext
    );

    // Wait for response finish event
    await new Promise(resolve => setTimeout(resolve, 20));

    // Verify that sensitive data was sanitized in logs
    const loggedData = infoSpy.mock.calls.find(call =>
      call[0] === 'Request received'
    );

    expect(loggedData).toBeDefined();
    const loggedBody = loggedData[1].body;

    expect(loggedBody.password).toBe('[REDACTED]');
    expect(loggedBody.token).toBe('[REDACTED]');
    expect(loggedBody.creditCard).toBe('[REDACTED]');
    expect(loggedBody.email).toBe('user@example.com'); // Non-sensitive
    expect(loggedBody.normalField).toBe('normal-value'); // Non-sensitive
  });
});
