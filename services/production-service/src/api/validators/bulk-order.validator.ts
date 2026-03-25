import { z } from 'zod';
import { zodId } from '@shared/validation/id';
import { BulkOrderRequestStatus } from '../../application/dto/bulk-order.dto';

const currencySchema = z.string().regex(/^[A-Z]{3}$/, 'Currency must be a 3-letter ISO code');

export const listBulkOrderRequestsSchema = z.object({
    query: z.object({
        supplierId: zodId().optional(),
        status: z.nativeEnum(BulkOrderRequestStatus).optional()
    }).strict()
});

export const getBulkOrderRequestSchema = z.object({
    params: z.object({
        id: zodId()
    }).strict()
});

export const createBulkOrderRequestSchema = z.object({
    body: z.object({
        supplierId: zodId(),
        buyerId: zodId().optional(),
        title: z.string().min(3),
        description: z.string().min(10),
        productId: zodId().optional(),
        quantity: z.number().int().positive(),
        unit: z.string().min(1),
        currency: currencySchema,
        targetUnitPrice: z.number().positive().optional(),
        requiredBy: z.string().datetime(),
        deliveryAddress: z.string().min(3).optional(),
        notes: z.string().min(1).optional(),
        metadata: z.record(z.string(), z.unknown()).optional()
    }).strict()
});

export const submitBulkOrderQuoteSchema = z.object({
    params: z.object({
        id: zodId()
    }).strict(),
    body: z.object({
        supplierId: zodId().optional(),
        unitPrice: z.number().positive(),
        currency: currencySchema,
        leadTimeDays: z.number().int().positive(),
        minimumOrderQuantity: z.number().int().positive().optional(),
        validUntil: z.string().datetime(),
        notes: z.string().min(1).optional(),
        paymentTerms: z.string().min(1).optional()
    }).strict()
});
