const sdkStart = jest.fn();
const sdkShutdown = jest.fn().mockResolvedValue(undefined);
const loggerInfo = jest.fn();
const loggerError = jest.fn();
const spanSetStatus = jest.fn();
const spanRecordException = jest.fn();
const spanEnd = jest.fn();
const spanSetAttributes = jest.fn();

const span = {
  spanContext: () => ({ traceId: 'trace-1', spanId: 'span-1' }),
  setStatus: spanSetStatus,
  recordException: spanRecordException,
  end: spanEnd,
  setAttributes: spanSetAttributes
};

const tracer = {
  startSpan: jest.fn(() => span)
};

jest.mock('@opentelemetry/sdk-node', () => ({
  NodeSDK: jest.fn().mockImplementation((config: unknown) => ({
    ...(config as Record<string, unknown>),
    start: sdkStart,
    shutdown: sdkShutdown,
    _resource: (config as { resource: unknown }).resource
  }))
}));

jest.mock('@opentelemetry/resources', () => ({
  Resource: jest.fn().mockImplementation((attributes: unknown) => ({ attributes }))
}));

jest.mock('@opentelemetry/semantic-conventions', () => ({
  SemanticResourceAttributes: {
    SERVICE_NAME: 'service.name',
    SERVICE_VERSION: 'service.version',
    DEPLOYMENT_ENVIRONMENT: 'deployment.environment'
  }
}));

jest.mock('@opentelemetry/exporter-jaeger', () => ({
  JaegerExporter: jest.fn().mockImplementation((config: unknown) => config)
}));

jest.mock('@opentelemetry/auto-instrumentations-node', () => ({
  getNodeAutoInstrumentations: jest.fn(() => ['auto'])
}));

jest.mock('@opentelemetry/api', () => ({
  trace: {
    getTracer: jest.fn(() => tracer),
    setSpan: jest.fn((_ctx: unknown, _span: unknown) => 'ctx-with-span')
  },
  context: {
    active: jest.fn(() => 'ctx'),
    with: jest.fn((_ctx: unknown, fn: () => unknown) => fn())
  },
  SpanStatusCode: {
    OK: 'OK',
    ERROR: 'ERROR'
  },
  SpanKind: {
    INTERNAL: 'INTERNAL'
  }
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'generated-correlation')
}));

jest.mock('../logger/logger', () => ({
  createLogger: jest.fn(() => ({
    info: loggerInfo,
    error: loggerError
  }))
}));

import type { Request, Response } from 'express';
import { TracingService, correlationMiddleware } from './openTelemetry';

describe('TracingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SERVICE_VERSION = '2.0.0';
    process.env.NODE_ENV = 'test';
    process.env.JAEGER_ENDPOINT = 'http://jaeger:14268/api/traces';
  });

  it('constructs sdk with resource metadata and exporter config', () => {
    const service = new TracingService('wallet-service');
    const nodeSdkCall = (require('@opentelemetry/sdk-node').NodeSDK as jest.Mock).mock.calls[0]?.[0];

    expect(nodeSdkCall.resource.attributes['service.name']).toBe('wallet-service');
    expect(nodeSdkCall.resource.attributes['service.version']).toBe('2.0.0');
    expect(nodeSdkCall.resource.attributes['deployment.environment']).toBe('test');
    expect(nodeSdkCall.traceExporter.endpoint).toBe('http://jaeger:14268/api/traces');
    expect(service).toBeDefined();
  });

  it('starts sdk and logs initialized service name', () => {
    const service = new TracingService('community-service');

    service.start();

    expect(sdkStart).toHaveBeenCalledTimes(1);
    expect(loggerInfo).toHaveBeenCalledWith(expect.stringContaining('Tracing initialized for community-service'));
  });

  it('swallows sdk start rejection and logs the failure', async () => {
    sdkStart.mockRejectedValueOnce(new Error('start failed'));
    const service = new TracingService('community-service');

    service.start();
    await Promise.resolve();

    expect(loggerError).toHaveBeenCalledWith(
      'Tracing start failed',
      expect.objectContaining({ error: 'start failed' })
    );
  });

  it('stops sdk via shutdown', async () => {
    const service = new TracingService('order-service');

    await service.stop();

    expect(sdkShutdown).toHaveBeenCalledTimes(1);
  });

  it('swallows sdk shutdown rejection and resolves cleanly', async () => {
    sdkShutdown.mockRejectedValueOnce(new Error('shutdown failed'));
    const service = new TracingService('order-service');

    await expect(service.stop()).resolves.toBeUndefined();

    expect(loggerError).toHaveBeenCalledWith(
      'Tracing shutdown failed',
      expect.objectContaining({ error: 'shutdown failed' })
    );
  });

  it('creates span and correlation metadata without parent context', () => {
    const service = new TracingService('catalog-service');

    const created = service.createSpan('operation');

    expect(tracer.startSpan).toHaveBeenCalledWith(
      'operation',
      expect.objectContaining({
        kind: 'INTERNAL',
        attributes: expect.objectContaining({
          'correlation.id': 'generated-correlation'
        })
      })
    );
    expect(created.traceId).toBe('trace-1');
    expect(created.spanId).toBe('span-1');
    expect(created.correlationId).toBe('generated-correlation');
  });

  it('creates span using parent correlation and causation ids', () => {
    const service = new TracingService('catalog-service');

    const created = service.createSpan('child-op', {
      traceId: 'pt',
      spanId: 'ps',
      correlationId: 'corr-parent',
      causationId: 'cause-parent'
    });

    expect(created.correlationId).toBe('corr-parent');
    expect(tracer.startSpan).toHaveBeenCalledWith(
      'child-op',
      expect.objectContaining({
        attributes: expect.objectContaining({
          'correlation.id': 'corr-parent',
          'causation.id': 'cause-parent'
        })
      })
    );
  });

  it('executes operation with span and marks status OK on success', async () => {
    const service = new TracingService('payment-service');

    const result = await service.executeWithSpan('charge', async ctx => `ok:${ctx.traceId}`);

    expect(result).toBe('ok:trace-1');
    expect(spanSetStatus).toHaveBeenCalledWith({ code: 'OK' });
    expect(spanEnd).toHaveBeenCalled();
  });

  it('records exception and marks ERROR when operation fails', async () => {
    const service = new TracingService('payment-service');
    const error = new Error('operation failed');

    await expect(
      service.executeWithSpan('failing-op', async () => {
        throw error;
      })
    ).rejects.toThrow('operation failed');

    expect(spanSetStatus).toHaveBeenCalledWith({
      code: 'ERROR',
      message: 'operation failed'
    });
    expect(spanRecordException).toHaveBeenCalledWith(error);
    expect(spanEnd).toHaveBeenCalled();
  });

  it('adds standardized event attributes to span', () => {
    const service = new TracingService('shared-service');
    service.addEventAttributes(span as never, 'OrderCreated', 'evt-1', 'corr-1');

    expect(spanSetAttributes).toHaveBeenCalledWith({
      'event.type': 'OrderCreated',
      'event.id': 'evt-1',
      'correlation.id': 'corr-1'
    });
  });
});

describe('correlationMiddleware', () => {
  it('uses incoming x-correlation-id when provided', () => {
    const middleware = correlationMiddleware();
    const req = { headers: { 'x-correlation-id': 'corr-from-header' } } as unknown as Request;
    const setHeader = jest.fn();
    const res = { setHeader } as unknown as Response;
    const next = jest.fn();

    middleware(req, res, next);

    expect((req as Request & { correlationId: string }).correlationId).toBe('corr-from-header');
    expect(setHeader).toHaveBeenCalledWith('x-correlation-id', 'corr-from-header');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('generates correlation id when header is missing', () => {
    const middleware = correlationMiddleware();
    const req = { headers: {} } as unknown as Request;
    const setHeader = jest.fn();
    const res = { setHeader } as unknown as Response;
    const next = jest.fn();

    middleware(req, res, next);

    expect((req as Request & { correlationId: string }).correlationId).toBe('generated-correlation');
    expect(setHeader).toHaveBeenCalledWith('x-correlation-id', 'generated-correlation');
    expect(next).toHaveBeenCalledTimes(1);
  });
});
