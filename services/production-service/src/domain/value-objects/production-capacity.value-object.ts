
export interface ProductionCapacityProps {
    maxCapacity: number;
    usedCapacity: number;
    reservedCapacity: number;
    unit: string; // e.g., 'units', 'hours', 'kg'
}

export class ProductionCapacity {
    private readonly props: ProductionCapacityProps;

    constructor(props: ProductionCapacityProps) {
        if (props.maxCapacity < 0) {
            throw new Error('Max capacity cannot be negative');
        }
        if (props.usedCapacity < 0 || props.reservedCapacity < 0) {
            throw new Error('Used or reserved capacity cannot be negative');
        }
        if (props.usedCapacity + props.reservedCapacity > props.maxCapacity) {
            throw new Error('Total utilization cannot exceed max capacity');
        }

        this.props = Object.freeze({ ...props });
    }

    get maxCapacity(): number { return this.props.maxCapacity; }
    get usedCapacity(): number { return this.props.usedCapacity; }
    get reservedCapacity(): number { return this.props.reservedCapacity; }
    get unit(): string { return this.props.unit; }

    get availableCapacity(): number {
        return this.props.maxCapacity - (this.props.usedCapacity + this.props.reservedCapacity);
    }

    get utilizationRate(): number {
        if (this.props.maxCapacity === 0) return 0;
        return ((this.props.usedCapacity + this.props.reservedCapacity) / this.props.maxCapacity) * 100;
    }

    isAvailable(amount: number): boolean {
        return this.availableCapacity >= amount;
    }

    allocate(amount: number): ProductionCapacity {
        if (!this.isAvailable(amount)) {
            throw new Error('Insufficient capacity');
        }
        return new ProductionCapacity({
            ...this.props,
            reservedCapacity: this.props.reservedCapacity + amount
        });
    }
}
