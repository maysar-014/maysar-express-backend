import { CheckoutEventHandlers } from './checkout-event.handlers';

describe('CheckoutEventHandlers', () => {
  let handlers: CheckoutEventHandlers;

  beforeEach(() => {
    const mockEventBus = {
      subscribe: jest.fn(),
      publish: jest.fn()
    };
    handlers = new CheckoutEventHandlers(mockEventBus, null as any);
  });

  it('should instantiate', () => {
    expect(handlers).toBeDefined();
  });
});
