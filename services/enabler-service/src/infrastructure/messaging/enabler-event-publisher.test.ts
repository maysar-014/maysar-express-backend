const mockPrisma = {
  enabler_OutboxEvent: {
    create: jest.fn()
  }
};

const makeIdMock = jest.fn();

jest.mock('../database/prisma-client', () => ({
  __esModule: true,
  default: mockPrisma
}));

jest.mock('@shared/ids/id', () => {
  const actual = jest.requireActual('@shared/ids/id');
  return {
    ...actual,
    makeId: (...args: string[]) => makeIdMock(...args)
  };
});

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
    makeIdMock.mockReturnValueOnce('enb_out_01H00000000000000000000000');
    makeIdMock.mockReturnValueOnce('evt_01H00000000000000000000000');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const publisher = new EnablerEventPublisher();
    const event = new ProductListedEvent('listing-1');

    await publisher.publish(event);

    expect(mockPrisma.enabler_OutboxEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: 'enb_out_01H00000000000000000000000',
        eventId: 'evt_01H00000000000000000000000',
        eventType: 'ProductListedEvent',
        eventData: JSON.stringify(event),
        status: 'PENDING',
        createdAt: expect.any(Date)
      })
    });
    expect(logSpy).toHaveBeenCalledWith('[EnablerService] Published event ProductListedEvent to outbox');
  });
});
