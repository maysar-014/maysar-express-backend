import { EventBusAdapter } from './event-bus.adapter';

describe('EventBusAdapter', () => {
  let adapter: EventBusAdapter;

  beforeEach(() => {
    adapter = new EventBusAdapter();
  });

  it('should instantiate', () => {
    expect(adapter).toBeDefined();
  });
});
