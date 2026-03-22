import { z } from 'zod';
import { zodId } from '@shared/validation/id';

const SAFE_VISIBLE_STRING_PATTERN = /^(?=.*\S)[^\u0000-\u001F\u007F-\u009F]+$/u;
const safeVisibleString = z.string().min(1).regex(SAFE_VISIBLE_STRING_PATTERN, {
    message: 'Expected a non-empty printable string'
});

export const createAgentSchema = z.object({
    userId: zodId(),
    specializations: z.array(safeVisibleString).optional(),
    maxConcurrentTickets: z.number().min(1).max(50).optional()
});

export const updateAgentSchema = z.object({
    specializations: z.array(safeVisibleString).optional(),
    maxConcurrentTickets: z.number().min(1).max(50).optional(),
    isAvailable: z.boolean().optional()
});
