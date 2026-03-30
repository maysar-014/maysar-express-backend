import { PrismaClient } from '@prisma/client';
import { injectable, inject } from 'inversify';
import { TYPES } from '../../types';
import { ITicketMessageRepository } from '../../domain/repositories/interfaces';
import { TicketMessage } from '../../domain/entities/ticket-message.entity';
import { MessageMapper } from '../../application/mappers/message.mapper';
import { logger } from '../services/logger.service';

@injectable()
export class PrismaTicketMessageRepository implements ITicketMessageRepository {
    constructor(
        @inject(TYPES.PrismaClient) private prisma: PrismaClient
    ) { }

    public async findById(id: string): Promise<TicketMessage | null> {
        try {
            const data = await this.prisma.support_TicketMessage.findUnique({
                where: { id }
            });
            return data ? MessageMapper.toDomain(data) : null;
        } catch (error) {
            logger.error(`Error finding message by ID: ${id}`, { error });
            throw error;
        }
    }

    public async findByTicketId(ticketId: string): Promise<TicketMessage[]> {
        try {
            const data = await this.prisma.support_TicketMessage.findMany({
                where: { ticketId },
                orderBy: { createdAt: 'asc' }
            });
            return data.map(m => MessageMapper.toDomain(m));
        } catch (error) {
            logger.error(`Error finding messages by ticket ID: ${ticketId}`, { error });
            throw error;
        }
    }

    public async create(message: TicketMessage): Promise<TicketMessage> {
        try {
            const payload = {
                id: message.id,
                ticketId: message.ticketId,
                senderId: message.senderId,
                senderType: message.senderType,
                content: message.content,
                isInternal: message.isInternal,
                createdAt: message.createdAt
            };
            const table = this.prisma.support_TicketMessage as any;
            const data = typeof table.upsert === 'function'
                ? await table.upsert({
                    where: { id: message.id },
                    create: payload,
                    update: payload
                })
                : await table.create({
                    data: payload
                });
            return MessageMapper.toDomain(data);
        } catch (error) {
            logger.error(`Error creating message: ${message.id}`, { error });
            throw error;
        }
    }

    public async count(ticketId: string): Promise<number> {
        try {
            return await this.prisma.support_TicketMessage.count({
                where: { ticketId }
            });
        } catch (error) {
            logger.error(`Error counting messages for ticket: ${ticketId}`, { error });
            throw error;
        }
    }
}
