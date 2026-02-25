import { injectable } from 'inversify';
import { SellerPricingInput } from '../value-objects/seller-pricing-input.value-object';
import { PlatformEconomics } from '../value-objects/platform-economics.value-object';

@injectable()
export class CoreCalculatorService {
    calculateRequiredNetRevenue(input: SellerPricingInput, economics: PlatformEconomics): number {
        const desiredProfit = input.getEffectiveDesiredProfit(economics.minimumSellerMarginPercentage);
        return input.baseCost + desiredProfit;
    }

    reverseCalculateGrossPrice(requiredNetRevenue: number, economics: PlatformEconomics): number {
        return requiredNetRevenue / (1 - economics.getTotalDeductionRate());
    }
}
