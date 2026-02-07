
export interface QualityScoreProps {
    score: number; // 0-100
    totalInspections: number;
    passedInspections: number;
}

export class QualityScore {
    private readonly props: QualityScoreProps;

    constructor(props: QualityScoreProps) {
        if (props.score < 0 || props.score > 100) {
            throw new Error('Score must be between 0 and 100');
        }
        if (props.passedInspections > props.totalInspections) {
            throw new Error('Passed inspections cannot exceed total inspections');
        }

        this.props = Object.freeze({ ...props });
    }

    get score(): number { return this.props.score; }
    get totalInspections(): number { return this.props.totalInspections; }
    get passedInspections(): number { return this.props.passedInspections; }

    get defectRate(): number {
        if (this.props.totalInspections === 0) return 0;
        return ((this.props.totalInspections - this.props.passedInspections) / this.props.totalInspections) * 100;
    }

    isAcceptable(threshold: number): boolean {
        return this.props.score >= threshold;
    }

    static fromInspections(total: number, passed: number): QualityScore {
        if (total === 0) return new QualityScore({ score: 100, totalInspections: 0, passedInspections: 0 });
        const score = (passed / total) * 100;
        return new QualityScore({
            score: Math.round(score * 100) / 100,
            totalInspections: total,
            passedInspections: passed
        });
    }
}
