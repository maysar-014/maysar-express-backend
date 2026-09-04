import { getModelPrefix, makeId } from '@shared/ids/id';

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

export enum PaymentMethod {
  COD = 'COD',
  WALLET = 'WALLET',
  CARD = 'CARD',
  MOBILE_MONEY = 'MOBILE_MONEY',
  SELLER_VERIFICATION = 'SELLER_VERIFICATION',
  DIRECT_PAYMENT = 'DIRECT_PAYMENT'
}

export class Payment {
  public id: string;
  public orderId: string;
  public buyerId: string;
  public amount: number;
  public currency: string;
  public method: PaymentMethod;
  public status: PaymentStatus;
  public transactionId?: string;
  public processorResponse?: any;
  public createdAt: Date;
  public updatedAt: Date;

  constructor(data: any) {
    this.id = data.id || this.generateId();
    this.orderId = data.orderId;
    this.buyerId = data.buyerId;
    this.amount = data.amount;
    this.currency = data.currency || 'TZS';
    this.method = data.method;
    this.status = PaymentStatus.PENDING;
    this.transactionId = data.transactionId;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  updateStatus(newStatus: PaymentStatus, transactionId?: string): void {
    this.status = newStatus;
    if (transactionId) {
      this.transactionId = transactionId;
    }
    this.updatedAt = new Date();
  }

  canBeRefunded(): boolean {
    return this.status === PaymentStatus.COMPLETED && this.method !== PaymentMethod.COD;
  }

  private generateId(): string {
    return makeId(getModelPrefix('Order_Payment'));
  }
}
