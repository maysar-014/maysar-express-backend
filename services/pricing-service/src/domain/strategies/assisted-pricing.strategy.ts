import { IPricingStrategy } from './pricing-strategy.interface';
import { SellerPricingInput } from '../value-objects/seller-pricing-input.value-object';
import { PlatformEconomics } from '../value-objects/platform-economics.value-object';
import { MarketContext } from '../value-objects/market-context.value-object';

export class AssistedPricingStrategy implements IPricingStrategy {
    phase = 'phase2' as const;

    suggest(
        input: SellerPricingInput,
        economics: PlatformEconomics,
        baseGrossPrice: number,
        market?: MarketContext
    ): { suggestedPrice: number; adjustments: string[] } {
        const adjustments: string[] = [];

        if (!market || !market.isAvailable()) {
            adjustments.push('Phase 2: no market data, using base price');
            return { suggestedPrice: baseGrossPrice, adjustments };
        }

        const marketAvg = market.marketAveragePrice!;
        const lowerBound = baseGrossPrice * 0.85;
        const upperBound = baseGrossPrice * 1.15;
        const clampedPrice = Math.max(lowerBound, Math.min(upperBound, marketAvg));
        const finalPrice = Math.max(baseGrossPrice, clampedPrice);

        const adjustmentPct = ((finalPrice - baseGrossPrice) / baseGrossPrice * 100).toFixed(1);
        adjustments.push(`Phase 2: market-assisted suggestion applied, ${adjustmentPct}% adjustment`);

        return { suggestedPrice: finalPrice, adjustments };
    }
}
