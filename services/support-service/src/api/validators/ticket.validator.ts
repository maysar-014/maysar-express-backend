import { z } from 'zod';
import { zodId } from '@shared/validation/id';
import { TicketPriority, TicketStatus } from '../../domain/types';

export const createTicketSchema = z.object({
    subject: z.string().min(5).max(100),
    description: z.string().min(10).max(5000),
    category: z.string().trim().min(1),
    priority: z.nativeEnum(TicketPriority).optional()
});

export const addMessageSchema = z.object({
    content: z.string().min(1).max(2000),
    isInternal: z.boolean().optional(),
    senderType: z.string().optional()
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

const optionalNumber = (min?: number, max?: number) =>
    z.preprocess((val) => {
        if (val === undefined || val === null || val === '') return undefined;
        const num = Number(val);
        return Number.isNaN(num) ? val : num;
    }, z.number().min(min ?? Number.NEGATIVE_INFINITY).max(max ?? Number.POSITIVE_INFINITY).optional());

export const listTicketsSchema = z.object({
    status: z.nativeEnum(TicketStatus).optional(),
    priority: z.nativeEnum(TicketPriority).optional(),
    category: z.string().optional(),
    page: optionalNumber(1),
    limit: optionalNumber(1, 100)
});
