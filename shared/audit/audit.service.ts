import { PrismaClient } from '@prisma/client';
import { createLogger } from '../logger/logger';
import { createPrismaClient } from '@shared/database/prisma-client';

export interface EventBusAuditRecord {
    eventType: string;
    eventId: string;
    correlationId?: string;
    sagaId?: string;
    timestamp: string;
    dataSummary: string;
}

export class AuditService {
    private static instance: AuditService;
    private prisma: PrismaClient;
    private logger = createLogger('AuditService', 'audit-service');

    private constructor() {
        this.prisma = createPrismaClient();
    }

    static getInstance(): AuditService {
        if (!AuditService.instance) {
            AuditService.instance = new AuditService();
        }
        return AuditService.instance;
    }

    async saveEventBusAudit(record: EventBusAuditRecord): Promise<void> {
        try {
            await this.prisma.eventLog.create({
                data: {
                    eventId: record.eventId,
                    consumerName: 'event-bus-audit',
                    processedAt: new Date(record.timestamp)
                }
            });
        } catch (error) {
            // Silent fail - audit should never block event flow
            this.logger.error('Failed to persist audit record', error, { eventId: record.eventId });
        }
    }
}
