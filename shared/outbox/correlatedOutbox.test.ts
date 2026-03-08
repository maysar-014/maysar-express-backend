import type { PrismaClient } from '@prisma/client';
import { EventCorrelationService } from '../events/correlatedEvents';
import { tracingService } from '../tracing/openTelemetry';
import { CorrelatedOutbox } from './correlatedOutbox';

jest.mock('../events/correlatedEvents', () => ({
  EventCorrelationService: {
    createCorrelatedEvent: jest.fn()
  }
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

describe('CorrelatedOutbox', () => {
  const prismaStub = {
    outboxEvent: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn()
    }
  } as unknown as PrismaClient;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('saves correlated event with explicit trace context overrides', async () => {
    const outbox = new CorrelatedOutbox(prismaStub);
    const saveEventSpy = jest.spyOn(outbox, 'saveEvent').mockResolvedValue();
    const event = {
      eventId: 'evt-1',
      eventType: 'OrderCreated',
      data: { orderId: 'order-1' },
      correlationId: 'corr-1'
    };

    await outbox.saveCorrelatedEvent(
      event,
      undefined,
      { traceId: 'trace-explicit', spanId: 'span-explicit', correlationId: 'corr-explicit' }
    );

    expect(tracingService.executeWithSpan).toHaveBeenCalledWith(
      'outbox-save-OrderCreated',
      expect.any(Function),
      expect.objectContaining({ traceId: 'trace-explicit' })
    );
    expect(saveEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        traceId: 'trace-explicit',
        spanId: 'span-explicit'
      }),
      undefined
    );
  });

  it('falls back to span trace context when explicit trace context is not provided', async () => {
    const outbox = new CorrelatedOutbox(prismaStub);
    const saveEventSpy = jest.spyOn(outbox, 'saveEvent').mockResolvedValue();

    await outbox.saveCorrelatedEvent({
      eventId: 'evt-2',
      eventType: 'PaymentCompleted',
      data: { paymentId: 'pay-1' },
      correlationId: 'corr-2'
    });

    expect(saveEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        traceId: 'trace-from-span',
        spanId: 'span-from-span'
      }),
      undefined
    );
  });

  it('creates, saves, and returns correlated events', async () => {
    const outbox = new CorrelatedOutbox(prismaStub);
    const createdEvent = {
      eventId: 'evt-created',
      eventType: 'InventoryReserved',
      data: { reservationId: 'res-1' },
      correlationId: 'corr-created'
    };

    (EventCorrelationService.createCorrelatedEvent as jest.Mock).mockReturnValue(createdEvent);
    const saveCorrelatedEventSpy = jest.spyOn(outbox, 'saveCorrelatedEvent').mockResolvedValue();

    const result = await outbox.createAndSaveEvent('InventoryReserved', { reservationId: 'res-1' });

    expect(EventCorrelationService.createCorrelatedEvent).toHaveBeenCalledWith(
      'InventoryReserved',
      { reservationId: 'res-1' },
      expect.objectContaining({
        traceContext: expect.objectContaining({
          traceId: 'trace-from-span',
          spanId: 'span-from-span'
        })
      })
    );
    expect(saveCorrelatedEventSpy).toHaveBeenCalledWith(
      createdEvent,
      undefined,
      expect.objectContaining({
        traceId: 'trace-from-span',
        spanId: 'span-from-span'
      })
    );
    expect(result).toBe(createdEvent);
  });
});
