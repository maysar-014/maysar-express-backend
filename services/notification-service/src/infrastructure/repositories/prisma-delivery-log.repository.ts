import { Prisma, Notification_DeliveryStatus } from '@prisma/client';
import { prisma } from '../database/prisma-client';

export interface DeliveryLogEntry {
  notificationId: string;
  provider: string;
  status: Notification_DeliveryStatus;
  providerMessageId?: string | null;
  statusCode?: string | null;
  responseBody?: string | null;
  errorMessage?: string | null;
  deliveryCost?: number | null;
  userAgent?: string | null;
  ipAddress?: string | null;
}

export class PrismaDeliveryLogRepository {
  async create(entry: DeliveryLogEntry): Promise<void> {
    await prisma.notification_DeliveryLog.create({
      data: {
        notificationId: entry.notificationId,
        provider: entry.provider,
        providerMessageId: entry.providerMessageId ?? null,
        status: entry.status,
        statusCode: entry.statusCode ?? null,
        responseBody: entry.responseBody ?? null,
        errorMessage: entry.errorMessage ?? null,
        deliveryCost: entry.deliveryCost !== undefined && entry.deliveryCost !== null
          ? new Prisma.Decimal(entry.deliveryCost)
          : null,
        userAgent: entry.userAgent ?? null,
        ipAddress: entry.ipAddress ?? null
      }
    });
  }
}
