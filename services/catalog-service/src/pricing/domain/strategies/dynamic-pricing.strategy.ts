import { IPricingStrategy } from './pricing-strategy.interface';
import { SellerPricingInput } from '../value-objects/seller-pricing-input.value-object';
import { PlatformEconomics } from '../value-objects/platform-economics.value-object';
import { MarketContext } from '../value-objects/market-context.value-object';

export class DynamicPricingStrategy implements IPricingStrategy {
    phase = 'phase3' as const;

    suggest(
        input: SellerPricingInput,
        economics: PlatformEconomics,
        baseGrossPrice: number,
        market?: MarketContext
    ): { suggestedPrice: number; adjustments: string[] } {
        const adjustments: string[] = [];
        let price = baseGrossPrice;

        if (market && market.isAvailable()) {
            const marketAvg = market.marketAveragePrice!;
            const lowerBound = baseGrossPrice * 0.85;
            const upperBound = baseGrossPrice * 1.15;
            price = Math.max(baseGrossPrice, Math.max(lowerBound, Math.min(upperBound, marketAvg)));
        }

        if (market?.demandLevel) {
            const demandMultipliers = { high: 1.1, medium: 1.0, low: 0.95 };
            const multiplier = demandMultipliers[market.demandLevel];
            price = Math.max(baseGrossPrice, price * multiplier);
            adjustments.push(`Demand multiplier applied: ${market.demandLevel} (${multiplier}x)`);
        }

        if (market?.salesVelocity !== undefined && market.salesVelocity < 0.5) {
            const agingDiscount = 0.97;
            price = Math.max(baseGrossPrice, price * agingDiscount);
            adjustments.push(`Aging discount applied: low velocity (${agingDiscount}x)`);
        }

        adjustments.unshift('Phase 3: dynamic pricing applied');
        return { suggestedPrice: price, adjustments };
    }
}
