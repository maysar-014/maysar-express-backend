import { UserEventPublisher } from '../user-event-publisher';
import { logger } from '../../services/logger.service';
import { UserRegisteredEvent, UserProfileUpdatedEvent } from '../../../domain/events';
import { UserRole } from '../../../domain/types/user.types';

jest.mock('../../services/logger.service');

describe('UserEventPublisher', () => {
  let publisher: UserEventPublisher;

  beforeEach(() => {
    jest.clearAllMocks();
    publisher = new UserEventPublisher();
  });

  describe('publish', () => {
    it('publishes a single event successfully', async () => {
      const event = new UserRegisteredEvent('user-123', 'test@example.com', UserRole.BUYER, 'email');

      await publisher.publish(event);

      expect(logger.info).toHaveBeenCalledWith('Event published:', {
        eventId: event.eventId,
        eventType: event.eventType
      });
    });

    it('logs error when publish fails', async () => {
      const event = new UserRegisteredEvent('user-123', 'test@example.com', UserRole.BUYER, 'email');

      (logger.info as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Publish failed');
      });

      await expect(publisher.publish(event)).rejects.toThrow('Publish failed');
      expect(logger.error).toHaveBeenCalledWith('Failed to publish event:', {
        eventId: event.eventId,
        error: expect.any(Error)
      });
    });
  });

  describe('publishMany', () => {
    it('publishes multiple events successfully', async () => {
      const events = [
        new UserRegisteredEvent('user-1', 'user1@example.com', UserRole.BUYER, 'email'),
        new UserProfileUpdatedEvent('user-1', ['firstName'], {}, { firstName: 'John' }, 'user-1')
      ];

      await publisher.publishMany(events);

      expect(logger.info).toHaveBeenCalledWith('Events published:', { count: 2 });
    });

    it('logs error when publishMany fails', async () => {
      const events = [
        new UserRegisteredEvent('user-1', 'user1@example.com', UserRole.BUYER, 'email')
      ];

      (logger.info as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Publish failed');
      });

      await expect(publisher.publishMany(events)).rejects.toThrow('Publish failed');
      expect(logger.error).toHaveBeenCalledWith('Failed to publish events:', {
        error: expect.any(Error)
      });
    });

    it('publishes empty array successfully', async () => {
      await publisher.publishMany([]);

      expect(logger.info).toHaveBeenCalledWith('Events published:', { count: 0 });
    });
  });
});
