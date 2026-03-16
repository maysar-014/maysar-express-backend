
import { z } from 'zod';
import { zodId } from '@shared/validation/id';

export const checkCapacitySchema = z.object({
    query: z.object({
        supplierId: zodId(),
        date: z.string().datetime().optional()
    })
});
