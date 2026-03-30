import { EventStore } from './event-store';

describe('EventStore', () => {
  let eventStore: EventStore;

  beforeEach(() => {
    eventStore = new EventStore();
  });

  it('should store events', async () => {
    const event = { id: 'e1', type: 'TEST', data: {} };
    await eventStore.append(event);
    await expect(eventStore.getEvents()).resolves.toContainEqual(event);
  });

  it('should retrieve events by type', async () => {
    await eventStore.append({ id: 'e1', type: 'TEST', data: {} });
    await eventStore.append({ id: 'e2', type: 'OTHER', data: {} });
    const events = await eventStore.getEventsByType('TEST');
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('TEST');
  });

  it('should clear events', async () => {
    await eventStore.append({ id: 'e1', type: 'TEST', data: {} });
    eventStore.clear();
    await expect(eventStore.getEvents()).resolves.toHaveLength(0);
  });
});
