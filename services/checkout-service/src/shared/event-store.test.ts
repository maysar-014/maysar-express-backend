import { EventStore } from './event-store';

describe('EventStore', () => {
  let eventStore: EventStore;

  beforeEach(() => {
    eventStore = new EventStore();
  });

  it('should store events', () => {
    const event = { id: 'e1', type: 'TEST', data: {} };
    eventStore.append(event);
    expect(eventStore.getEvents()).toContain(event);
  });

  it('should retrieve events by type', () => {
    eventStore.append({ id: 'e1', type: 'TEST', data: {} });
    eventStore.append({ id: 'e2', type: 'OTHER', data: {} });
    const events = eventStore.getEventsByType('TEST');
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('TEST');
  });

  it('should clear events', () => {
    eventStore.append({ id: 'e1', type: 'TEST', data: {} });
    eventStore.clear();
    expect(eventStore.getEvents()).toHaveLength(0);
  });
});
