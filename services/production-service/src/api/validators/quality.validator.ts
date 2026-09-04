
import { z } from 'zod';
import { zodId } from '@shared/validation/id';

// Accept both ULID-based system IDs and flexible identifiers (e.g. variant-test-001)
const flexibleId = z.union([
    zodId(),
    z.string().min(1).max(100)
]);

export const recordQualityCheckpointSchema = z.object({
    body: z.object({
        orderId: flexibleId,
        passed: z.boolean(),
        defectCount: z.number().int().min(0),
        notes: z.string().optional(),
        images: z.array(z.string()).optional()
    }).strip()
});
