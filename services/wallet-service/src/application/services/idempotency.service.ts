import { IdempotencyKey } from '../../domain/value-objects/idempotency-key.value-object';
import { IIdempotencyRepository } from '../../domain/repositories/idempotency.repository';

export class IdempotencyService {
    constructor(private readonly repository: IIdempotencyRepository) { }

    async checkIdempotency<T>(key: IdempotencyKey): Promise<T | null> {
        const cached = await this.repository.get(key.toString());
        if (cached) {
            return JSON.parse(cached);
        }
        return null;
    }

    async storeResult(key: IdempotencyKey, result: unknown): Promise<void> {
        await this.repository.save(key.toString(), JSON.stringify(result));
    }
}
