
import { QualityScore } from '../value-objects/quality-score.value-object';

export class QualityStandardsPolicy {
    private static readonly MIN_PASS_RATE = 95; // 95% pass rate required
    private static readonly CRITICAL_DEFECT_TOLERANCE = 0;

    isCompliant(score: QualityScore): boolean {
        return score.score >= QualityStandardsPolicy.MIN_PASS_RATE;
    }

    requiresRework(score: QualityScore): boolean {
        return score.score < QualityStandardsPolicy.MIN_PASS_RATE;
    }
}
