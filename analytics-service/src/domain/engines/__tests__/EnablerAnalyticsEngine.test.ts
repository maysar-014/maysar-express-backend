import { EnablerAnalyticsEngine } from '../EnablerAnalyticsEngine';
import { EnablerKPIAnalysis } from '../../types';

describe('EnablerAnalyticsEngine', () => {
    let engine: EnablerAnalyticsEngine;

    beforeEach(() => {
        engine = new EnablerAnalyticsEngine();
    });

    describe('calculateKPIAnalysis', () => {
        it('should return the correct scorecard', () => {
            const analysis = engine.calculateKPIAnalysis({});

            expect(analysis.overallScore).toBe(87);
            expect(analysis.breakdown.productivity).toBe(85);
            expect(analysis.breakdown.quality).toBe(90);
            expect(analysis.breakdown.impact).toBe(86);
        });
    });

    describe('createImprovementPlan', () => {
        it('should generate an improvement plan based on analysis', () => {
            const analysis: EnablerKPIAnalysis = {
                overallScore: 80,
                breakdown: { productivity: 80, quality: 80, impact: 80 }
            };

            const plan = engine.createImprovementPlan(analysis);

            expect(plan.timeline).toBe('90 days');
            expect(plan.goals).toHaveLength(1);
            expect(plan.goals[0].metric).toBe('response_time');
            expect(plan.goals[0].target).toBe(1.5);
        });
    });
});
