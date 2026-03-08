
export enum QualityStatus {
    PENDING = 'PENDING',
    PASSED = 'PASSED',
    FAILED = 'FAILED',
    REWORK_REQUIRED = 'REWORK_REQUIRED'
}

export interface QualityCheckpointProps {
    id: string;
    productionOrderId: string;
    inspectorId?: string | null;
    inspectionDate: Date;
    stage: string; // matches ProductionPhase or similar
    status: QualityStatus;
    passed?: boolean | null;
    defectCount: number;
    defectDetails?: Record<string, unknown>;
    notes?: string | null;
    images: string[];
    createdAt: Date;
    updatedAt: Date;
}

export class QualityCheckpoint {
    private readonly props: QualityCheckpointProps;

    constructor(props: QualityCheckpointProps) {
        this.props = {
            ...props,
            createdAt: props.createdAt || new Date(),
            updatedAt: props.updatedAt || new Date()
        };
    }

    get id(): string { return this.props.id; }
    get status(): QualityStatus { return this.props.status; }
    get passed(): boolean | undefined | null { return this.props.passed; }
    get defectCount(): number { return this.props.defectCount; }
    get notes(): string | null | undefined { return this.props.notes; }

    recordResult(passed: boolean, defectCount: number, notes?: string): void {
        this.props.passed = passed;
        this.props.defectCount = defectCount;
        this.props.status = passed ? QualityStatus.PASSED : QualityStatus.FAILED;
        if (notes) this.props.notes = notes;
        this.props.updatedAt = new Date();
    }

    requiresRework(): boolean {
        return this.props.status === QualityStatus.REWORK_REQUIRED;
    }
}
