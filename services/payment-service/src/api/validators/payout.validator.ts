
import { z } from 'zod';
import { zodId } from '@shared/validation/id';

export const createPayoutSchema = z.object({
    body: z.object({
        userId: zodId(),
        amount: z.number().positive(),
        currency: z.string().length(3).default('TZS'),
        method: z.enum(['MOBILE_MONEY', 'BANK_TRANSFER']),
        accountNumber: z.string(),
        accountName: z.string(),
        bankCode: z.string().optional(), // For bank transfer
        provider: z.string().optional(), // For mobile money (e.g., M-Pesa)
        description: z.string().optional(),
    }),
});

export const getPayoutSchema = z.object({
    params: z.object({
        id: zodId(),
    }),
});
