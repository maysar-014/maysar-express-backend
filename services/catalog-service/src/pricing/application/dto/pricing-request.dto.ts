import { z } from 'zod';

const PricingModeSchema = z.enum(['FAST_SALE', 'BALANCED', 'MAX_PROFIT']);

const CalculatePriceRequestSchema = z.object({
    cost: z.number().int().positive(),
    margin: z.number().nonnegative().optional(),
    discount: z.number().nonnegative().optional(),
    desired_margin: z.number().positive().optional(),
    category_multiplier: z.number().positive().optional(),
    pricing_mode: PricingModeSchema.optional(),
    engine_commission: z.number().int().nonnegative().optional(),
    debug: z.boolean().optional()
}).strict();

export type CalculatePriceRequestDTO = z.infer<typeof CalculatePriceRequestSchema>;
export type PricingModeDTO = z.infer<typeof PricingModeSchema>;

export function validateCalculatePriceRequest(body: unknown): CalculatePriceRequestDTO {
    return CalculatePriceRequestSchema.parse(body);
}
