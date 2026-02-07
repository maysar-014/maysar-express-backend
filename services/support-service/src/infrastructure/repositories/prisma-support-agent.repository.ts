import { PrismaClient } from '@prisma/client';
import { injectable, inject } from 'inversify';
import { TYPES } from '../../types';
import { ISupportAgentRepository } from '../../domain/repositories/interfaces';
import { SupportAgent } from '../../domain/entities/support-agent.entity';
import { AgentMapper } from '../../application/mappers/agent.mapper';
import { logger } from '../services/logger.service';

@injectable()
export class PrismaSupportAgentRepository implements ISupportAgentRepository {
    constructor(
        @inject(TYPES.PrismaClient) private prisma: PrismaClient
    ) { }

    public async findById(id: string): Promise<SupportAgent | null> {
        try {
            const data = await this.prisma.support_SupportAgent.findUnique({
                where: { id }
            });
            return data ? AgentMapper.toDomain(data) : null;
        } catch (error) {
            logger.error(`Error finding agent by ID: ${id}`, { error });
            throw error;
        }
    }

    public async findByUserId(userId: string): Promise<SupportAgent | null> {
        try {
            const data = await this.prisma.support_SupportAgent.findUnique({
                where: { userId }
            });
            return data ? AgentMapper.toDomain(data) : null;
        } catch (error) {
            logger.error(`Error finding agent by user ID: ${userId}`, { error });
            throw error;
        }
    }

    public async findAvailable(): Promise<SupportAgent[]> {
        try {
            const data = await this.prisma.support_SupportAgent.findMany({
                where: {
                    isAvailable: true,
                    currentTicketCount: {
                        lt: this.prisma.support_SupportAgent.fields.maxConcurrentTickets
                    }
                }
            });
            // In Prisma, we might need a raw query or just fetch and filter if lt with field doesn't work directly
            // Actually, maxConcurrentTickets is a field on the same model. 
            // Better way: fetch all available and filter in memory if needed, or use a specific threshold.
            const available = await this.prisma.support_SupportAgent.findMany({
                where: { isAvailable: true }
            });
            return available
                .filter(a => a.currentTicketCount < a.maxConcurrentTickets)
                .map(a => AgentMapper.toDomain(a));
        } catch (error) {
            logger.error('Error finding available agents', { error });
            throw error;
        }
    }

    public async findBySpecialization(specialization: string): Promise<SupportAgent[]> {
        try {
            const data = await this.prisma.support_SupportAgent.findMany({
                where: {
                    specializations: {
                        has: specialization
                    }
                }
            });
            return data.map(a => AgentMapper.toDomain(a));
        } catch (error) {
            logger.error(`Error finding agents by specialization: ${specialization}`, { error });
            throw error;
        }
    }

    public async create(agent: SupportAgent): Promise<SupportAgent> {
        try {
            const data = await this.prisma.support_SupportAgent.create({
                data: {
                    id: agent.id,
                    userId: agent.userId,
                    specializations: agent.specializations,
                    maxConcurrentTickets: agent.maxConcurrentTickets,
                    currentTicketCount: agent.currentTicketCount,
                    isAvailable: agent.isAvailable,
                    totalTicketsResolved: agent.metrics.totalTicketsResolved,
                    averageResolutionTime: agent.metrics.averageResolutionTime,
                    rating: agent.metrics.rating,
                    createdAt: agent.createdAt,
                    updatedAt: agent.updatedAt
                }
            });
            return AgentMapper.toDomain(data);
        } catch (error) {
            logger.error(`Error creating agent: ${agent.id}`, { error });
            throw error;
        }
    }

    public async update(agent: SupportAgent): Promise<SupportAgent> {
        try {
            const data = await this.prisma.support_SupportAgent.update({
                where: { id: agent.id },
                data: {
                    specializations: agent.specializations,
                    maxConcurrentTickets: agent.maxConcurrentTickets,
                    currentTicketCount: agent.currentTicketCount,
                    isAvailable: agent.isAvailable,
                    totalTicketsResolved: agent.metrics.totalTicketsResolved,
                    averageResolutionTime: agent.metrics.averageResolutionTime,
                    rating: agent.metrics.rating,
                    updatedAt: new Date()
                }
            });
            return AgentMapper.toDomain(data);
        } catch (error) {
            logger.error(`Error updating agent: ${agent.id}`, { error });
            throw error;
        }
    }
}
