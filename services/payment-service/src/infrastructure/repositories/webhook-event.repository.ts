import { Prisma, PrismaClient } from '@prisma/client';

export interface WebhookEventInput {
  provider: string;
  eventType: string;
  eventId: string;
  payload: Record<string, unknown>;
}

export class WebhookEventRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async recordReceived(input: WebhookEventInput): Promise<{ id: string }> {
    const payload = this.toJsonSafe(input.payload);
    const record = await this.prisma.payment_WebhookEvent.upsert({
      where: {
        provider_eventId: {
          provider: input.provider,
          eventId: input.eventId
        }
      },
      update: {
        eventType: input.eventType,
        payload,
        processed: false,
        processedAt: null,
        errorMessage: null,
        retryCount: { increment: 1 }
      },
      create: {
        provider: input.provider,
        eventType: input.eventType,
        eventId: input.eventId,
        payload,
        processed: false
      }
    });

    return { id: record.id };
  }

  async markProcessed(id: string): Promise<void> {
    await this.prisma.payment_WebhookEvent.update({
      where: { id },
      data: {
        processed: true,
        processedAt: new Date(),
        errorMessage: null
      }
    });
  }

  async markFailed(id: string, message: string): Promise<void> {
    await this.prisma.payment_WebhookEvent.update({
      where: { id },
      data: {
        processed: false,
        errorMessage: message,
        retryCount: { increment: 1 }
      }
    });
  }

  private toJsonSafe(value: unknown): Prisma.InputJsonValue {
    if (value instanceof Date) {
      return value.toISOString();
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.toJsonSafe(item));
    }

    if (value && typeof value === 'object') {
      const result: Record<string, Prisma.InputJsonValue> = {};
      for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
        result[key] = this.toJsonSafe(item);
      }
      return result;
    }

    return value as Prisma.InputJsonValue;
  }
}
