import { notificationClient as mockNotificationClient } from '../../application/sagas/service-clients';
import { emailService, notificationClient } from './service-instances';

describe('service instances', () => {
  it('exports singleton infrastructure clients', async () => {
    expect(emailService).toBeDefined();
    expect(notificationClient).toBe(mockNotificationClient);

    await expect(
      notificationClient.sendEmail('user-1', 'welcome', { name: 'Amina' })
    ).resolves.toBeUndefined();
  });
});
