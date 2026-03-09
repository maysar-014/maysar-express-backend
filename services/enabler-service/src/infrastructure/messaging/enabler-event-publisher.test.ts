const mockPrisma = {
  enabler_OutboxEvent: {
    create: jest.fn()
  }
};

const uuidMock = jest.fn(() => 'fixed-event-id');

jest.mock('../database/prisma-client', () => ({
  __esModule: true,
  default: mockPrisma
}));

jest.mock('uuid', () => ({
  v4: () => uuidMock()
}));

import { EnablerEventPublisher } from './enabler-event-publisher';

class ProductListedEvent {
  constructor(public readonly listingId: string) {}
}

describe('EnablerEventPublisher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('saves event into outbox with generated id and constructor type', async () => {
    mockPrisma.enabler_OutboxEvent.create.mockResolvedValue(undefined);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const publisher = new EnablerEventPublisher();
    const event = new ProductListedEvent('listing-1');

    await publisher.publish(event);

    expect(mockPrisma.enabler_OutboxEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventId: 'fixed-event-id',
        eventType: 'ProductListedEvent',
        eventData: JSON.stringify(event),
        status: 'PENDING',
        createdAt: expect.any(Date)
      })
    });
    expect(logSpy).toHaveBeenCalledWith('[EnablerService] Published event ProductListedEvent to outbox');
  });
});

