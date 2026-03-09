jest.mock('@prisma/client', () => ({
  Notification_NotificationType: {
    email: 'email',
    sms: 'sms',
    push: 'push',
    in_app: 'in_app',
    webhook: 'webhook'
  },
  Notification_NotificationStatus: {
    pending: 'pending',
    sent: 'sent',
    delivered: 'delivered',
    failed: 'failed',
    cancelled: 'cancelled'
  },
  Notification_NotificationPriority: {
    low: 'low',
    high: 'high'
  }
}));

import {
  NotificationPriorityMapper,
  NotificationStatusMapper,
  NotificationTypeMapper
} from './notification-type.mapper';

describe('notification-type mapper', () => {
  it('maps notification types between domain and prisma enums', () => {
    expect(NotificationTypeMapper.toPrisma('in-app')).toBe('in_app');
    expect(NotificationTypeMapper.toDomain('in_app' as never)).toBe('in-app');
    expect(NotificationTypeMapper.toDomain('webhook' as never)).toBe('push');
  });

  it('maps notification status with fallbacks', () => {
    expect(NotificationStatusMapper.toPrisma('read')).toBe('delivered');
    expect(NotificationStatusMapper.toDomain('cancelled' as never)).toBe('failed');
    expect(NotificationStatusMapper.toDomain('unknown' as never)).toBe('pending');
  });

  it('maps notification priority with fallbacks', () => {
    expect(NotificationPriorityMapper.toPrisma('medium')).toBe('low');
    expect(NotificationPriorityMapper.toDomain('high' as never)).toBe('high');
    expect(NotificationPriorityMapper.toDomain('other' as never)).toBe('low');
  });
});
