import { FinancialMetricsEngine } from '../FinancialMetricsEngine';

describe('FinancialMetricsEngine', () => {
    let engine: FinancialMetricsEngine;

    beforeEach(() => {
        engine = new FinancialMetricsEngine();
    });

    it('calculates payout and withdrawal time averages', () => {
        const data = [
            {
                payoutId: 'p1',
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
                completedAt: new Date('2026-01-01T10:00:00.000Z')
            },
            {
                payoutId: 'p2',
                createdAt: new Date('2026-01-02T00:00:00.000Z'),
                completedAt: new Date('2026-01-02T04:00:00.000Z')
            }
        ];

        expect(engine.calculatePayoutTime([])).toBe(0);
        expect(engine.calculatePayoutTime(data)).toBe(7);
        expect(engine.calculateWithdrawalTime(data)).toBe(7);
    });

    it('calculates dispute rate for target categories and statuses', () => {
        const disputes = [
            { ticketId: 'd1', category: 'COMMISSION', status: 'OPEN' },
            { ticketId: 'd2', category: 'deduction', status: 'IN_PROGRESS' },
            { ticketId: 'd3', category: 'other', status: 'OPEN' }
        ];

        expect(engine.calculateDisputeRate(disputes, 0)).toBe(0);
        expect(engine.calculateDisputeRate(disputes, 100)).toBe(2);
    });

    it('combines metrics in aggregate output', () => {
        const payoutData = [
            {
                payoutId: 'p1',
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
                completedAt: new Date('2026-01-01T06:00:00.000Z')
            }
        ];

        const result = engine.calculateMetrics(payoutData, payoutData, [], 10);
        expect(result).toEqual({
            avgPayoutTimeHours: 6,
            avgWithdrawalTimeHours: 6,
            disputesPer100Orders: 0
        });
    });
});
