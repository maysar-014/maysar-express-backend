
import { z } from 'zod';
import { zodId } from '@shared/validation/id';

export const recordQualityCheckpointSchema = z.object({
    body: z.object({
        orderId: zodId(),
        passed: z.boolean(),
        defectCount: z.number().int().min(0),
        notes: z.string().optional(),
        images: z.array(z.string().url()).optional()
    }).strict()
});
