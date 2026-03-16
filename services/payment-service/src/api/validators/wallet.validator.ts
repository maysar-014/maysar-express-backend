
import { z } from 'zod';
import { zodId } from '@shared/validation/id';

export const creditWalletSchema = z.object({
    params: z.object({
        userId: zodId(),
    }),
    body: z.object({
        amount: z.number().positive(),
        description: z.string().optional(),
        metadata: z.record(z.any()).optional(),
    }),
});

export const debitWalletSchema = z.object({
    params: z.object({
        userId: zodId(),
    }),
    body: z.object({
        amount: z.number().positive(),
        description: z.string().optional(),
        metadata: z.record(z.any()).optional(),
    }),
});

export const getWalletSchema = z.object({
    params: z.object({
        userId: zodId(),
    })
});
