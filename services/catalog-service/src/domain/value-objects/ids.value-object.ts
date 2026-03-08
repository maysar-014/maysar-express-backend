/**
 * ID Value Objects
 * Domain-specific identifiers for catalog entities
 * Pure domain logic - no external dependencies
 */

export interface IdGenerator {
  generate(): string;
  validate(id: string): boolean;
}

export abstract class BaseId {
  constructor(protected readonly value: string) {
    // Validation will be performed by IdGenerator implementation
    // This ensures domain purity while allowing infrastructure-specific validation
  }

  toString(): string {
    return this.value;
  }

  equals(other: BaseId): boolean {
    return this.value === other.value;
  }
}

export class ProductId extends BaseId {
  static create(idGenerator?: IdGenerator): ProductId {
    const generator = idGenerator || { generate: () => 'generated-id', validate: () => true };
    return new ProductId(generator.generate());
  }

  static fromString(value: string, idGenerator?: IdGenerator): ProductId {
    const generator = idGenerator || { generate: () => 'generated-id', validate: () => true };
    if (!generator.validate(value)) {
      throw new Error('Invalid ID format');
    }
    return new ProductId(value);
  }
}

export class SellerId extends BaseId {
  static create(idGenerator?: IdGenerator): SellerId {
    const generator = idGenerator || { generate: () => 'generated-id', validate: () => true };
    return new SellerId(generator.generate());
  }

  static fromString(value: string, idGenerator?: IdGenerator): SellerId {
    const generator = idGenerator || { generate: () => 'generated-id', validate: () => true };
    if (!generator.validate(value)) {
      throw new Error('Invalid ID format');
    }
    return new SellerId(value);
  }
}

export class CategoryId extends BaseId {
  static create(idGenerator?: IdGenerator): CategoryId {
    const generator = idGenerator || { generate: () => 'generated-id', validate: () => true };
    return new CategoryId(generator.generate());
  }

  static fromString(value: string, idGenerator?: IdGenerator): CategoryId {
    const generator = idGenerator || { generate: () => 'generated-id', validate: () => true };
    if (!generator.validate(value)) {
      throw new Error('Invalid ID format');
    }
    return new CategoryId(value);
  }
}

export class VariantId extends BaseId {
  static create(idGenerator?: IdGenerator): VariantId {
    const generator = idGenerator || { generate: () => 'generated-id', validate: () => true };
    return new VariantId(generator.generate());
  }

  static fromString(value: string, idGenerator?: IdGenerator): VariantId {
    const generator = idGenerator || { generate: () => 'generated-id', validate: () => true };
    if (!generator.validate(value)) {
      throw new Error('Invalid ID format');
    }
    return new VariantId(value);
  }
}

export class SupplierId extends BaseId {
  static create(idGenerator?: IdGenerator): SupplierId {
    const generator = idGenerator || { generate: () => 'generated-id', validate: () => true };
    return new SupplierId(generator.generate());
  }

  static fromString(value: string, idGenerator?: IdGenerator): SupplierId {
    const generator = idGenerator || { generate: () => 'generated-id', validate: () => true };
    if (!generator.validate(value)) {
      throw new Error('Invalid ID format');
    }
    return new SupplierId(value);
  }
}

export class MediaId extends BaseId {
  static create(idGenerator?: IdGenerator): MediaId {
    const generator = idGenerator || { generate: () => 'generated-id', validate: () => true };
    return new MediaId(generator.generate());
  }

  static fromString(value: string, idGenerator?: IdGenerator): MediaId {
    const generator = idGenerator || { generate: () => 'generated-id', validate: () => true };
    if (!generator.validate(value)) {
      throw new Error('Invalid ID format');
    }
    return new MediaId(value);
  }
}
