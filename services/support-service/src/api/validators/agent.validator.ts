import { z } from 'zod';

export const createAgentSchema = z.object({
    userId: z.string().uuid(),
    specializations: z.array(z.string()).optional(),
    maxConcurrentTickets: z.number().min(1).max(50).optional()
});

export const updateAgentSchema = z.object({
    specializations: z.array(z.string()).optional(),
    maxConcurrentTickets: z.number().min(1).max(50).optional(),
    isAvailable: z.boolean().optional()
});
