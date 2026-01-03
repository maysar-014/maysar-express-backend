import { EventCorrelationService, eventChainTracker } from '../events/correlatedEvents';
import { tracingService } from '../tracing/openTelemetry';
import { v4 as uuidv4 } from 'uuid';

describe('Correlation & Tracing', () => {
  beforeAll(() => {
    tracingService.start();
  });

  afterAll(async () => {
    await tracingService.stop();
  });

  describe('Event Correlation', () => {
    test('should create correlated event with correlation ID', () => {
      const correlationId = uuidv4();
      const event = EventCorrelationService.createCorrelatedEvent(
        'test.event.v1',
        { test: 'data' },
        { correlationId }
      );

      expect(event.correlationId).toBe(correlationId);
      expect(event.eventId).toBeDefined();
      expect(event.eventType).toBe('test.event.v1');
      expect(event.causationId).toBeUndefined();
    });

    test('should propagate correlation from source event', () => {
      const sourceEvent = EventCorrelationService.createCorrelatedEvent(
        'source.event.v1',
        { source: 'data' }
      );

      const followUpEvent = EventCorrelationService.propagateCorrelation(
        sourceEvent,
        'followup.event.v1',
        { followup: 'data' }
      );

      expect(followUpEvent.correlationId).toBe(sourceEvent.correlationId);
      expect(followUpEvent.causationId).toBe(sourceEvent.eventId);
      expect(followUpEvent.eventType).toBe('followup.event.v1');
    });

    test('should track event chains', () => {
      const correlationId = uuidv4();
      
      const event1 = EventCorrelationService.createCorrelatedEvent(
        'order.created.v1',
        { orderId: '123' },
        { correlationId }
      );

      const event2 = EventCorrelationService.propagateCorrelation(
        event1,
        'payment.initiated.v1',
        { paymentId: '456' }
      );

      eventChainTracker.addEvent(event1);
      eventChainTracker.addEvent(event2);

      const chain = eventChainTracker.getChain(correlationId);
      expect(chain).toBeDefined();
      expect(chain!.events).toHaveLength(2);
      expect(chain!.events[0].eventType).toBe('order.created.v1');
      expect(chain!.events[1].eventType).toBe('payment.initiated.v1');
      expect(chain!.events[1].causationId).toBe(event1.eventId);
    });
  });

  describe('Distributed Tracing', () => {
    test('should create span with trace context', async () => {
      const result = await tracingService.executeWithSpan(
        'test-operation',
        async (traceContext) => {
          expect(traceContext.traceId).toBeDefined();
          expect(traceContext.spanId).toBeDefined();
          expect(traceContext.correlationId).toBeDefined();
          return 'success';
        }
      );

      expect(result).toBe('success');
    });

    test('should propagate trace context to child spans', async () => {
      await tracingService.executeWithSpan(
        'parent-operation',
        async (parentContext) => {
          const parentTraceId = parentContext.traceId;
          
          await tracingService.executeWithSpan(
            'child-operation',
            async (childContext) => {
              expect(childContext.traceId).toBe(parentTraceId);
              expect(childContext.causationId).toBe(parentContext.correlationId);
            },
            parentContext
          );
        }
      );
    });

    test('should handle errors in traced operations', async () => {
      await expect(
        tracingService.executeWithSpan(
          'failing-operation',
          async () => {
            throw new Error('Test error');
          }
        )
      ).rejects.toThrow('Test error');
    });
  });

  describe('Integration', () => {
    test('should create event with trace context', async () => {
      await tracingService.executeWithSpan(
        'event-creation',
        async (traceContext) => {
          const event = EventCorrelationService.createCorrelatedEvent(
            'traced.event.v1',
            { data: 'test' },
            { traceContext }
          );

          expect(event.traceId).toBe(traceContext.traceId);
          expect(event.spanId).toBe(traceContext.spanId);
          expect(event.correlationId).toBe(traceContext.correlationId);
        }
      );
    });

    test('should maintain correlation across service boundaries', () => {
      const correlationId = uuidv4();
      
      // Simulate order service event
      const orderEvent = EventCorrelationService.createCorrelatedEvent(
        'order.created.v1',
        { orderId: '123' },
        { correlationId }
      );

      // Simulate payment service response
      const paymentEvent = EventCorrelationService.propagateCorrelation(
        orderEvent,
        'payment.succeeded.v1',
        { paymentId: '456' }
      );

      // Simulate inventory service response
      const inventoryEvent = EventCorrelationService.propagateCorrelation(
        paymentEvent,
        'inventory.reserved.v1',
        { reservationId: '789' }
      );

      // All events should have same correlation ID
      expect(orderEvent.correlationId).toBe(correlationId);
      expect(paymentEvent.correlationId).toBe(correlationId);
      expect(inventoryEvent.correlationId).toBe(correlationId);

      // Causation chain should be maintained
      expect(paymentEvent.causationId).toBe(orderEvent.eventId);
      expect(inventoryEvent.causationId).toBe(paymentEvent.eventId);
    });
  });
});