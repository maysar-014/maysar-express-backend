import {
  BusinessRegisteredEvent,
  BusinessVerifiedEvent,
  BusinessSuspendedEvent,
  BusinessReactivatedEvent,
  BusinessUpdatedEvent,
  ComplianceStatusChangedEvent
} from '../../domain/events';
import { BusinessType, ComplianceStatus } from '../../domain/types/business.types';

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
};

jest.mock('../services/logger.service', () => ({
  logger: mockLogger
}));

import { BusinessEventPublisher } from './business-event-publisher';

describe('BusinessEventPublisher', () => {
  const outboxRepository = {
    create: jest.fn()
  };
  const processOutbox = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    outboxRepository.create.mockResolvedValue({
      id: 'outbox-1',
      eventId: 'event-1',
      eventType: 'BusinessRegistered',
      eventData: {},
      status: 'PENDING',
      createdAt: new Date(),
      attempts: 0
    });
    processOutbox.mockResolvedValue(1);
  });

  it('publish persists event payload and processes outbox when processor exists', async () => {
    const publisher = new BusinessEventPublisher(outboxRepository as any, processOutbox);
    const event = new BusinessRegisteredEvent(
      'biz-1',
      'owner-1',
      BusinessType.SOLE_PROPRIETORSHIP,
      'REG-100'
    );

    await publisher.publish(event);

    expect(outboxRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: event.eventId,
        eventType: 'BusinessRegistered',
        eventData: expect.objectContaining({
          aggregateId: 'biz-1',
          aggregateType: 'Business',
          ownerId: 'owner-1',
          businessType: BusinessType.SOLE_PROPRIETORSHIP,
          registrationNumber: 'REG-100'
        })
      })
    );
    expect(processOutbox).toHaveBeenCalledTimes(1);
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Business event saved to outbox',
      expect.objectContaining({ eventType: 'BusinessRegistered' })
    );
  });

  it('publish does not process outbox when processor is not provided', async () => {
    const publisher = new BusinessEventPublisher(outboxRepository as any);
    const event = new BusinessVerifiedEvent('biz-1', 'verifier-1', 'owner-1');

    await publisher.publish(event);

    expect(outboxRepository.create).toHaveBeenCalledTimes(1);
    expect(processOutbox).not.toHaveBeenCalled();
  });

  it('publish maps failures to logger and rethrows', async () => {
    const publisher = new BusinessEventPublisher(outboxRepository as any, processOutbox);
    const event = new BusinessSuspendedEvent('biz-2', 'admin-1', 'fraud');
    outboxRepository.create.mockRejectedValueOnce(new Error('outbox unavailable'));

    await expect(publisher.publish(event)).rejects.toThrow('outbox unavailable');
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed to publish business event to outbox',
      expect.objectContaining({
        eventType: 'BusinessSuspended',
        aggregateId: 'biz-2',
        error: 'outbox unavailable'
      })
    );
  });

  it('publishMany publishes each event sequentially', async () => {
    const publisher = new BusinessEventPublisher(outboxRepository as any, processOutbox);
    const events = [
      new BusinessRegisteredEvent('biz-a', 'owner-a', BusinessType.CORPORATION, 'REG-A'),
      new BusinessReactivatedEvent('biz-a', 'admin-a')
    ];

    await publisher.publishMany(events);

    expect(outboxRepository.create).toHaveBeenCalledTimes(2);
    expect(processOutbox).toHaveBeenCalledTimes(2);
  });

  it('maps event-specific payload data for all supported event classes', async () => {
    const publisher = new BusinessEventPublisher(outboxRepository as any, processOutbox);

    const events = [
      {
        event: new BusinessVerifiedEvent('biz-v', 'verifier-9', 'owner-v'),
        expected: { verifiedBy: 'verifier-9', ownerId: 'owner-v' }
      },
      {
        event: new BusinessSuspendedEvent('biz-s', 'admin-2', 'policy violation'),
        expected: { suspendedBy: 'admin-2', reason: 'policy violation' }
      },
      {
        event: new BusinessReactivatedEvent('biz-r', 'admin-3'),
        expected: { reactivatedBy: 'admin-3' }
      },
      {
        event: new BusinessUpdatedEvent('biz-u', 'editor-1', ['name', 'address']),
        expected: { updatedBy: 'editor-1', changes: ['name', 'address'] }
      },
      {
        event: new ComplianceStatusChangedEvent(
          'biz-c',
          ComplianceStatus.UNDER_REVIEW,
          ComplianceStatus.COMPLIANT,
          'biz-c'
        ),
        expected: {
          oldStatus: ComplianceStatus.UNDER_REVIEW,
          newStatus: ComplianceStatus.COMPLIANT,
          businessId: 'biz-c'
        }
      }
    ];

    for (const { event, expected } of events) {
      await publisher.publish(event as any);
      const call = outboxRepository.create.mock.calls[outboxRepository.create.mock.calls.length - 1][0];
      expect(call.eventData).toEqual(expect.objectContaining(expected));
    }
  });
});
