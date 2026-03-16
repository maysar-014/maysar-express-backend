import { isSystemId } from '@shared/validation/id';

/**
 * Value Object for Enabler ID
 */
export class EnablerId {
    private constructor(private readonly value: string) {
        this.validate(value);
    }

    static create(id: string): EnablerId {
        return new EnablerId(id);
    }

    private validate(id: string): void {
        if (!id || id.trim().length === 0) {
            throw new Error('Enabler ID cannot be empty');
        }
        if (!isSystemId(id)) {
            throw new Error('Invalid enabler ID format');
        }
    }

    getValue(): string {
        return this.value;
    }

    equals(other: EnablerId): boolean {
        return this.value === other.value;
    }

    toString(): string {
        return this.value;
    }
}
