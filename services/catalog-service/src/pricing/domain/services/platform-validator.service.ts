import { injectable } from 'inversify';
import { PlatformEconomics } from '../value-objects/platform-economics.value-object';

@injectable()
export class PlatformValidatorService {
    validate(grossPrice: number, economics: PlatformEconomics): { price: number; adjustments: string[] } {
        const adjustments: string[] = [];
        let adjustedPrice = grossPrice;
        const minMarginRate = economics.minimumPlatformMarginPercentage / 100;

        const platformRevenue = adjustedPrice * (economics.commissionPercentage / 100);
        const platformMarginRate = platformRevenue / adjustedPrice;

        if (platformMarginRate < minMarginRate) {
            adjustedPrice = platformRevenue / minMarginRate;
            adjustments.push(`Platform margin enforced: increased from ${(platformMarginRate * 100).toFixed(2)}% to ${economics.minimumPlatformMarginPercentage}%`);
        }

        return { price: adjustedPrice, adjustments };
    }
}
