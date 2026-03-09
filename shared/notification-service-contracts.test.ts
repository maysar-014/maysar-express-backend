import type { NotificationService } from '../shared-contracts/notification-service-contracts';

describe('notification-service contracts', () => {
  it('supports send command and notification result events', () => {
    const command: NotificationService.Commands.SendNotification = {
      recipient: 'user@example.com',
      channel: 'email',
      templateId: 'order-confirmed',
      data: { orderId: 'order-1' }
    };
    const sent: NotificationService.Events.NotificationSent = {
      notificationId: 'notif-1',
      recipient: 'user@example.com',
      channel: 'email',
      sentAt: new Date('2026-03-09T00:00:00.000Z')
    };
    const failed: NotificationService.Events.NotificationFailed = {
      notificationId: 'notif-2',
      recipient: '+255700000000',
      reason: 'provider timeout',
      failedAt: new Date('2026-03-09T00:00:00.000Z')
    };

    expect(command.channel).toBe('email');
    expect(sent.notificationId).toBe('notif-1');
    expect(failed.reason).toContain('timeout');
  });
});
