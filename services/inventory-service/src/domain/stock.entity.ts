export interface StockProps {
  id: string;
  productVariantId: string;
  warehouseId: string;
  quantity: number;
  availableQuantity: number;
  reservedQuantity: number;
}

export class Stock {
  private constructor(private readonly props: StockProps) {}

  static create(props: StockProps): Stock {
    if (props.quantity < 0) {
      throw new Error('Quantity cannot be negative');
    }

    if (props.availableQuantity < 0 || props.reservedQuantity < 0) {
      throw new Error('Stock quantities cannot be negative');
    }

    if (props.availableQuantity > props.quantity) {
      throw new Error('Available quantity cannot exceed total quantity');
    }

    if (props.availableQuantity + props.reservedQuantity !== props.quantity) {
      throw new Error('Available and reserved quantities must equal total quantity');
    }

    return new Stock({ ...props });
  }

  getId(): string {
    return this.props.id;
  }

  getQuantity(): number {
    return this.props.quantity;
  }

  getAvailableQuantity(): number {
    return this.props.availableQuantity;
  }

  getReservedQuantity(): number {
    return this.props.reservedQuantity;
  }

  reserve(quantity: number): void {
    if (quantity <= 0) {
      throw new Error('Reservation quantity must be positive');
    }

    if (quantity > this.props.availableQuantity) {
      throw new Error('Insufficient available stock');
    }

    this.props.availableQuantity -= quantity;
    this.props.reservedQuantity += quantity;
  }

  release(quantity: number): void {
    if (quantity <= 0) {
      throw new Error('Release quantity must be positive');
    }

    if (quantity > this.props.reservedQuantity) {
      throw new Error('Cannot release more than reserved quantity');
    }

    this.props.availableQuantity += quantity;
    this.props.reservedQuantity -= quantity;
  }
}
