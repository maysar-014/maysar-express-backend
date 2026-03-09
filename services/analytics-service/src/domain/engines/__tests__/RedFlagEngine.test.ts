import { RedFlagEngine } from '../RedFlagEngine';

describe('RedFlagEngine', () => {
    let engine: RedFlagEngine;

    beforeEach(() => {
        engine = new RedFlagEngine();
    });

    it('returns no flags when metrics are healthy', () => {
        const flags = engine.detectRedFlags({
            arpsWeekly: 100,
            arpsWeeklyPrevious: 100,
            churnRateMonthly: 0.01,
            medianRevenue: 80,
            arpsMonthly: 100,
            payoutTimeHours: 12,
            disputesPer100Orders: 1,
            retentionRate90Days: 80,
            productExpansionRate: 40
        });

        expect(flags).toEqual([]);
    });

    it('detects all expected red flags when thresholds are breached', () => {
        const flags = engine.detectRedFlags({
            arpsWeekly: 80,
            arpsWeeklyPrevious: 100,
            churnRateMonthly: 0.1,
            medianRevenue: 30,
            arpsMonthly: 100,
            payoutTimeHours: 30,
            disputesPer100Orders: 3,
            retentionRate90Days: 50,
            productExpansionRate: 10
        });

        const types = flags.map(flag => flag.type);
        expect(types).toEqual([
            'arps_decline',
            'high_churn',
            'revenue_concentration',
            'slow_payouts',
            'high_disputes',
            'low_retention',
            'low_expansion'
        ]);
    });
});
