import { v4 as uuidv4, validate as uuidValidate } from 'uuid';

export abstract class BaseId {
  constructor(protected readonly value: string) {
    if (!uuidValidate(value)) {
      throw new Error(`Invalid UUID: ${value}`);
    }
  }

  toString(): string {
    return this.value;
  }

  equals(other: BaseId): boolean {
    return this.value === other.value;
  }

  static generate(): string {
    return uuidv4();
  }
}

export class CommissionId extends BaseId {
  static create(): CommissionId {
    return new CommissionId(BaseId.generate());
  }

  static fromString(value: string): CommissionId {
    return new CommissionId(value);
  }
}

export class OrderId extends BaseId {
  static create(): OrderId {
    return new OrderId(BaseId.generate());
  }

  static fromString(value: string): OrderId {
    return new OrderId(value);
  }
}

export class SellerId extends BaseId {
  static create(): SellerId {
    return new SellerId(BaseId.generate());
  }

  static fromString(value: string): SellerId {
    return new SellerId(value);
  }
}

export class RecipientId extends BaseId {
  static create(): RecipientId {
    return new RecipientId(BaseId.generate());
  }

  static fromString(value: string): RecipientId {
    return new RecipientId(value);
  }
}

export class PayoutId extends BaseId {
  static create(): PayoutId {
    return new PayoutId(BaseId.generate());
  }

  static fromString(value: string): PayoutId {
    return new PayoutId(value);
  }
}
