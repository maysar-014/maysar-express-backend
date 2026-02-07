
import { z } from 'zod';

export const checkCapacitySchema = z.object({
    query: z.object({
        supplierId: z.string().uuid(),
        date: z.string().datetime().optional()
    })
});
