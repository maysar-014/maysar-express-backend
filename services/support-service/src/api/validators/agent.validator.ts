import { z } from 'zod';
import { zodId } from '@shared/validation/id';

export const createAgentSchema = z.object({
    userId: zodId(),
    specializations: z.array(z.string()).optional(),
    maxConcurrentTickets: z.number().min(1).max(50).optional()
});

export const updateAgentSchema = z.object({
    specializations: z.array(z.string()).optional(),
    maxConcurrentTickets: z.number().min(1).max(50).optional(),
    isAvailable: z.boolean().optional()
});
