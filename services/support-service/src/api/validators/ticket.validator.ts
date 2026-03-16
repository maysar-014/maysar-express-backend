import { z } from 'zod';
import { zodId } from '@shared/validation/id';
import { TicketPriority, TicketStatus } from '../../domain/types';

export const createTicketSchema = z.object({
    subject: z.string().min(5).max(100),
    description: z.string().min(10).max(5000),
    category: z.string(),
    priority: z.nativeEnum(TicketPriority).optional()
});

export const addMessageSchema = z.object({
    content: z.string().min(1).max(2000),
    isInternal: z.boolean().optional()
});

export const assignTicketSchema = z.object({
    agentId: zodId()
});

export const resolveTicketSchema = z.object({
    resolution: z.string().min(5)
});

export const closeTicketSchema = z.object({
    reason: z.string().optional()
});

export const listTicketsSchema = z.object({
    status: z.nativeEnum(TicketStatus).optional(),
    priority: z.nativeEnum(TicketPriority).optional(),
    category: z.string().optional(),
    page: z.preprocess((val) => Number(val), z.number().min(1).optional()),
    limit: z.preprocess((val) => Number(val), z.number().min(1).max(100).optional())
});
