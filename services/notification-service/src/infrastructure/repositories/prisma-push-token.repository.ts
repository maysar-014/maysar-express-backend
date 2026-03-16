import { IPushTokenRepository, PushTokenRecord } from '../../domain/repositories';
import { prisma } from '../database/prisma-client';

interface PushTokenDelegate {
  findMany(args: Record<string, unknown>): Promise<any[]>;
  upsert(args: Record<string, unknown>): Promise<any>;
  updateMany(args: Record<string, unknown>): Promise<{ count: number }>;
}

function toRecord(row: any): PushTokenRecord {
  return {
    id: row.id,
    userId: row.userId,
    token: row.token,
    platform: row.platform ?? null,
    deviceId: row.deviceId ?? null,
    isActive: row.isActive,
    lastSeenAt: row.lastSeenAt ? new Date(row.lastSeenAt) : null,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt)
  };
}

export class PrismaPushTokenRepository implements IPushTokenRepository {
  async upsertToken(params: {
    userId: string;
    token: string;
    platform?: string;
    deviceId?: string;
  }): Promise<PushTokenRecord> {
    const now = new Date();
    const row = await this.delegate.upsert({
      where: { token: params.token },
      update: {
        userId: params.userId,
        platform: params.platform ?? null,
        deviceId: params.deviceId ?? null,
        isActive: true,
        lastSeenAt: now
      },
      create: {
        userId: params.userId,
        token: params.token,
        platform: params.platform ?? null,
        deviceId: params.deviceId ?? null,
        isActive: true,
        lastSeenAt: now
      }
    });
    return toRecord(row);
  }

  async listActiveTokensByUserId(userId: string): Promise<PushTokenRecord[]> {
    const rows = await this.delegate.findMany({
      where: { userId, isActive: true },
      orderBy: { updatedAt: 'desc' }
    });
    return rows.map(toRecord);
  }

  async deactivateToken(userId: string, token: string): Promise<boolean> {
    const result = await this.delegate.updateMany({
      where: { userId, token, isActive: true },
      data: { isActive: false, updatedAt: new Date() }
    });
    return result.count > 0;
  }

  private get delegate(): PushTokenDelegate {
    const client = prisma as unknown as Record<string, unknown>;
    const delegate = (client.notification_DeviceToken ??
      client.notificationDeviceToken ??
      client.deviceToken) as PushTokenDelegate | undefined;

    if (!delegate) {
      throw new Error('Notification device token delegate is not configured on prisma client');
    }

    return delegate;
  }
}
