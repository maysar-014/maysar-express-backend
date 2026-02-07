
import { z } from 'zod';

export const recordQualityCheckpointSchema = z.object({
    body: z.object({
        orderId: z.string().uuid(),
        passed: z.boolean(),
        defectCount: z.number().int().min(0),
        notes: z.string().optional(),
        images: z.array(z.string().url()).optional()
    })
});
