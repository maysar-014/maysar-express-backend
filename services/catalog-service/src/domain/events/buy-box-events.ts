// @ts-nocheck
import { DomainEvent } from './domain-event.interface';

export class BuyBoxComputedEvent implements DomainEvent {
  readonly eventType = 'BuyBoxComputed';

  constructor(
    public readonly productId: string,
    public readonly primarySellerId: string,
    public readonly primaryScore: number,
    public readonly alternativeCount: number,
    public readonly computedAt: Date
  ) {}
}
