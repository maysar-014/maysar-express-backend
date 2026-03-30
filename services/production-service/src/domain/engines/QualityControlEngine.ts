
import { QualityScore } from '../value-objects/quality-score.value-object';
import { QualityStandardsPolicy } from '../policies/QualityStandardsPolicy';
import { QualityCheckpoint } from '../entities/QualityCheckpoint.entity';

export class QualityControlEngine {
    constructor(private readonly standardsPolicy: QualityStandardsPolicy = new QualityStandardsPolicy()) { }

    assessQuality(checkpoints: QualityCheckpoint[]): QualityScore;
    assessQuality(checkpoints: { productId: string; metrics: { defectRate: number } }): { passed: boolean; score: number };
    assessQuality(checkpoints: QualityCheckpoint[] | { productId: string; metrics: { defectRate: number } }): QualityScore | { passed: boolean; score: number } {
        if (!Array.isArray(checkpoints)) {
            const defectRate = checkpoints.metrics?.defectRate ?? 0;
            const passed = defectRate <= 0.05;
            return {
                passed,
                score: passed ? 100 : Math.max(0, Math.round((1 - defectRate) * 100))
            };
        }

        const total = checkpoints.length;
        const passed = checkpoints.filter(c => c.passed).length;
        return QualityScore.fromInspections(total, passed);
    }

    isCompliant(score: QualityScore): boolean {
        return this.standardsPolicy.isCompliant(score);
    }

    detectDefects(input: { samples: Array<{ defective?: boolean }> }): Array<{ defective?: boolean }> {
        return (input.samples ?? []).filter(sample => Boolean(sample.defective));
    }
}
