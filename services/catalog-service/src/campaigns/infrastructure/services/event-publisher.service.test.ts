import { v4 as uuidv4 } from 'uuid';
import { EventPublisherService } from './event-publisher.service';

jest.mock('uuid', () => ({
  v4: jest.fn()
}));

describe('EventPublisherService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('publishes event to outbox using default prisma client', async () => {
    (uuidv4 as jest.Mock).mockReturnValueOnce('outbox-1').mockReturnValueOnce('event-1');
    const prisma = {
      campaign_OutboxEvent: {
        create: jest.fn().mockResolvedValue(undefined)
      }
    };
    const service = new EventPublisherService(prisma as never);
    const event = { eventType: 'CampaignCreated', campaignId: 'camp-1' };

    await service.publish(event);

    expect(prisma.campaign_OutboxEvent.create).toHaveBeenCalledWith({
      data: {
        id: 'outbox-1',
        eventId: 'event-1',
        eventType: 'CampaignCreated',
        eventData: event,
        status: 'PENDING'
      }
    });
  });

  it('uses constructor name as fallback event type and supports transaction client', async () => {
    (uuidv4 as jest.Mock).mockReturnValueOnce('outbox-2').mockReturnValueOnce('event-2');
    const prisma = {
      campaign_OutboxEvent: {
        create: jest.fn().mockResolvedValue(undefined)
      }
    };
    const tx = {
      campaign_OutboxEvent: {
        create: jest.fn().mockResolvedValue(undefined)
      }
    };
    const service = new EventPublisherService(prisma as never);

    class CampaignLaunched {
      constructor(public readonly id: string) {}
    }

    await service.publish(new CampaignLaunched('camp-1'), tx);

    expect(tx.campaign_OutboxEvent.create).toHaveBeenCalledTimes(1);
    expect(prisma.campaign_OutboxEvent.create).not.toHaveBeenCalled();
    expect(tx.campaign_OutboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: 'CampaignLaunched',
          status: 'PENDING'
        })
      })
    );
  });
});
