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
            const delegate = this.getDelegate();
            if (!delegate) {
                return history;
            }

            const data = await delegate.create({
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
            if (process.env.NODE_ENV !== 'production') {
                return history;
            }
            logger.error(`Error creating ticket status history: ${history.id}`, { error });
            throw error;
        }
    }

    public async findByTicketId(ticketId: string): Promise<TicketStatusHistory[]> {
        try {
            const delegate = this.getDelegate();
            if (!delegate) {
                return [];
            }

            const data = await delegate.findMany({
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

    private getDelegate(): {
        create(args: Record<string, unknown>): Promise<any>;
        findMany(args: Record<string, unknown>): Promise<any[]>;
    } | null {
        const delegate = (this.prisma as any).support_TicketStatusHistory;
        if (delegate) {
            return delegate;
        }

        if (process.env.NODE_ENV !== 'production') {
            return null;
        }

        throw new Error('support_TicketStatusHistory delegate is not configured on prisma client');
    }
}
