import type { EventEnvelope } from './eventBus';
import { eventBus } from './eventBus';
import { EventIdempotency } from '../middleware/idempotency';
import { IdempotentEventBus } from './idempotentEventBus';

jest.mock('./eventBus', () => ({
  eventBus: {
    publish: jest.fn(),
    subscribe: jest.fn()
  }
}));

jest.mock('../middleware/idempotency', () => ({
  EventIdempotency: jest.fn().mockImplementation(() => ({
    withIdempotency: jest.fn(async (_eventId: string, _consumer: string, callback: () => Promise<unknown>) =>
      callback()
    )
  }))
}));

describe('IdempotentEventBus', () => {
  let bus: IdempotentEventBus;
  let withIdempotency: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    bus = new IdempotentEventBus('redis://unit-test');
    withIdempotency = (EventIdempotency as unknown as jest.Mock).mock.results[0].value.withIdempotency;
  });

  it('wraps subscribed handlers with idempotency when eventId exists', async () => {
    const handler = jest.fn(async () => undefined);
    const envelope: EventEnvelope = { eventId: 'evt-1', eventType: 'OrderCreated', data: { id: 'o-1' } };

    await bus.subscribe('OrderCreated', handler);

    expect(eventBus.subscribe).toHaveBeenCalledWith('OrderCreated', expect.any(Function));
    const wrappedHandler = (eventBus.subscribe as jest.Mock).mock.calls[0][1] as (e: EventEnvelope) => Promise<void>;
    await wrappedHandler(envelope);

    expect(withIdempotency).toHaveBeenCalledWith('evt-1', 'OrderCreated', expect.any(Function));
    expect(handler).toHaveBeenCalledWith(envelope);
  });

  it('executes handler directly when envelope has no eventId', async () => {
    const handler = jest.fn(async () => undefined);
    const envelope: EventEnvelope = { eventType: 'OrderCreated', data: { id: 'o-1' } };

    await bus.subscribe('OrderCreated', handler);
    const wrappedHandler = (eventBus.subscribe as jest.Mock).mock.calls[0][1] as (e: EventEnvelope) => Promise<void>;
    await wrappedHandler(envelope);

    expect(withIdempotency).not.toHaveBeenCalled();
    expect(handler).toHaveBeenCalledWith(envelope);
  });

  it('supports named subscription options', async () => {
    const handler = jest.fn(async () => undefined);

    await bus.subscribe('OrderCreated', { name: 'billing-consumer', handler });

    expect(eventBus.subscribe).toHaveBeenCalledWith(
      'OrderCreated',
      expect.objectContaining({
        name: 'billing-consumer',
        handler: expect.any(Function)
      })
    );
  });

  it('forwards string-based publish and emit calls', async () => {
    await bus.publish('OrderCreated', { id: 'o-1' }, { source: 'order-service' });
    await bus.emit('OrderCreated', { id: 'o-2' }, { source: 'order-service' });

    expect(eventBus.publish).toHaveBeenNthCalledWith(1, 'OrderCreated', { id: 'o-1' }, { source: 'order-service' });
    expect(eventBus.publish).toHaveBeenNthCalledWith(2, 'OrderCreated', { id: 'o-2' }, { source: 'order-service' });
  });

  it('forwards envelope-based publish and emit calls', async () => {
    const envelope: EventEnvelope = { eventId: 'evt-9', eventType: 'OrderCreated', data: { id: 'o-9' } };

    await bus.publish(envelope);
    await bus.emit(envelope);

    expect(eventBus.publish).toHaveBeenNthCalledWith(1, envelope);
    expect(eventBus.publish).toHaveBeenNthCalledWith(2, envelope);
  });
});
