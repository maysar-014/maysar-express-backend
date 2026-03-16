import { getModelPrefix, isSystemId, makeId } from '@shared/ids/id';

export abstract class BaseId {
  constructor(protected readonly value: string) {
    if (!isSystemId(value)) {
      throw new Error(`Invalid ID: ${value}`);
    }
  }

  toString(): string {
    return this.value;
  }

  equals(other: BaseId): boolean {
    return this.value === other.value;
  }

  static generate(prefix: string): string {
    return makeId(prefix);
  }
}

export class CommissionId extends BaseId {
  static create(): CommissionId {
    return new CommissionId(BaseId.generate(getModelPrefix('Commission')));
  }

  static fromString(value: string): CommissionId {
    return new CommissionId(value);
  }
}

export class OrderId extends BaseId {
  static create(): OrderId {
    return new OrderId(BaseId.generate(getModelPrefix('Order_Order')));
  }

  static fromString(value: string): OrderId {
    return new OrderId(value);
  }
}

export class SellerId extends BaseId {
  static create(): SellerId {
    return new SellerId(BaseId.generate(getModelPrefix('User_User')));
  }

  static fromString(value: string): SellerId {
    return new SellerId(value);
  }
}

export class RecipientId extends BaseId {
  static create(): RecipientId {
    return new RecipientId(BaseId.generate(getModelPrefix('User_User')));
  }

  static fromString(value: string): RecipientId {
    return new RecipientId(value);
  }
}

export class PayoutId extends BaseId {
  static create(): PayoutId {
    return new PayoutId(BaseId.generate(getModelPrefix('Commission_Payout')));
  }

  static fromString(value: string): PayoutId {
    return new PayoutId(value);
  }
}
