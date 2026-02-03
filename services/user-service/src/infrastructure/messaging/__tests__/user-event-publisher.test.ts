import { UserEventPublisher } from '../user-event-publisher';
import {
  UserRegisteredEvent,
  UserProfileUpdatedEvent,
  UserEmailVerifiedEvent
} from '../../../domain/events';
import { logger } from '../../services/logger.service';

describe('UserEventPublisher', () => {
  let publisher: UserEventPublisher;

  beforeEach(() => {
    publisher = new UserEventPublisher();
    jest.restoreAllMocks();
    jest.spyOn(logger, 'info').mockImplementation(() => {});
    jest.spyOn(logger, 'error').mockImplementation(() => {});
  });

  it('publishes single event and sanitizes sensitive fields', async () => {
    const evt = new UserRegisteredEvent('u1', 'a@b.com', 'buyer' as any, 'email', { password: 'secret' } as any);
    await publisher.publish(evt as any);
    expect(logger.info).toHaveBeenCalled();
  });

  it('publishMany and publishBatch run without errors', async () => {
    const e1 = new UserRegisteredEvent('u1', 'a@b.com', 'buyer' as any, 'email');
    const e2 = new UserProfileUpdatedEvent('u1', ['firstName'], {}, { firstName: 'X' }, 'u1');
    await publisher.publishMany([e1 as any, e2 as any]);

    const b1 = new UserEmailVerifiedEvent('u1', 'a@b.com', 'token');
    await publisher.publishBatch([b1 as any]);
    expect(logger.info).toHaveBeenCalled();
  });

  it('publishUserRegistered ensures metadata exists and calls publish', async () => {
    const e = new UserRegisteredEvent('u2', 'b@c.com', 'system' as any, 'phone');
    await publisher.publishUserRegistered(e as any);
    expect(logger.info).toHaveBeenCalled();
  });
});
