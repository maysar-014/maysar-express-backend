
import { ProductionSchedule } from '../value-objects/production-schedule.value-object';
import { ProductionCapacity } from '../value-objects/production-capacity.value-object';

export enum ProductionStatus {
    DRAFT = 'DRAFT',
    SCHEDULED = 'SCHEDULED',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
    ON_HOLD = 'ON_HOLD'
}

export enum ProductionPriority {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    CRITICAL = 'CRITICAL'
}

export interface ProductionPlanProps {
    id: string;
    supplierId: string;
    name: string;
    description?: string | null;
    status: ProductionStatus;
    priority: ProductionPriority;
    schedule: ProductionSchedule;
    targetQuantity: number;
    actualQuantity: number;
    version: number;
    capacity?: ProductionCapacity; // Snapshot of capacity at planning time
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

export class ProductionPlan {
    private readonly props: ProductionPlanProps;

    constructor(props: ProductionPlanProps) {
        this.props = {
            ...props,
            createdAt: props.createdAt || new Date(),
            updatedAt: props.updatedAt || new Date()
        };
    }

    get id(): string { return this.props.id; }
    get supplierId(): string { return this.props.supplierId; }
    get name(): string { return this.props.name; }
    get status(): ProductionStatus { return this.props.status; }
    get priority(): ProductionPriority { return this.props.priority; }
    get schedule(): ProductionSchedule { return this.props.schedule; }
    get targetQuantity(): number { return this.props.targetQuantity; }
    get actualQuantity(): number { return this.props.actualQuantity; }
    get version(): number { return this.props.version; }

    updateStatus(newStatus: ProductionStatus): void {
        // Add state transition validation logic here
        if (this.props.status === ProductionStatus.COMPLETED && newStatus !== ProductionStatus.COMPLETED) {
            throw new Error('Cannot change status of completed plan');
        }
        this.props.status = newStatus;
        this.props.updatedAt = new Date();
    }

    updateProgress(actualQuantity: number): void {
        if (this.props.status !== ProductionStatus.IN_PROGRESS) {
            throw new Error('Cannot update progress if plan is not in progress');
        }
        this.props.actualQuantity = actualQuantity;
        this.props.updatedAt = new Date();
    }

    isCompleted(): boolean {
        return this.props.status === ProductionStatus.COMPLETED;
    }

    toJSON() {
        return {
            ...this.props,
            schedule: {
                startTime: this.props.schedule.startTime,
                endTime: this.props.schedule.endTime
            }
        }
    }
}
