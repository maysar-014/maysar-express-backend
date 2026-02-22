import { EventBus, EventHandler } from '../eventBus';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  describe('on', () => {
    it('should register event handler', () => {
      const handler: EventHandler = jest.fn();
      eventBus.on('TestEvent', handler);
      expect((eventBus as any).handlers.has('TestEvent')).toBe(true);
    });

    it('should register multiple handlers for same event', () => {
      const handler1: EventHandler = jest.fn();
      const handler2: EventHandler = jest.fn();
      eventBus.on('TestEvent', handler1);
      eventBus.on('TestEvent', handler2);
      expect((eventBus as any).handlers.get('TestEvent')).toHaveLength(2);
    });
  });

  describe('emit', () => {
    it('should call registered handlers', async () => {
      const handler: EventHandler = jest.fn().mockResolvedValue(undefined);
      eventBus.on('TestEvent', handler);

      await eventBus.emit('TestEvent', { data: 'test' });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'TestEvent',
          payload: { data: 'test' }
        })
      );
    });

    it('should call all registered handlers', async () => {
      const handler1: EventHandler = jest.fn().mockResolvedValue(undefined);
      const handler2: EventHandler = jest.fn().mockResolvedValue(undefined);
      eventBus.on('TestEvent', handler1);
      eventBus.on('TestEvent', handler2);

      await eventBus.emit('TestEvent', { data: 'test' });

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should not throw when no handlers registered', async () => {
      await expect(eventBus.emit('UnknownEvent', {})).resolves.not.toThrow();
    });

    it('should generate unique event IDs', async () => {
      const handler: EventHandler = jest.fn().mockResolvedValue(undefined);
      eventBus.on('TestEvent', handler);

      await eventBus.emit('TestEvent', {});
      await eventBus.emit('TestEvent', {});

      const call1 = (handler as jest.Mock).mock.calls[0][0];
      const call2 = (handler as jest.Mock).mock.calls[1][0];

      expect(call1.eventId).not.toBe(call2.eventId);
    });

    it('should include timestamp in event', async () => {
      const handler: EventHandler = jest.fn().mockResolvedValue(undefined);
      eventBus.on('TestEvent', handler);

      await eventBus.emit('TestEvent', {});

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(String)
        })
      );
    });
  });

  describe('off', () => {
    it('should remove event handler', async () => {
      const handler: EventHandler = jest.fn().mockResolvedValue(undefined);
      eventBus.on('TestEvent', handler);
      eventBus.off('TestEvent', handler);

      await eventBus.emit('TestEvent', {});

      expect(handler).not.toHaveBeenCalled();
    });

    it('should only remove specified handler', async () => {
      const handler1: EventHandler = jest.fn().mockResolvedValue(undefined);
      const handler2: EventHandler = jest.fn().mockResolvedValue(undefined);
      eventBus.on('TestEvent', handler1);
      eventBus.on('TestEvent', handler2);

      eventBus.off('TestEvent', handler1);
      await eventBus.emit('TestEvent', {});

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should handle removing non-existent handler', () => {
      const handler: EventHandler = jest.fn();
      expect(() => eventBus.off('TestEvent', handler)).not.toThrow();
    });
  });

  describe('clear', () => {
    it('should remove all handlers for event type', async () => {
      const handler1: EventHandler = jest.fn().mockResolvedValue(undefined);
      const handler2: EventHandler = jest.fn().mockResolvedValue(undefined);
      eventBus.on('TestEvent', handler1);
      eventBus.on('TestEvent', handler2);

      eventBus.clear('TestEvent');
      await eventBus.emit('TestEvent', {});

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });

    it('should handle clearing non-existent event type', () => {
      expect(() => eventBus.clear('UnknownEvent')).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle handler errors gracefully', async () => {
      const errorHandler: EventHandler = jest.fn().mockRejectedValue(new Error('Handler error'));
      const successHandler: EventHandler = jest.fn().mockResolvedValue(undefined);
      
      eventBus.on('TestEvent', errorHandler);
      eventBus.on('TestEvent', successHandler);

      await expect(eventBus.emit('TestEvent', {})).rejects.toThrow();
    });
  });
});
