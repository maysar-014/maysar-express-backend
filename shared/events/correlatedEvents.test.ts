import { v4 as uuidv4 } from 'uuid';
import { tracingService } from '../tracing/openTelemetry';
import { EventChainTracker, EventCorrelationService } from './correlatedEvents';

jest.mock('uuid', () => ({
  v4: jest.fn()
}));

jest.mock('../tracing/openTelemetry', () => ({
  tracingService: {
    executeWithSpan: jest.fn(
      async (
        _name: string,
        operation: (traceContext: {
          traceId: string;
          spanId: string;
          correlationId: string;
          causationId?: string;
        }) => Promise<unknown>
      ) =>
        operation({
          traceId: 'trace-from-span',
          spanId: 'span-from-span',
          correlationId: 'corr-from-span'
        })
    )
  }
}));

describe('EventCorrelationService', () => {
  const mockedUuid = uuidv4 as jest.MockedFunction<typeof uuidv4>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SERVICE_NAME = 'test-service';
  });

  it('creates correlated events with ids, metadata and trace context', () => {
    mockedUuid.mockReturnValueOnce('evt-generated');

    const event = EventCorrelationService.createCorrelatedEvent('OrderCreated', { orderId: 'order-1' }, {
      causationId: 'cause-1',
      traceContext: {
        traceId: 'trace-1',
        spanId: 'span-1',
        correlationId: 'corr-generated'
      }
    });

    expect(event.eventType).toBe('OrderCreated');
    expect(event.eventId).toBe('evt-generated');
    expect(event.correlationId).toBe('corr-generated');
    expect(event.data).toEqual({ orderId: 'order-1' });
    expect(event.metadata).toEqual(
      expect.objectContaining({
        eventId: 'evt-generated',
        correlationId: 'corr-generated',
        causationId: 'cause-1',
        traceId: 'trace-1',
        spanId: 'span-1',
        producer: 'test-service',
        version: 'v1'
      })
    );
  });

  it('propagates correlation and causation from a source event', () => {
    mockedUuid.mockReturnValueOnce('evt-new');
    const sourceEvent = {
      eventId: 'evt-source',
      eventType: 'OrderCreated',
      correlationId: 'corr-1',
      traceId: 'trace-1',
      spanId: 'span-1',
      metadata: {
        timestamp: '2026-03-07T12:00:00.000Z'
      }
    };

    const next = EventCorrelationService.propagateCorrelation(sourceEvent, 'OrderPaid', { paid: true });

    expect(next.correlationId).toBe('corr-1');
    expect(next.metadata?.causationId).toBe('evt-source');
    expect(next.metadata?.traceId).toBe('trace-1');
    expect(next.metadata?.spanId).toBe('span-1');
  });

  it('publishes correlated events inside tracing spans', async () => {
    mockedUuid.mockReturnValueOnce('evt-published');
    const publish = jest.fn(async () => undefined);

    await EventCorrelationService.publishWithTracing(
      'PaymentCompleted',
      { paymentId: 'pay-1' },
      publish,
      {
        traceId: 'trace-parent',
        spanId: 'span-parent',
        correlationId: 'corr-parent',
        causationId: 'cause-parent'
      }
    );

    expect(tracingService.executeWithSpan).toHaveBeenCalledWith(
      'publish-PaymentCompleted',
      expect.any(Function),
      expect.objectContaining({ correlationId: 'corr-parent' })
    );
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'PaymentCompleted',
        correlationId: 'corr-parent'
      })
    );
  });
});

describe('EventChainTracker', () => {
  it('tracks and retrieves event chains by correlation id', () => {
    const tracker = new EventChainTracker();
    tracker.addEvent({
      eventId: 'evt-1',
      eventType: 'OrderCreated',
      correlationId: 'corr-1',
      traceId: 'trace-1',
      spanId: 'span-1',
      metadata: {
        timestamp: '2026-03-07T12:00:00.000Z',
        causationId: 'cause-1'
      }
    });

    const chain = tracker.getChain('corr-1');
    expect(chain).toBeDefined();
    expect(chain?.events).toHaveLength(1);
    expect(chain?.events[0]).toEqual({
      eventId: 'evt-1',
      eventType: 'OrderCreated',
      causationId: 'cause-1',
      timestamp: '2026-03-07T12:00:00.000Z',
      traceId: 'trace-1',
      spanId: 'span-1'
    });
  });

  it('returns only chains active within the last 24 hours', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-08T12:00:00.000Z'));

    const tracker = new EventChainTracker();
    tracker.addEvent({
      eventId: 'evt-old',
      eventType: 'A',
      correlationId: 'corr-old',
      metadata: { timestamp: '2026-03-05T12:00:00.000Z' }
    });
    tracker.addEvent({
      eventId: 'evt-new',
      eventType: 'B',
      correlationId: 'corr-new',
      metadata: { timestamp: '2026-03-08T11:00:00.000Z' }
    });

    const active = tracker.getActiveChains();

    expect(active).toHaveLength(1);
    expect(active[0].correlationId).toBe('corr-new');

    jest.useRealTimers();
  });
});
