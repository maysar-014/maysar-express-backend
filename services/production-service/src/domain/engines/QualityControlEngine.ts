
import { QualityScore } from '../value-objects/quality-score.value-object';
import { QualityStandardsPolicy } from '../policies/QualityStandardsPolicy';
import { QualityCheckpoint } from '../entities/QualityCheckpoint.entity';

export class QualityControlEngine {
    constructor(private readonly standardsPolicy: QualityStandardsPolicy) { }

    assessQuality(checkpoints: QualityCheckpoint[]): QualityScore {
        const total = checkpoints.length;
        const passed = checkpoints.filter(c => c.passed).length;
        return QualityScore.fromInspections(total, passed);
    }

    isCompliant(score: QualityScore): boolean {
        return this.standardsPolicy.isCompliant(score);
    }
}
