import { z } from 'zod';
import { zodId } from '@shared/validation/id';

export const MetricDtoSchema = z.object({
    id: zodId().optional(),
    type: z.string().min(1),
    value: z.number(),
    dimension: z.string().min(1),
    period: z.string().min(1),
    timestamp: z.string().datetime(),
    confidence: z.number().min(0).max(100)
});

export type MetricDto = z.infer<typeof MetricDtoSchema>;

export const CreateMetricDtoSchema = MetricDtoSchema.omit({ id: true });
export type CreateMetricDto = z.infer<typeof CreateMetricDtoSchema>;
