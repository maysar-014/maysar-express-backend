
import { QualityScore } from '../value-objects/quality-score.value-object';

export interface LegacyQualityValidationInput {
    defectRate: number;
    compliance: boolean;
}

export class QualityStandardsPolicy {
    private static readonly MIN_PASS_RATE = 95; // 95% pass rate required
    private static readonly CRITICAL_DEFECT_TOLERANCE = 0;

    isCompliant(score: QualityScore): boolean {
        return score.score >= QualityStandardsPolicy.MIN_PASS_RATE;
    }

    requiresRework(score: QualityScore): boolean {
        return score.score < QualityStandardsPolicy.MIN_PASS_RATE;
    }

    validate(input: QualityScore | LegacyQualityValidationInput): { passed: boolean; score: number } {
        if (input instanceof QualityScore) {
            return {
                passed: this.isCompliant(input),
                score: input.score
            };
        }

        const passed = input.compliance && input.defectRate <= 0.05;
        return {
            passed,
            score: passed ? 100 : Math.max(0, Math.round((1 - input.defectRate) * 100))
        };
    }
}
