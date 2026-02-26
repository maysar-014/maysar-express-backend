import { z } from 'zod';

const MarketDataSchema = z.object({
    marketAveragePrice: z.number().positive().optional(),
    competitorPrices: z.array(z.number().positive()).optional(),
    demandLevel: z.enum(['low', 'medium', 'high']).optional(),
    salesVelocity: z.number().min(0).max(1).optional()
}).optional();

const CalculatePriceRequestSchema = z.object({
    baseCost: z.number().positive(),
    desiredProfit: z.number().nonnegative().optional(),
    productCategory: z.string().min(1),
    condition: z.enum(['new', 'used', 'refurbished']),
    commissionPercentage: z.number().min(0).max(100),
    paymentGatewayPercentage: z.number().min(0).max(100),
    minimumSellerMarginPercentage: z.number().min(0).max(100),
    minimumPlatformMarginPercentage: z.number().min(0).max(100),
    deliverySubsidy: z.number().nonnegative().optional(),
    phase: z.enum(['phase1', 'phase2', 'phase3']),
    market: MarketDataSchema
});

export type CalculatePriceRequestDTO = z.infer<typeof CalculatePriceRequestSchema>;

export function validateCalculatePriceRequest(body: unknown): CalculatePriceRequestDTO {
    return CalculatePriceRequestSchema.parse(body);
}
