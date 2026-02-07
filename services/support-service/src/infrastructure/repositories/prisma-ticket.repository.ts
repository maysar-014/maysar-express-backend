import { PrismaClient } from '@prisma/client';
import { injectable, inject } from 'inversify';
import { TYPES } from '../../types';
import { ITicketRepository } from '../../domain/repositories/interfaces';
import { Ticket } from '../../domain/entities/ticket.entity';
import { TicketStatus } from '../../domain/types';
import { TicketMapper } from '../../application/mappers/ticket.mapper';
import { logger } from '../services/logger.service';

@injectable()
export class PrismaTicketRepository implements ITicketRepository {
    constructor(
        @inject(TYPES.PrismaClient) private prisma: PrismaClient
    ) { }

    public async findById(id: string): Promise<Ticket | null> {
        try {
            const data = await this.prisma.support_Ticket.findUnique({
                where: { id }
            });
            return data ? TicketMapper.toDomain(data) : null;
        } catch (error) {
            logger.error(`Error finding ticket by ID: ${id}`, { error });
            throw error;
        }
    }

    public async findByUserId(userId: string): Promise<Ticket[]> {
        try {
            const data = await this.prisma.support_Ticket.findMany({
                where: { userId }
            });
            return data.map(t => TicketMapper.toDomain(t));
        } catch (error) {
            logger.error(`Error finding tickets by user ID: ${userId}`, { error });
            throw error;
        }
    }

    public async findByAgentId(assignedAgentId: string): Promise<Ticket[]> {
        try {
            const data = await this.prisma.support_Ticket.findMany({
                where: { assignedAgentId }
            });
            return data.map(t => TicketMapper.toDomain(t));
        } catch (error) {
            logger.error(`Error finding tickets by agent ID: ${assignedAgentId}`, { error });
            throw error;
        }
    }

    public async findByStatus(status: TicketStatus): Promise<Ticket[]> {
        return this.findByStatuses([status]);
    }

    public async findByStatuses(statuses: TicketStatus[]): Promise<Ticket[]> {
        try {
            const data = await this.prisma.support_Ticket.findMany({
                where: {
                    status: { in: statuses as any }
                }
            });
            return data.map(t => TicketMapper.toDomain(t));
        } catch (error) {
            logger.error(`Error finding tickets by statuses: ${statuses.join(',')}`, { error });
            throw error;
        }
    }

    public async create(ticket: Ticket): Promise<Ticket> {
        try {
            const data = await this.prisma.support_Ticket.create({
                data: {
                    id: ticket.id,
                    subject: ticket.subject,
                    description: ticket.description,
                    status: ticket.status,
                    priority: ticket.priority,
                    category: ticket.category,
                    userId: ticket.userId,
                    assignedAgentId: ticket.assignedAgentId,
                    resolution: ticket.resolution,
                    createdAt: ticket.createdAt,
                    updatedAt: ticket.updatedAt
                }
            });
            return TicketMapper.toDomain(data);
        } catch (error) {
            logger.error(`Error creating ticket: ${ticket.id}`, { error });
            throw error;
        }
    }

    public async update(ticket: Ticket): Promise<Ticket> {
        try {
            const data = await this.prisma.support_Ticket.update({
                where: { id: ticket.id },
                data: {
                    status: ticket.status,
                    priority: ticket.priority,
                    assignedAgentId: ticket.assignedAgentId,
                    updatedAt: new Date(),
                    resolvedAt: ticket.resolvedAt,
                    closedAt: ticket.closedAt,
                    resolution: ticket.resolution
                }
            });
            return TicketMapper.toDomain(data);
        } catch (error) {
            logger.error(`Error updating ticket: ${ticket.id}`, { error });
            throw error;
        }
    }

    public async delete(id: string): Promise<void> {
        try {
            await this.prisma.support_Ticket.delete({
                where: { id }
            });
        } catch (error) {
            logger.error(`Error deleting ticket: ${id}`, { error });
            throw error;
        }
    }

    public async search(query: any): Promise<Ticket[]> {
        try {
            const where: any = {};
            if (query.userId) where.userId = query.userId;
            if (query.agentId) where.assignedAgentId = query.agentId;
            if (query.status) where.status = query.status;
            if (query.priority) where.priority = query.priority;
            if (query.category) where.category = query.category;

            const data = await this.prisma.support_Ticket.findMany({
                where,
                take: query.limit || 10,
                skip: ((query.page || 1) - 1) * (query.limit || 10),
                orderBy: { createdAt: 'desc' }
            });
            return data.map(t => TicketMapper.toDomain(t));
        } catch (error) {
            logger.error('Error searching tickets', { query, error });
            throw error;
        }
    }

    public async count(query: any): Promise<number> {
        try {
            const where: any = {};
            if (query.userId) where.userId = query.userId;
            if (query.agentId) where.assignedAgentId = query.agentId;
            if (query.status) where.status = query.status;
            if (query.priority) where.priority = query.priority;
            if (query.category) where.category = query.category;

            return await this.prisma.support_Ticket.count({ where });
        } catch (error) {
            logger.error('Error counting tickets', { query, error });
            throw error;
        }
    }
}
