
import { ProductionSchedule } from '../value-objects/production-schedule.value-object';

export enum ProductionOrderStatus {
    PENDING = 'PENDING',
    SCHEDULED = 'SCHEDULED',
    IN_PROGRESS = 'IN_PROGRESS',
    QUALITY_CHECK = 'QUALITY_CHECK',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    CANCELLED = 'CANCELLED'
}

export enum ProductionPhase {
    PLANNING = 'PLANNING',
    PREPARATION = 'PREPARATION',
    ASSEMBLY = 'ASSEMBLY',
    QUALITY_CONTROL = 'QUALITY_CONTROL',
    PACKAGING = 'PACKAGING',
    COMPLETED = 'COMPLETED'
}

export interface ProductionOrderProps {
    id: string;
    planId: string;
    orderId?: string | null;
    productId: string;
    variantId?: string | null;
    quantity: number;
    producedQty: number;
    defectedQty: number;
    status: ProductionOrderStatus;
    phase: ProductionPhase;
    schedule: ProductionSchedule;
    actualStart?: Date | null;
    actualEnd?: Date | null;
    allocationId?: string | null;
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

export class ProductionOrder {
    private readonly props: ProductionOrderProps;

    constructor(props: ProductionOrderProps) {
        this.props = {
            ...props,
            createdAt: props.createdAt || new Date(),
            updatedAt: props.updatedAt || new Date()
        };
    }

    get id(): string { return this.props.id; }
    get orderId(): string | undefined | null { return this.props.orderId; }
    get productId(): string { return this.props.productId; }
    get quantity(): number { return this.props.quantity; }
    get producedQty(): number { return this.props.producedQty; }
    get defectedQty(): number { return this.props.defectedQty; }
    get status(): ProductionOrderStatus { return this.props.status; }
    get phase(): ProductionPhase { return this.props.phase; }
    get actualStart(): Date | null | undefined { return this.props.actualStart; }
    get actualEnd(): Date | null | undefined { return this.props.actualEnd; }

    startProduction(): void {
        if (this.props.status !== ProductionOrderStatus.SCHEDULED && this.props.status !== ProductionOrderStatus.PENDING) {
            throw new Error('Order must be scheduled or pending to start');
        }
        this.props.status = ProductionOrderStatus.IN_PROGRESS;
        this.props.phase = ProductionPhase.PREPARATION;
        this.props.actualStart = new Date();
        this.props.updatedAt = new Date();
    }

    completeProduction(producedQty: number, defectedQty: number): void {
        this.props.status = ProductionOrderStatus.COMPLETED;
        this.props.phase = ProductionPhase.COMPLETED;
        this.props.producedQty = producedQty;
        this.props.defectedQty = defectedQty;
        this.props.actualEnd = new Date();
        this.props.updatedAt = new Date();
    }

    failProduction(reason: string): void {
        this.props.status = ProductionOrderStatus.FAILED;
        this.props.metadata = { ...this.props.metadata, failureReason: reason };
        this.props.updatedAt = new Date();
    }
}
