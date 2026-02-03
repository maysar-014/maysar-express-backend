import { executeProfileUpdateSaga } from '../profile-update.saga';
import { UserProfileUpdatedEvent } from '../../../domain/events';
import { notificationClient, auditClient } from '../service-clients';

jest.mock('../service-clients');
jest.mock('../../../infrastructure/services/logger.service');

describe('Profile Update Saga', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (auditClient.recordEvent as jest.Mock).mockResolvedValue(undefined);
    (notificationClient.sendEmail as jest.Mock).mockResolvedValue(undefined);
  });

  test('executes all steps for name change', async () => {
    const event = new UserProfileUpdatedEvent(
      'user-1',
      ['name'],
      { name: 'Old Name' },
      { name: 'New Name' },
      'user-1'
    );

    await executeProfileUpdateSaga(event);

    expect(auditClient.recordEvent).toHaveBeenCalledWith('user-1', 'profile_updated', expect.any(Object));
    expect(notificationClient.sendEmail).toHaveBeenCalledWith('user-1', 'profile_updated', expect.any(Object));
  });

  test('executes all steps for email change', async () => {
    const event = new UserProfileUpdatedEvent(
      'user-2',
      ['email'],
      { email: 'old@example.com' },
      { email: 'new@example.com' },
      'user-2'
    );

    await executeProfileUpdateSaga(event);

    expect(auditClient.recordEvent).toHaveBeenCalledWith('user-2', 'profile_updated', expect.any(Object));
  });

  test('syncs preferences when preferences change', async () => {
    const event = new UserProfileUpdatedEvent(
      'user-3',
      ['preferences'],
      { preferences: { theme: 'dark' } },
      { preferences: { theme: 'light' } },
      'user-3'
    );

    await executeProfileUpdateSaga(event);

    expect(auditClient.recordEvent).toHaveBeenCalled();
  });

  test('handles multiple changes', async () => {
    const event = new UserProfileUpdatedEvent(
      'user-4',
      ['name', 'email', 'preferences'],
      { name: 'Old', email: 'old@test.com' },
      { name: 'New', email: 'new@test.com' },
      'admin-1'
    );

    await executeProfileUpdateSaga(event);

    expect(auditClient.recordEvent).toHaveBeenCalledWith('user-4', 'profile_updated', expect.objectContaining({
      changes: ['name', 'email', 'preferences'],
      updatedBy: 'admin-1'
    }));
  });

  test('handles audit recording failure', async () => {
    const event = new UserProfileUpdatedEvent(
      'user-5',
      ['name'],
      {},
      {},
      'user-5'
    );

    (auditClient.recordEvent as jest.Mock).mockRejectedValueOnce(new Error('Audit error'));

    await expect(executeProfileUpdateSaga(event)).rejects.toThrow('Audit error');
  });

  test('handles email notification failure', async () => {
    const event = new UserProfileUpdatedEvent(
      'user-6',
      ['email'],
      {},
      {},
      'user-6'
    );

    (notificationClient.sendEmail as jest.Mock).mockRejectedValueOnce(new Error('Email error'));

    await expect(executeProfileUpdateSaga(event)).rejects.toThrow('Email error');
  });
});
