import { IdempotencyKey } from '../../domain/value-objects/idempotency-key.value-object';
import { IIdempotencyRepository } from '../../domain/repositories/idempotency.repository';

export class IdempotencyService {
    constructor(private readonly repository: IIdempotencyRepository) { }

    async checkIdempotency(key: IdempotencyKey): Promise<any | null> {
        const cached = await this.repository.get(key.toString());
        if (cached) {
            return JSON.parse(cached);
        }
        return null;
    }

    async storeResult(key: IdempotencyKey, result: any): Promise<void> {
        await this.repository.save(key.toString(), JSON.stringify(result));
    }
}
