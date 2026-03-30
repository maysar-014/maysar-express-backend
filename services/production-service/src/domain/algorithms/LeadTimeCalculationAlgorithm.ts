
import { LeadTime } from '../value-objects/lead-time.value-object';

export class LeadTimeCalculationAlgorithm {
    calculate(quantity: number | { steps?: Array<{ duration?: number }> }, complexityFactor?: number, queueLength?: number): LeadTime | number {
        if (typeof quantity === 'object' && quantity !== null) {
            const totalDuration = (quantity.steps ?? []).reduce((sum, step) => sum + (step.duration ?? 0), 0);
            return Math.max(1, Math.ceil(totalDuration / 60));
        }

        // Simplified formula: base time + (quantity * complexity) + waiting time
        const baseDays = 1;
        const productionDays = (quantity * (complexityFactor ?? 1)) / 100; // 100 units per day at complexity 1
        const waitingDays = (queueLength ?? 0) / 200; // 200 units processed per day avg

        const totalDays = Math.ceil(baseDays + productionDays + waitingDays);

        // Confidence decreases as lead time increases
        const confidence = Math.max(50, 100 - (totalDays * 2));

        return new LeadTime({
            days: totalDays,
            confidence
        });
    }
}
