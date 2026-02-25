import { SellerPricingInput } from '../value-objects/seller-pricing-input.value-object';
import { PlatformEconomics } from '../value-objects/platform-economics.value-object';
import { MarketContext } from '../value-objects/market-context.value-object';

export interface IPricingStrategy {
    phase: 'phase1' | 'phase2' | 'phase3';
    suggest(
        input: SellerPricingInput,
        economics: PlatformEconomics,
        baseGrossPrice: number,
        market?: MarketContext
    ): { suggestedPrice: number; adjustments: string[] };
}
