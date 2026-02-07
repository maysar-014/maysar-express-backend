import { Enabler_Tier } from '@prisma/client';

/**
 * Value Object for Commission Tier
 */
export class CommissionTier {
    private constructor(
        private readonly tier: Enabler_Tier,
        private readonly baseRate: number,
        private readonly multiplier: number
    ) { }

    static create(tier: Enabler_Tier): CommissionTier {
        const config = this.getTierConfig(tier);
        return new CommissionTier(tier, config.baseRate, config.multiplier);
    }

    private static getTierConfig(tier: Enabler_Tier): { baseRate: number; multiplier: number } {
        switch (tier) {
            case Enabler_Tier.BRONZE:
                return { baseRate: 0.15, multiplier: 1.0 };
            case Enabler_Tier.SILVER:
                return { baseRate: 0.17, multiplier: 1.1 };
            case Enabler_Tier.GOLD:
                return { baseRate: 0.19, multiplier: 1.2 };
            case Enabler_Tier.PLATINUM:
                return { baseRate: 0.22, multiplier: 1.3 };
            default:
                throw new Error(`Unknown tier: ${tier}`);
        }
    }

    getTier(): Enabler_Tier {
        return this.tier;
    }

    getBaseRate(): number {
        return this.baseRate;
    }

    getMultiplier(): number {
        return this.multiplier;
    }

    getEffectiveRate(performanceMultiplier: number = 1.0): number {
        return Math.min(this.baseRate * this.multiplier * performanceMultiplier, 0.25);
    }

    canUpgrade(): boolean {
        return this.tier !== Enabler_Tier.PLATINUM;
    }

    getNextTier(): Enabler_Tier | null {
        switch (this.tier) {
            case Enabler_Tier.BRONZE:
                return Enabler_Tier.SILVER;
            case Enabler_Tier.SILVER:
                return Enabler_Tier.GOLD;
            case Enabler_Tier.GOLD:
                return Enabler_Tier.PLATINUM;
            default:
                return null;
        }
    }

    equals(other: CommissionTier): boolean {
        return this.tier === other.tier;
    }

    toString(): string {
        return `${this.tier} (Rate: ${this.baseRate * 100}%, Multiplier: ${this.multiplier}x)`;
    }
}
