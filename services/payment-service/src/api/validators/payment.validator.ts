
import { z } from 'zod';
import { zodId } from '@shared/validation/id';
import { zodOrderNumber } from '@shared/ids/human-readable-ids';

/**
 * An order reference is exactly an ORDER NUMBER (ORD-YYYYMMDD-NLNL) - the only shape
 * the platform id generator produces. Nothing else is accepted: not the retired branded
 * shape, not an internal row id, and not a shipment tracking number (TRK-NLNLNL),
 * which identifies one shipment rather than the order.
 */
export const orderIdSchema = zodOrderNumber();

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
