import { SellerPricingInput } from '../value-objects/seller-pricing-input.value-object';
import { PlatformEconomics } from '../value-objects/platform-economics.value-object';
import { MarketContext } from '../value-objects/market-context.value-object';
import { CoreCalculatorService } from '../services/core-calculator.service';
import { PlatformValidatorService } from '../services/platform-validator.service';
import { CategoryGuardService } from '../services/category-guard.service';
import { RoundingService } from '../services/rounding.service';
import { IPricingStrategy } from '../strategies/pricing-strategy.interface';

export interface PricingResult {
    finalPrice: number;
    sellerNetRevenue: number;
    sellerProfit: number;
    platformRevenue: number;
    isHealthy: boolean;
    adjustments: string[];
    warnings: string[];
}

export class MaysarPricingEngine {
    constructor(
        private readonly coreCalculator: CoreCalculatorService,
        private readonly platformValidator: PlatformValidatorService,
        private readonly categoryGuard: CategoryGuardService,
        private readonly roundingService: RoundingService,
        private readonly strategy: IPricingStrategy
    ) {}

    calculate(
        input: SellerPricingInput,
        economics: PlatformEconomics,
        market?: MarketContext
    ): PricingResult {
        const adjustments: string[] = [];
        const warnings: string[] = [];

        const requiredNetRevenue = this.coreCalculator.calculateRequiredNetRevenue(input, economics);
        const baseGrossPrice = this.coreCalculator.reverseCalculateGrossPrice(requiredNetRevenue, economics);
        adjustments.push(`Base calculation: net revenue ${requiredNetRevenue} TZS → gross ${baseGrossPrice.toFixed(0)} TZS`);

        const strategyResult = this.strategy.suggest(input, economics, baseGrossPrice, market);
        adjustments.push(...strategyResult.adjustments);

        const validationResult = this.platformValidator.validate(strategyResult.suggestedPrice, economics);
        adjustments.push(...validationResult.adjustments);

        const guardResult = this.categoryGuard.enforce(validationResult.price, input.baseCost, input.productCategory);
        adjustments.push(...guardResult.adjustments);

        const finalPrice = this.roundingService.round(guardResult.price);
        adjustments.push(this.roundingService.describeRounding(guardResult.price));

        const totalDeductionRate = economics.getTotalDeductionRate();
        const sellerNetRevenue = Math.floor(finalPrice * (1 - totalDeductionRate));
        const sellerProfit = sellerNetRevenue - input.baseCost;
        const platformRevenue = Math.floor(finalPrice * (economics.commissionPercentage / 100));
        const platformMarginRate = platformRevenue / finalPrice;
        const minPlatformMarginRate = economics.minimumPlatformMarginPercentage / 100;

        const isHealthy = sellerProfit >= 0 && platformMarginRate >= minPlatformMarginRate;

        if (!isHealthy) {
            if (sellerProfit < 0) warnings.push(`Seller profit negative: ${sellerProfit} TZS`);
            if (platformMarginRate < minPlatformMarginRate) {
                warnings.push(`Platform margin below minimum: ${(platformMarginRate * 100).toFixed(2)}% < ${economics.minimumPlatformMarginPercentage}%`);
            }
        }

        return {
            finalPrice,
            sellerNetRevenue,
            sellerProfit,
            platformRevenue,
            isHealthy,
            adjustments,
            warnings
        };
    }
}
