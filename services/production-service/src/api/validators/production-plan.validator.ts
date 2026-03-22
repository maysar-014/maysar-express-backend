
import { z } from 'zod';
import { zodId } from '@shared/validation/id';
import { ProductionPriority, ProductionStatus } from '../../domain/entities/ProductionPlan.entity';

export const createProductionPlanSchema = z.object({
    body: z.object({
        supplierId: zodId(),
        name: z.string().min(3),
        description: z.string().optional(),
        targetQuantity: z.number().int().positive(),
        startDate: z.string().datetime(),
        endDate: z.string().datetime(),
        priority: z.nativeEnum(ProductionPriority).optional(),
        maxCapacity: z.number().int().positive().optional(),
        usedCapacity: z.number().int().nonnegative().optional(),
        reservedCapacity: z.number().int().nonnegative().optional(),
        capacityUnit: z.string().min(1).optional()
    }).strict()
});

export const updateProductionStatusSchema = z.object({
    params: z.object({
        id: zodId()
    }).strict(),
    body: z.object({
        status: z.nativeEnum(ProductionStatus)
    }).strict()
});
