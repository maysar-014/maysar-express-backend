import { v4 as uuidv4, validate as validateUuid } from 'uuid';

export class IdempotencyKey {
    private constructor(private readonly value: string) {
        if (!value || value.trim().length === 0) {
            throw new Error('Idempotency key cannot be empty');
        }
        // Assuming strict UUIDs for now, or allow custom strings if needed
        // Since the plan mentioned Deterministic keys from parameters, strictly enforcing UUID might be too restrictive if we want hash-based keys.
        // But let's support arbitrary non-empty strings, with a recommendation for UUIDs or Hashes.
        if (value.length > 255) {
            throw new Error('Idempotency key too long');
        }
    }

    public static create(value?: string): IdempotencyKey {
        return new IdempotencyKey(value || uuidv4());
    }

    get key(): string {
        return this.value;
    }

    public equals(other: IdempotencyKey): boolean {
        return this.value === other.value;
    }

    public toString(): string {
        return this.value;
    }
}
