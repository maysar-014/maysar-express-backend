import { Notification, NotificationType, NotificationStatus, NotificationPriority } from '../../domain/entities/notification.entity';
import { NotificationContent } from '../../domain/value-objects/notification-content.value-object';
import { NotificationMetadata } from '../../domain/value-objects/notification-metadata.value-object';
import { INotificationRepository, NotificationSearchCriteria } from '../../domain/repositories';
import { prisma } from '../database/prisma-client';
import { Prisma, Notification as PrismaNotification } from '@prisma/client';
import { NotificationTypeMapper, NotificationStatusMapper, NotificationPriorityMapper } from '../mappers/notification-type.mapper';

function toDomain(row: PrismaNotification): Notification {
  const content = NotificationContent.create(
    row.content ?? '',
    undefined
  );
  const metadata = NotificationMetadata.create((row.metadata as Record<string, string | number | boolean>) ?? {});
  const deliveryAddress = undefined;
  return new Notification({
    id: row.id,
    userId: row.userId,
    type: row.type as NotificationType,
    channel: row.type as NotificationType,
    status: row.status as NotificationStatus,
    priority: row.priority as NotificationPriority,
    subject: row.subject ?? '',
    content,
    metadata,
    scheduledAt: row.scheduledAt ? new Date(row.scheduledAt) : undefined,
    sentAt: row.sentAt ? new Date(row.sentAt) : undefined,
    deliveredAt: row.deliveredAt ? new Date(row.deliveredAt) : undefined,
    readAt: undefined,
    retryCount: row.retryCount ?? 0,
    maxRetries: row.maxRetries ?? 3,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.createdAt),
    deliveryAddress
  });
}

export class PrismaNotificationRepository implements INotificationRepository {
  async findById(id: string): Promise<Notification | null> {
    const row = await prisma.notification.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async create(notification: Notification): Promise<Notification> {
    const payload = {
      id: notification.id,
      userId: notification.userId,
      type: NotificationTypeMapper.toPrisma(notification.type),
      status: NotificationStatusMapper.toPrisma(notification.status),
      priority: NotificationPriorityMapper.toPrisma(notification.priority),
      subject: notification.subject,
      content: notification.content.getValue(),
      metadata: notification.metadata.toObject(),
      scheduledAt: notification.scheduledAt,
      sentAt: notification.sentAt,
      deliveredAt: notification.deliveredAt,
      retryCount: notification.retryCount,
      maxRetries: notification.maxRetries
    };
    const row = await prisma.notification.create({ data: payload });
    return toDomain(row);
  }

  async update(notification: Notification): Promise<Notification> {
    const payload = {
      status: NotificationStatusMapper.toPrisma(notification.status),
      subject: notification.subject,
      content: notification.content.getValue(),
      metadata: notification.metadata.toObject(),
      scheduledAt: notification.scheduledAt,
      sentAt: notification.sentAt,
      deliveredAt: notification.deliveredAt,
      retryCount: notification.retryCount,
      maxRetries: notification.maxRetries
    };
    const row = await prisma.notification.update({
      where: { id: notification.id },
      data: payload
    });
    return toDomain(row);
  }

  async delete(id: string): Promise<void> {
    await prisma.notification.delete({ where: { id } });
  }

  async findByUserId(userId: string, limit = 50, offset = 0): Promise<Notification[]> {
    const rows = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });
    return rows.map(toDomain);
  }

  async findByStatus(status: NotificationStatus, limit = 100, offset = 0): Promise<Notification[]> {
    const rows = await prisma.notification.findMany({
      where: { status: NotificationStatusMapper.toPrisma(status) },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });
    return rows.map(toDomain);
  }

  async findPending(limit = 100): Promise<Notification[]> {
    return this.findByStatus('pending', limit, 0);
  }

  async search(criteria: NotificationSearchCriteria): Promise<Notification[]> {
    const where: Prisma.NotificationWhereInput = {};
    if (criteria.userId) where.userId = criteria.userId;
    if (criteria.status) where.status = NotificationStatusMapper.toPrisma(criteria.status as NotificationStatus);
    if (criteria.from || criteria.to) {
      where.createdAt = {};
      if (criteria.from) where.createdAt.gte = criteria.from;
      if (criteria.to) where.createdAt.lte = criteria.to;
    }
    const rows = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: criteria.limit ?? 20,
      skip: criteria.offset ?? 0
    });
    return rows.map(toDomain);
  }

  async markAsSent(id: string, sentAt: Date): Promise<void> {
    await prisma.notification.update({
      where: { id },
      data: { status: 'sent', sentAt }
    });
  }

  async markAsDelivered(id: string, deliveredAt: Date): Promise<void> {
    await prisma.notification.update({
      where: { id },
      data: { status: 'delivered', deliveredAt }
    });
  }

  async markAsRead(id: string, _readAt: Date): Promise<void> {
    await prisma.notification.update({
      where: { id },
      data: { status: NotificationStatusMapper.toPrisma('read') }
    });
  }

  async markAllAsReadByUserId(userId: string, _readAt: Date): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        status: {
          not: NotificationStatusMapper.toPrisma('read')
        }
      },
      data: {
        status: NotificationStatusMapper.toPrisma('read')
      }
    });

    return result.count;
  }

  async countUnreadByUserId(userId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        userId,
        status: {
          not: NotificationStatusMapper.toPrisma('read')
        }
      }
    });
  }

  async recordFailure(id: string, error: string): Promise<void> {
    const n = await this.findById(id);
    if (!n) return;
    const failed = n.markAsFailed(error);
    await this.update(failed);
  }

  async getSentCountLastHour(userId: string, _channel: string): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const count = await prisma.notification.count({
      where: {
        userId,
        status: 'sent',
        sentAt: { gte: oneHourAgo }
      }
    });
    return count;
  }
}
