export interface ReservationProps {
  id: string;
  orderId: string;
  productVariantId: string;
  quantity: number;
  expiresAt: Date;
}

export class Reservation {
  private constructor(private readonly props: ReservationProps) {}

  static create(props: ReservationProps): Reservation {
    if (props.quantity <= 0) {
      throw new Error('Quantity must be positive');
    }

    if (!(props.expiresAt instanceof Date) || props.expiresAt.getTime() <= Date.now()) {
      throw new Error('Expiration date must be in the future');
    }

    return new Reservation({ ...props });
  }

  getId(): string {
    return this.props.id;
  }

  getQuantity(): number {
    return this.props.quantity;
  }

  isExpired(): boolean {
    return Date.now() >= this.props.expiresAt.getTime();
  }
}
