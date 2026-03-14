export interface PricingResultDTO {
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
