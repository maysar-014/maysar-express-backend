import { CalculatePriceUseCase } from '../calculate-price.use-case';

describe('CalculatePriceUseCase', () => {
    const engine = { calculate: jest.fn() };
    const factory = { createEngine: jest.fn().mockReturnValue(engine) } as any;
    const useCase = new CalculatePriceUseCase(factory);

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('builds domain inputs and delegates to engine', () => {
        engine.calculate.mockReturnValue({
            final_base_price: 100000,
            platform_fee: 2000,
            mno_fee: 4000,
            threshold_fee: 200,
            customer_price_raw: 106200,
            customer_price_rounded: 106500,
            seller_net_revenue: 100000,
            seller_profit: 20000,
            health: { isHealthy: true, adjustments: [] },
            applied_config: {
                min_profit_multiplier: 1.2,
                desired_multiplier: 1.4,
                category_multiplier: 1.6,
                platform_fee_pct: 0.02,
                mno_fee_pct: 0.04,
                threshold_fee_amount: 200,
                threshold_fee_trigger_base_price: 30000,
                customer_rounding_increment: 500,
                customer_rounding_mode: 'CEIL'
            }
        });

        const result = useCase.execute({
            cost: 80000,
            desired_margin: 1.35,
            category_multiplier: 1.6,
            pricing_mode: 'BALANCED'
        });

        expect(factory.createEngine).toHaveBeenCalledWith('BALANCED');
        expect(engine.calculate).toHaveBeenCalledTimes(1);
        expect(result.final_base_price).toBe(100000);
    });
});
