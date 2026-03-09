import type {
  BulkNotificationDto,
  CreateNotificationDto,
  NotificationListResponseDto,
  NotificationResponseDto,
  NotificationSearchDto,
  NotificationSummaryDto,
  UpdateNotificationDto
} from './notification.dto';

describe('notification DTO contracts', () => {
  it('supports create/update/search notification payloads', () => {
    const createDto: CreateNotificationDto = {
      userId: 'user-1',
      type: 'email',
      channel: 'email',
      subject: 'Order confirmed',
      content: 'Your order has been confirmed',
      priority: 'high',
      metadata: { orderId: 'order-1' }
    };
    const updateDto: UpdateNotificationDto = {
      status: 'sent',
      metadata: { retry: false }
    };
    const searchDto: NotificationSearchDto = {
      userId: 'user-1',
      status: 'sent',
      page: 1,
      limit: 20,
      sortOrder: 'desc'
    };

    expect(createDto.priority).toBe('high');
    expect(updateDto.status).toBe('sent');
    expect(searchDto.limit).toBe(20);
  });

  it('supports notification response/list payloads', () => {
    const response: NotificationResponseDto = {
      id: 'notif-1',
      userId: 'user-1',
      type: 'email',
      channel: 'email',
      status: 'delivered',
      priority: 'medium',
      subject: 'Order confirmed',
      content: 'Your order has been confirmed',
      metadata: { orderId: 'order-1' },
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date('2026-03-08T00:00:00.000Z'),
      updatedAt: new Date('2026-03-08T00:00:00.000Z')
    };
    const summary: NotificationSummaryDto = {
      id: 'notif-1',
      userId: 'user-1',
      type: 'email',
      channel: 'email',
      status: 'delivered',
      subject: 'Order confirmed',
      createdAt: new Date('2026-03-08T00:00:00.000Z')
    };
    const bulk: BulkNotificationDto = {
      notifications: [
        {
          userId: 'user-1',
          type: 'email',
          channel: 'email',
          subject: 'A',
          content: 'B'
        }
      ]
    };
    const list: NotificationListResponseDto = {
      items: [response, summary],
      total: 2,
      page: 1,
      limit: 20,
      hasMore: false
    };

    expect(bulk.notifications).toHaveLength(1);
    expect(list.total).toBe(2);
    expect((list.items[0] as NotificationResponseDto).maxRetries).toBe(3);
  });
});
