import { UserEventPublisher } from '../user-event-publisher';
import {
  UserRegisteredEvent,
  UserProfileUpdatedEvent,
  UserEmailVerifiedEvent
} from '../../../domain/events';
import { logger } from '../../services/logger.service';
import { UserRole } from '../../../domain/types/user.types';

/**
 * User Event Publisher Tests
 * Follows Maysar Testing Constitution - Section 5.2 (Realistic Mocks)
 */
describe('UserEventPublisher', () => {
  let publisher: UserEventPublisher;
  let mockOutboxRepository: any;

  beforeEach(() => {
    mockOutboxRepository = {
      save: jest.fn().mockResolvedValue(undefined)
    };
    publisher = new UserEventPublisher(mockOutboxRepository);

    // Realistic mocks for logger to avoid polluting test output
    jest.spyOn(logger, 'info').mockImplementation(() => { });
    jest.spyOn(logger, 'error').mockImplementation(() => { });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should publish a single event and sanitize sensitive fields', async () => {
    const event = new UserRegisteredEvent(
      'user-123',
      'test@example.com',
      UserRole.BUYER,
      'email',
      { password: 'secret-password', token: 'secret-token' }
    );

    await publisher.publish(event);

    expect(mockOutboxRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: expect.any(String),
        eventType: 'UserRegistered',
        eventData: expect.objectContaining({
          password: '[REDACTED]',
          token: '[REDACTED]'
        })
      }),
      undefined
    );
    expect(logger.info).toHaveBeenCalled();
  });

  it('should publish multiple events using publishMany', async () => {
    const events = [
      new UserRegisteredEvent('u1', 'a@b.com', UserRole.BUYER, 'email'),
      new UserProfileUpdatedEvent('u1', ['firstName'], {}, { firstName: 'New' }, 'u1')
    ];

    await publisher.publishMany(events);

    expect(mockOutboxRepository.save).toHaveBeenCalledTimes(2);
  });

  it('should handle repository errors gracefully', async () => {
    const event = new UserRegisteredEvent('u1', 'a@b.com', UserRole.BUYER, 'email');
    mockOutboxRepository.save.mockRejectedValue(new Error('DB failure'));

    await expect(publisher.publish(event)).rejects.toThrow('DB failure');
    expect(logger.error).toHaveBeenCalled();
  });

  it('should batch publish events using publishBatch', async () => {
    const events = [
      new UserEmailVerifiedEvent('u1', 'a@b.com', 'token')
    ];

    await publisher.publishBatch(events);

    expect(mockOutboxRepository.save).toHaveBeenCalled();
  });
});
