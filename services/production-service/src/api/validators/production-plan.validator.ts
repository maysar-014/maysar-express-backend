
import { z } from 'zod';
import { zodId } from '@shared/validation/id';
import { ProductionPriority } from '../../domain/entities/ProductionPlan.entity';

export const createProductionPlanSchema = z.object({
    body: z.object({
        supplierId: zodId(),
        name: z.string().min(3),
        description: z.string().optional(),
        targetQuantity: z.number().int().positive(),
        startDate: z.string().datetime(),
        endDate: z.string().datetime(),
        priority: z.nativeEnum(ProductionPriority).optional()
    })
});

export const updateProductionStatusSchema = z.object({
    params: z.object({
        id: zodId()
    }),
    body: z.object({
        status: z.string() // Should be enum validation ideally
    })
});
