import { ISmsRepository } from '../../domain/repositories/sms.repository';
import { SmsMessage, SmsStatus } from '../../domain/entities/sms-message.entity';
import { PrismaClient, Sms_Message, Sms_Status } from '@prisma/client';
import { PhoneNumber } from '../../domain/value-objects/phone-number.value-object';
import { MessageContent } from '../../domain/value-objects/message-content.value-object';

/**
 * Prisma SMS Repository
 * Infrastructure implementation of ISmsRepository
 */
export class PrismaSmsRepository implements ISmsRepository {
    constructor(private readonly prisma: PrismaClient) { }

    async create(message: SmsMessage): Promise<SmsMessage> {
        const data = this.toPrismaModel(message);

        const created = await this.prisma.sms_Message.create({
            data
        });

        return this.toDomainEntity(created);
    }

    async findById(id: string): Promise<SmsMessage | null> {
        const message = await this.prisma.sms_Message.findUnique({
            where: { id }
        });

        return message ? this.toDomainEntity(message) : null;
    }

    async findByStatus(status: SmsStatus, limit: number = 100): Promise<SmsMessage[]> {
        const messages = await this.prisma.sms_Message.findMany({
            where: { status: this.toSmsStatus(status) },
            take: limit,
            orderBy: { createdAt: 'desc' }
        });

        return messages.map(msg => this.toDomainEntity(msg));
    }

    async findByUserId(userId: string, limit: number = 100): Promise<SmsMessage[]> {
        const messages = await this.prisma.sms_Message.findMany({
            where: { userId },
            take: limit,
            orderBy: { createdAt: 'desc' }
        });

        return messages.map(msg => this.toDomainEntity(msg));
    }

    async findByPhoneNumber(phoneNumber: string, limit: number = 100): Promise<SmsMessage[]> {
        const messages = await this.prisma.sms_Message.findMany({
            where: { phoneNumber },
            take: limit,
            orderBy: { createdAt: 'desc' }
        });

        return messages.map(msg => this.toDomainEntity(msg));
    }

    async findFailedMessagesForRetry(maxRetries: number): Promise<SmsMessage[]> {
        const messages = await this.prisma.sms_Message.findMany({
            where: {
                status: Sms_Status.FAILED,
                retryCount: { lt: maxRetries }
            },
            orderBy: { failedAt: 'asc' },
            take: 100
        });

        return messages.map(msg => this.toDomainEntity(msg));
    }

    async update(message: SmsMessage): Promise<SmsMessage> {
        const data = this.toPrismaModel(message);

        const updated = await this.prisma.sms_Message.update({
            where: { id: message.getId() },
            data
        });

        return this.toDomainEntity(updated);
    }

    async delete(id: string): Promise<void> {
        await this.prisma.sms_Message.delete({
            where: { id }
        });
    }

    async getMessageCountInWindow(
        startTime: Date,
        endTime: Date,
        filters?: {
            userId?: string;
            phoneNumber?: string;
            status?: SmsStatus[];
        }
    ): Promise<number> {
        const where: any = {
            createdAt: {
                gte: startTime,
                lte: endTime
            }
        };

        if (filters?.userId) {
            where.userId = filters.userId;
        }

        if (filters?.phoneNumber) {
            where.phoneNumber = filters.phoneNumber;
        }

        if (filters?.status && filters.status.length > 0) {
            where.status = {
                in: filters.status.map(s => this.toSmsStatus(s))
            };
        }

        return await this.prisma.sms_Message.count({ where });
    }

    async getMessagesToPhoneNumberInWindow(
        phoneNumber: string,
        startTime: Date,
        endTime: Date
    ): Promise<SmsMessage[]> {
        const messages = await this.prisma.sms_Message.findMany({
            where: {
                phoneNumber,
                createdAt: {
                    gte: startTime,
                    lte: endTime
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return messages.map(msg => this.toDomainEntity(msg));
    }

    async getMessagesByUserInWindow(
        userId: string,
        startTime: Date,
        endTime: Date
    ): Promise<SmsMessage[]> {
        const messages = await this.prisma.sms_Message.findMany({
            where: {
                userId,
                createdAt: {
                    gte: startTime,
                    lte: endTime
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return messages.map(msg => this.toDomainEntity(msg));
    }

    async findByProviderMessageId(
        providerId: string,
        providerMessageId: string
    ): Promise<SmsMessage | null> {
        const message = await this.prisma.sms_Message.findFirst({
            where: {
                providerId,
                providerMessageId
            }
        });

        return message ? this.toDomainEntity(message) : null;
    }

    async getStatistics(
        startTime: Date,
        endTime: Date
    ): Promise<{
        total: number;
        queued: number;
        sending: number;
        sent: number;
        delivered: number;
        failed: number;
        cancelled: number;
        undelivered: number;
    }> {
        const where = {
            createdAt: {
                gte: startTime,
                lte: endTime
            }
        };

        const [
            total,
            queued,
            sending,
            sent,
            delivered,
            failed,
            cancelled,
            undelivered
        ] = await Promise.all([
            this.prisma.sms_Message.count({ where }),
            this.prisma.sms_Message.count({ where: { ...where, status: Sms_Status.QUEUED } }),
            this.prisma.sms_Message.count({ where: { ...where, status: Sms_Status.SENDING } }),
            this.prisma.sms_Message.count({ where: { ...where, status: Sms_Status.SENT } }),
            this.prisma.sms_Message.count({ where: { ...where, status: Sms_Status.DELIVERED } }),
            this.prisma.sms_Message.count({ where: { ...where, status: Sms_Status.FAILED } }),
            this.prisma.sms_Message.count({ where: { ...where, status: Sms_Status.CANCELLED } }),
            this.prisma.sms_Message.count({ where: { ...where, status: Sms_Status.UNDELIVERED } })
        ]);

        return {
            total,
            queued,
            sending,
            sent,
            delivered,
            failed,
            cancelled,
            undelivered
        };
    }

    async deleteOlderThan(date: Date): Promise<number> {
        const result = await this.prisma.sms_Message.deleteMany({
            where: {
                createdAt: {
                    lt: date
                },
                status: {
                    in: [Sms_Status.DELIVERED, Sms_Status.UNDELIVERED, Sms_Status.CANCELLED]
                }
            }
        });

        return result.count;
    }

    // ==================== Mapping Methods ====================

    private toPrismaModel(message: SmsMessage): any {
        return {
            id: message.getId(),
            phoneNumber: message.getPhoneNumber().getValue(),
            content: message.getContent().getValue(),
            status: this.toSmsStatus(message.getStatus()),
            providerId: message.getProviderId() || null,
            providerMessageId: message.getProviderMessageId() || null,
            userId: message.getUserId() || null,
            retryCount: message.getRetryCount(),
            maxRetries: message.getMaxRetries(),
            scheduledAt: message.getScheduledAt() || null,
            sentAt: message.getSentAt() || null,
            deliveredAt: message.getDeliveredAt() || null,
            failedAt: message.getFailedAt() || null,
            lastError: message.getLastError() || null,
            metadata: message.getMetadata() || null,
            createdAt: message.getCreatedAt(),
            updatedAt: message.getUpdatedAt()
        };
    }

    private toDomainEntity(prismaModel: Sms_Message): SmsMessage {
        return SmsMessage.reconstitute({
            id: prismaModel.id,
            phoneNumber: prismaModel.phoneNumber,
            content: prismaModel.content,
            status: this.toDomainStatus(prismaModel.status),
            providerId: prismaModel.providerId || undefined,
            providerMessageId: prismaModel.providerMessageId || undefined,
            userId: prismaModel.userId || undefined,
            retryCount: prismaModel.retryCount,
            maxRetries: prismaModel.maxRetries,
            scheduledAt: prismaModel.scheduledAt || undefined,
            sentAt: prismaModel.sentAt || undefined,
            deliveredAt: prismaModel.deliveredAt || undefined,
            failedAt: prismaModel.failedAt || undefined,
            lastError: prismaModel.lastError || undefined,
            metadata: (prismaModel.metadata as Record<string, any>) || undefined,
            createdAt: prismaModel.createdAt,
            updatedAt: prismaModel.updatedAt
        });
    }

    private toSmsStatus(status: SmsStatus): Sms_Status {
        return status as unknown as Sms_Status;
    }

    private toDomainStatus(status: Sms_Status): SmsStatus {
        return status as unknown as SmsStatus;
    }
}
