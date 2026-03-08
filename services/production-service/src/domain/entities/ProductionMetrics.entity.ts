
import { LeadTime } from '../value-objects/lead-time.value-object';
import { QualityScore } from '../value-objects/quality-score.value-object';

export interface ProductionMetricsProps {
    id: string;
    productionOrderId: string;
    leadTime?: LeadTime;
    cycleTimeSeconds?: number | null;
    qualityScore?: QualityScore;
    defectRate?: number | null;
    efficiency?: number | null;
    createdAt: Date;
}

export class ProductionMetrics {
    private readonly props: ProductionMetricsProps;

    constructor(props: ProductionMetricsProps) {
        this.props = {
            ...props,
            createdAt: props.createdAt || new Date()
        };
    }

    get id(): string { return this.props.id; }
    get productionOrderId(): string { return this.props.productionOrderId; }
    get leadTime(): LeadTime | undefined { return this.props.leadTime; }
    get qualityScore(): QualityScore | undefined { return this.props.qualityScore; }
    get efficiency(): number | null | undefined { return this.props.efficiency; }

    calculateEfficiency(targetTimeSeconds: number): void {
        if (!this.props.cycleTimeSeconds) return;
        this.props.efficiency = (targetTimeSeconds / this.props.cycleTimeSeconds) * 100;
    }
}
