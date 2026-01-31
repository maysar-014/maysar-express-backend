import { Notification } from '../../domain/entities/notification.entity';
import { NotificationContent } from '../../domain/value-objects/notification-content.value-object';
import { DeliveryAddress } from '../../domain/value-objects/delivery-address.value-object';
import { NotificationMetadata } from '../../domain/value-objects/notification-metadata.value-object';
import { INotificationRepository, NotificationSearchCriteria } from '../../domain/repositories';
import { prisma } from '../database/prisma-client';
import { logger } from '../services/logger.service';

function toDomain(row: any): Notification {
  const content = NotificationContent.create(
    row.content,
    row.contentHtml ?? undefined
  );
  const metadata = NotificationMetadata.create((row.metadata as Record<string, string | number | boolean>) ?? {});
  const deliveryAddress =
    row.deliveryAddress && row.deliveryAddressType
      ? DeliveryAddress.create(row.deliveryAddress, row.deliveryAddressType)
      : undefined;
  return new Notification({
    id: row.id,
    userId: row.userId,
    type: row.type,
    channel: row.channel,
    status: row.status,
    priority: row.priority,
    subject: row.subject,
    content,
    metadata,
    scheduledAt: row.scheduledAt ? new Date(row.scheduledAt) : undefined,
    sentAt: row.sentAt ? new Date(row.sentAt) : undefined,
    deliveredAt: row.deliveredAt ? new Date(row.deliveredAt) : undefined,
    readAt: row.readAt ? new Date(row.readAt) : undefined,
    retryCount: row.retryCount ?? 0,
    maxRetries: row.maxRetries ?? 3,
    lastError: row.lastError ?? undefined,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
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
      type: notification.type,
      channel: notification.channel,
      status: notification.status,
      priority: notification.priority,
      subject: notification.subject,
      content: notification.content.getValue(),
      contentHtml: notification.content.getHtml(),
      metadata: notification.metadata.toObject(),
      scheduledAt: notification.scheduledAt,
      sentAt: notification.sentAt,
      deliveredAt: notification.deliveredAt,
      readAt: notification.readAt,
      retryCount: notification.retryCount,
      maxRetries: notification.maxRetries,
      lastError: notification.lastError,
      deliveryAddress: notification.deliveryAddress?.getValue(),
      deliveryAddressType: notification.deliveryAddress?.getType()
    };
    const row = await prisma.notification.create({ data: payload });
    return toDomain(row);
  }

  async update(notification: Notification): Promise<Notification> {
    const payload = {
      status: notification.status,
      subject: notification.subject,
      content: notification.content.getValue(),
      contentHtml: notification.content.getHtml(),
      metadata: notification.metadata.toObject(),
      scheduledAt: notification.scheduledAt,
      sentAt: notification.sentAt,
      deliveredAt: notification.deliveredAt,
      readAt: notification.readAt,
      retryCount: notification.retryCount,
      maxRetries: notification.maxRetries,
      lastError: notification.lastError,
      updatedAt: new Date()
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

  async findByStatus(status: string, limit = 100, offset = 0): Promise<Notification[]> {
    const rows = await prisma.notification.findMany({
      where: { status },
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
    const where: any = {};
    if (criteria.userId) where.userId = criteria.userId;
    if (criteria.status) where.status = criteria.status;
    if (criteria.channel) where.channel = criteria.channel;
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
      data: { status: 'sent', sentAt, updatedAt: new Date() }
    });
  }

  async markAsDelivered(id: string, deliveredAt: Date): Promise<void> {
    await prisma.notification.update({
      where: { id },
      data: { status: 'delivered', deliveredAt, updatedAt: new Date() }
    });
  }

  async markAsRead(id: string, readAt: Date): Promise<void> {
    await prisma.notification.update({
      where: { id },
      data: { status: 'read', readAt, updatedAt: new Date() }
    });
  }

  async recordFailure(id: string, error: string): Promise<void> {
    const n = await this.findById(id);
    if (!n) return;
    const failed = n.markAsFailed(error);
    await this.update(failed);
  }

  async getSentCountLastHour(userId: string, channel: string): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const count = await prisma.notification.count({
      where: {
        userId,
        channel,
        status: 'sent',
        sentAt: { gte: oneHourAgo }
      }
    });
    return count;
  }
}
