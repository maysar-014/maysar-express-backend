export type PricingMode = 'FAST_SALE' | 'BALANCED' | 'MAX_PROFIT';

export interface PricingEngineInput {
    cost: number;
    desired_margin?: number;
    category_multiplier?: number;
    pricing_mode?: PricingMode;
    engine_commission?: number;
    debug?: boolean;
}

export interface PricingResult {
    final_base_price: number;
    platform_fee: number;
    mno_fee: number;
    threshold_fee: number;
    customer_price_raw: number;
    customer_price_rounded: number;
    seller_net_revenue: number;
    seller_profit: number;
    health: {
        isHealthy: boolean;
        adjustments: string[];
    };
    applied_config: {
        min_profit_multiplier: number;
        desired_multiplier: number;
        category_multiplier: number;
        platform_fee_pct: number;
        mno_fee_pct: number;
        threshold_fee_amount: number;
        threshold_fee_trigger_base_price: number;
        customer_rounding_increment: number;
        customer_rounding_mode: 'CEIL';
    };
}

const BPS_SCALE = 10_000;
const MIN_PROFIT_MULTIPLIER = 1.2;
const DEFAULT_DESIRED_MULTIPLIER = 1.4;
const DEFAULT_CATEGORY_MULTIPLIER = 1.6;
const PLATFORM_FEE_PCT = 0.02;
const MNO_FEE_PCT = 0.04;
const PLATFORM_FEE_MIN = 200;
const PLATFORM_FEE_MAX = 3_000;
const THRESHOLD_FEE_AMOUNT = 200;
const THRESHOLD_FEE_TRIGGER_BASE_PRICE = 30_000;
const ROUNDING_INCREMENT = 500;

const MODE_DEFAULT_MULTIPLIERS: Record<PricingMode, number> = {
    FAST_SALE: 1.3,
    BALANCED: DEFAULT_DESIRED_MULTIPLIER,
    MAX_PROFIT: 1.55
};

const MIN_PROFIT_BPS = toBps(MIN_PROFIT_MULTIPLIER);
const PLATFORM_FEE_BPS = toBps(PLATFORM_FEE_PCT);
const MNO_FEE_BPS = toBps(MNO_FEE_PCT);

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

function ceilByBps(amount: number, bps: number): number {
    return Math.floor((amount * bps + (BPS_SCALE - 1)) / BPS_SCALE);
}

function roundByBps(amount: number, bps: number): number {
    return Math.floor((amount * bps + (BPS_SCALE / 2)) / BPS_SCALE);
}

function ceilToIncrement(value: number, increment: number): number {
    return Math.ceil(value / increment) * increment;
}

function toBps(value: number): number {
    if (!Number.isFinite(value)) {
        throw new Error('Invalid numeric input for basis-point conversion');
    }

    const sign = value < 0 ? -1 : 1;
    const abs = Math.abs(value);
    const source = abs.toString().toLowerCase().includes('e') ? abs.toFixed(8) : abs.toString();
    const [wholePart, fractionPart = ''] = source.split('.');
    const padded = (fractionPart + '00000').slice(0, 5);
    const fractionBps = Number(padded.slice(0, 4));
    const fifthDigit = Number(padded[4] || '0');
    let result = Number(wholePart) * BPS_SCALE + fractionBps;
    if (fifthDigit >= 5) {
        result += 1;
    }
    return sign * result;
}

export class MaysarPricingEngine {
    calculate(input: PricingEngineInput): PricingResult {
        if (!Number.isInteger(input.cost) || input.cost <= 0) {
            throw new Error('Cost must be a positive integer');
        }

        const adjustments: string[] = [];
        const pricingMode: PricingMode = input.pricing_mode ?? 'BALANCED';
        const defaultMultiplierForMode = MODE_DEFAULT_MULTIPLIERS[pricingMode];

        let desiredMultiplier = input.desired_margin ?? defaultMultiplierForMode ?? DEFAULT_DESIRED_MULTIPLIER;
        if (desiredMultiplier < MIN_PROFIT_MULTIPLIER) {
            adjustments.push(
                `desired_margin ${desiredMultiplier} was below minimum ${MIN_PROFIT_MULTIPLIER}; upgraded to minimum`
            );
            desiredMultiplier = MIN_PROFIT_MULTIPLIER;
        }

        const categoryMultiplier = input.category_multiplier ?? DEFAULT_CATEGORY_MULTIPLIER;
        if (!Number.isFinite(categoryMultiplier) || categoryMultiplier <= 0) {
            throw new Error('category_multiplier must be a positive number');
        }

        const desiredBps = toBps(desiredMultiplier);
        const categoryBps = toBps(categoryMultiplier);
        const minProfitBasePrice = ceilByBps(input.cost, MIN_PROFIT_BPS);
        const desiredBasePrice = ceilByBps(input.cost, desiredBps);
        const basePriceCandidate = Math.max(minProfitBasePrice, desiredBasePrice);
        const categoryCapPrice = ceilByBps(input.cost, categoryBps);

        let finalBasePrice = Math.min(basePriceCandidate, categoryCapPrice);
        if (finalBasePrice < basePriceCandidate) {
            adjustments.push(
                `category cap applied at ${categoryMultiplier}x; base reduced from ${basePriceCandidate} to ${finalBasePrice}`
            );
        }

        const engineCommission = input.engine_commission ?? 0;
        if (!Number.isInteger(engineCommission) || engineCommission < 0) {
            throw new Error('engine_commission must be a non-negative integer');
        }

        const computeTotals = (basePrice: number): Omit<PricingResult, 'health' | 'applied_config'> => {
            const platformFeeRaw = roundByBps(basePrice, PLATFORM_FEE_BPS);
            const platformFee = clamp(platformFeeRaw, PLATFORM_FEE_MIN, PLATFORM_FEE_MAX);
            if (platformFee !== platformFeeRaw) {
                adjustments.push(`platform fee clamped from ${platformFeeRaw} to ${platformFee}`);
            }

            const mnoFee = roundByBps(basePrice, MNO_FEE_BPS);
            const thresholdFee = basePrice > THRESHOLD_FEE_TRIGGER_BASE_PRICE ? THRESHOLD_FEE_AMOUNT : 0;
            const customerPriceRaw = basePrice + platformFee + mnoFee + thresholdFee;
            const customerPriceRounded = ceilToIncrement(customerPriceRaw, ROUNDING_INCREMENT);
            const sellerNetRevenue = basePrice - engineCommission;
            const sellerProfit = sellerNetRevenue - input.cost;

            return {
                final_base_price: basePrice,
                platform_fee: platformFee,
                mno_fee: mnoFee,
                threshold_fee: thresholdFee,
                customer_price_raw: customerPriceRaw,
                customer_price_rounded: customerPriceRounded,
                seller_net_revenue: sellerNetRevenue,
                seller_profit: sellerProfit
            };
        };

        let totals = computeTotals(finalBasePrice);
        let isHealthy = totals.seller_profit > 0 && finalBasePrice >= minProfitBasePrice;

        if (!isHealthy) {
            adjustments.push(
                `health correction applied: base price adjusted to minimum profit baseline ${minProfitBasePrice}`
            );
            finalBasePrice = minProfitBasePrice;
            totals = computeTotals(finalBasePrice);
            isHealthy = totals.seller_profit > 0 && finalBasePrice >= minProfitBasePrice;
        }

        if (!isHealthy) {
            adjustments.push('warning: engine_commission may still be too high for profitable outcome');
        }

        if (input.debug) {
            adjustments.push(`debug: mode=${pricingMode}, desired=${desiredMultiplier}, category=${categoryMultiplier}`);
        }

        return {
            ...totals,
            health: {
                isHealthy,
                adjustments
            },
            applied_config: {
                min_profit_multiplier: MIN_PROFIT_MULTIPLIER,
                desired_multiplier: desiredMultiplier,
                category_multiplier: categoryMultiplier,
                platform_fee_pct: PLATFORM_FEE_PCT,
                mno_fee_pct: MNO_FEE_PCT,
                threshold_fee_amount: THRESHOLD_FEE_AMOUNT,
                threshold_fee_trigger_base_price: THRESHOLD_FEE_TRIGGER_BASE_PRICE,
                customer_rounding_increment: ROUNDING_INCREMENT,
                customer_rounding_mode: 'CEIL'
            }
        };
    }
}
