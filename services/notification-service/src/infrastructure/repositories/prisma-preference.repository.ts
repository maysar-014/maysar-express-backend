import { NotificationPreference } from '../../domain/entities/notification-preference.entity';
import { INotificationPreferenceRepository } from '../../domain/repositories';
import { prisma } from '../database/prisma-client';

interface NotificationPreferenceDelegate {
  findUnique(args: Record<string, unknown>): Promise<any | null>;
  findMany(args: Record<string, unknown>): Promise<any[]>;
  create(args: Record<string, unknown>): Promise<any>;
  update(args: Record<string, unknown>): Promise<any>;
  delete(args: Record<string, unknown>): Promise<unknown>;
}

function toDomain(row: any): NotificationPreference {
  const categories = (row.categories as Record<string, boolean>) ?? {
    marketing: true,
    transactional: true,
    system: true
  };
  const quietHours = row.quietHours as { start: string; end: string; timezone?: string } | undefined;
  return new NotificationPreference({
    id: row.id,
    userId: row.userId,
    channel: row.channel,
    enabled: row.enabled,
    categories,
    quietHours,
    frequency: row.frequency ?? undefined,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt)
  });
}

export class PrismaPreferenceRepository implements INotificationPreferenceRepository {
  async findById(id: string): Promise<NotificationPreference | null> {
    const row = await this.preferenceDelegate.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async findByUserId(userId: string): Promise<NotificationPreference[]> {
    const rows = await this.preferenceDelegate.findMany({
      where: { userId }
    });
    return rows.map(toDomain);
  }

  async findByUserAndChannel(userId: string, channel: string): Promise<NotificationPreference | null> {
    const row = await this.preferenceDelegate.findUnique({
      where: { userId_channel: { userId, channel } }
    });
    return row ? toDomain(row) : null;
  }

  async create(preference: NotificationPreference): Promise<NotificationPreference> {
    const row = await this.preferenceDelegate.create({
      data: {
        id: preference.id,
        userId: preference.userId,
        channel: preference.channel,
        enabled: preference.enabled,
        categories: preference.categories,
        quietHours: preference.quietHours ?? undefined,
        frequency: preference.frequency
      }
    });
    return toDomain(row);
  }

  async update(preference: NotificationPreference): Promise<NotificationPreference> {
    const row = await this.preferenceDelegate.update({
      where: { id: preference.id },
      data: {
        enabled: preference.enabled,
        categories: preference.categories,
        quietHours: preference.quietHours ?? undefined,
        frequency: preference.frequency,
        updatedAt: new Date()
      }
    });
    return toDomain(row);
  }

  async delete(id: string): Promise<void> {
    await this.preferenceDelegate.delete({ where: { id } });
  }

  private get preferenceDelegate(): NotificationPreferenceDelegate {
    const client = prisma as unknown as Record<string, unknown>;
    const delegate = (client.notificationPreference ??
      client.notification_Preference ??
      client.preference) as NotificationPreferenceDelegate | undefined;

    if (!delegate) {
      throw new Error('Notification preference delegate is not configured on prisma client');
    }

    return delegate;
  }
}
