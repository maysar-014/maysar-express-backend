import { mapNotificationStatus, mapNotificationType, mapProviderStatus } from './enum-mappers';

describe('enum mappers', () => {
  it('maps notification status values to Prisma enum casing', () => {
    expect(mapNotificationStatus('pending')).toBe('PENDING');
    expect(mapNotificationStatus('sent')).toBe('SENT');
    expect(mapNotificationStatus('delivered')).toBe('DELIVERED');
    expect(mapNotificationStatus('failed')).toBe('FAILED');
    expect(mapNotificationStatus('read')).toBe('READ');
  });

  it('passes through unknown notification status values unchanged', () => {
    expect(mapNotificationStatus('CUSTOM_STATUS')).toBe('CUSTOM_STATUS');
  });

  it('maps notification type values including in-app alias', () => {
    expect(mapNotificationType('in-app')).toBe('in_app');
    expect(mapNotificationType('email')).toBe('email');
    expect(mapNotificationType('sms')).toBe('sms');
    expect(mapNotificationType('push')).toBe('push');
  });

  it('maps provider delivery status and leaves unknown values unchanged', () => {
    expect(mapProviderStatus('sent')).toBe('SENT');
    expect(mapProviderStatus('delivered')).toBe('DELIVERED');
    expect(mapProviderStatus('failed')).toBe('FAILED');
    expect(mapProviderStatus('queued')).toBe('queued');
  });
});
