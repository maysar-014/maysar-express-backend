import { EventPublisherService } from './event-publisher.service';
import { makeId } from '@shared/ids/id';

jest.mock('@shared/ids/id', () => {
  const actual = jest.requireActual('@shared/ids/id');
  return {
    ...actual,
    makeId: jest.fn()
  };
});

describe('EventPublisherService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('publishes event to outbox using default prisma client', async () => {
    (makeId as jest.Mock)
      .mockReturnValueOnce('cmp_out_01H00000000000000000000000')
      .mockReturnValueOnce('evt_01H00000000000000000000000');
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
        id: 'cmp_out_01H00000000000000000000000',
        eventId: 'evt_01H00000000000000000000000',
        eventType: 'CampaignCreated',
        eventData: event,
        status: 'PENDING'
      }
    });
  });

  it('uses constructor name as fallback event type and supports transaction client', async () => {
    (makeId as jest.Mock)
      .mockReturnValueOnce('cmp_out_01H00000000000000000000000')
      .mockReturnValueOnce('evt_01H00000000000000000000000');
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
