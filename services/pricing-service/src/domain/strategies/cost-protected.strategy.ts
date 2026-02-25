import { IPricingStrategy } from './pricing-strategy.interface';
import { SellerPricingInput } from '../value-objects/seller-pricing-input.value-object';
import { PlatformEconomics } from '../value-objects/platform-economics.value-object';
import { MarketContext } from '../value-objects/market-context.value-object';

export class CostProtectedStrategy implements IPricingStrategy {
    phase = 'phase1' as const;

    suggest(
        input: SellerPricingInput,
        economics: PlatformEconomics,
        baseGrossPrice: number,
        _market?: MarketContext
    ): { suggestedPrice: number; adjustments: string[] } {
        return {
            suggestedPrice: baseGrossPrice,
            adjustments: ['Phase 1: cost-protected pricing applied']
        };
    }
}
