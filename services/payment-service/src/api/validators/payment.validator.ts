
import { z } from 'zod';
import { isSystemId, zodId } from '@shared/validation/id';

const MAYSAR_ORDER_ID_PATTERN = /^MSR-ORD-\d{8}-\d{6}-[A-F0-9]{4}$/;

export const orderIdSchema = z.string().refine(
    (value) => isSystemId(value) || MAYSAR_ORDER_ID_PATTERN.test(value),
    { message: 'Invalid ID format' }
);

export const createPaymentSchema = z.object({
    body: z.object({
        orderId: orderIdSchema,
        userId: zodId().optional(),
        amount: z.number().positive(),
        currency: z.string().length(3).default('TZS'),
        method: z.enum(['MOBILE_MONEY', 'MPESA', 'AIRTEL_MONEY', 'TIGO_PESA', 'HALOPESA', 'WALLET', 'CARD', 'BANK_TRANSFER']),
        phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
        customerName: z.string().optional(),
        customerEmail: z.string().email().optional(),
        metadata: z.record(z.any()).optional(),
        callbackUrl: z.string().url().optional(),
    }),
});

export const refundPaymentSchema = z.object({
    params: z.object({
        id: zodId(),
    }),
    body: z.object({
        amount: z.number().positive().optional(),
        reason: z.string().min(3),
        reasonDetails: z.string().optional(),
    }),
});

export const getPaymentSchema = z.object({
    params: z.object({
        id: zodId(),
    })
});
