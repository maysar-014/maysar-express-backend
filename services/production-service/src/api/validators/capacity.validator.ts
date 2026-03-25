
import { z } from 'zod';
import { zodId } from '@shared/validation/id';

export const checkCapacitySchema = z.object({
    query: z.object({
        supplierId: zodId().optional(),
        date: z.string().datetime().optional()
    }).strict()
});

export const updateCapacitySchema = z.object({
    body: z.object({
        supplierId: zodId().optional(),
        date: z.string().datetime().optional(),
        maxCapacity: z.number().nonnegative(),
        usedCapacity: z.number().nonnegative(),
        reservedCapacity: z.number().nonnegative(),
        unit: z.string().min(1),
        reason: z.string().min(1).optional()
    }).strict()
});
