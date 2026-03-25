export interface PromotionJobProps {
  id: string;
  campaignId: string;
  title: string;
  description?: string;
  sellerId: string;
  type: string;
  status: string;
  startDate: Date;
  endDate?: Date | null;
  timezone: string;
  productIds: string[];
  categoryIds: string[];
  pricingRuleCount: number;
  metadata?: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

export class PromotionJobEntity {
  private constructor(private readonly props: PromotionJobProps) {}

  static create(props: PromotionJobProps): PromotionJobEntity {
    return new PromotionJobEntity(props);
  }

  get id(): string {
    return this.props.id;
  }

  get sellerId(): string {
    return this.props.sellerId;
  }

  get status(): string {
    return this.props.status;
  }

  get startDate(): Date {
    return this.props.startDate;
  }

  get endDate(): Date | null | undefined {
    return this.props.endDate;
  }

  toPlainObject(): PromotionJobProps {
    return { ...this.props };
  }

  canBeAccepted(now: Date = new Date()): boolean {
    if (!['ACTIVE', 'SCHEDULED'].includes(this.props.status)) {
      return false;
    }

    if (this.props.endDate && this.props.endDate.getTime() < now.getTime()) {
      return false;
    }

    return true;
  }
}
