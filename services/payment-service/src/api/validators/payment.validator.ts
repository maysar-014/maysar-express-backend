
import { z } from 'zod';

export const createPaymentSchema = z.object({
    body: z.object({
        orderId: z.string().uuid(),
        userId: z.string().uuid().optional(),
        amount: z.number().positive(),
        currency: z.string().length(3).default('TZS'),
        method: z.enum(['MOBILE_MONEY', 'CARD', 'BANK_TRANSFER']),
        phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
        customerName: z.string().optional(),
        customerEmail: z.string().email().optional(),
        metadata: z.record(z.any()).optional(),
        callbackUrl: z.string().url().optional(),
    }),
});

export const refundPaymentSchema = z.object({
    params: z.object({
        id: z.string().uuid(),
    }),
    body: z.object({
        amount: z.number().positive().optional(),
        reason: z.string().min(3),
        reasonDetails: z.string().optional(),
    }),
});

export const getPaymentSchema = z.object({
    params: z.object({
        id: z.string().uuid(),
    })
});
