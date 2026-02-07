import { PrismaClient } from '@prisma/client';
import { injectable, inject } from 'inversify';
import { TYPES } from '../../types';
import { ITicketStatusHistoryRepository } from '../../domain/repositories/interfaces';
import { TicketStatusHistory } from '../../domain/types';
import { logger } from '../services/logger.service';

@injectable()
export class PrismaTicketStatusHistoryRepository implements ITicketStatusHistoryRepository {
    constructor(
        @inject(TYPES.PrismaClient) private prisma: PrismaClient
    ) { }

    public async create(history: TicketStatusHistory, ticketId: string): Promise<TicketStatusHistory> {
        try {
            const data = await this.prisma.support_TicketStatusHistory.create({
                data: {
                    id: history.id,
                    ticketId: ticketId,
                    fromStatus: history.fromStatus,
                    toStatus: history.toStatus,
                    changedBy: history.changedBy,
                    reason: history.reason,
                    createdAt: history.createdAt
                }
            });
            return {
                id: data.id,
                fromStatus: data.fromStatus as any,
                toStatus: data.toStatus as any,
                changedBy: data.changedBy,
                reason: data.reason || undefined,
                createdAt: data.createdAt
            };
        } catch (error) {
            logger.error(`Error creating ticket status history: ${history.id}`, { error });
            throw error;
        }
    }

    public async findByTicketId(ticketId: string): Promise<TicketStatusHistory[]> {
        try {
            const data = await this.prisma.support_TicketStatusHistory.findMany({
                where: { ticketId },
                orderBy: { createdAt: 'desc' }
            });
            return data.map(d => ({
                id: d.id,
                fromStatus: d.fromStatus as any,
                toStatus: d.toStatus as any,
                changedBy: d.changedBy,
                reason: d.reason || undefined,
                createdAt: d.createdAt
            }));
        } catch (error) {
            logger.error(`Error finding status history for ticket: ${ticketId}`, { error });
            throw error;
        }
    }
}
