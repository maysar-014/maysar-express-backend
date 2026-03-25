import { BulkOrderRequestResponseDto } from '../dto/bulk-order.dto';
import { IBulkOrderRepository } from '../interfaces/IBulkOrderRepository';

export class GetBulkOrderRequest {
    constructor(private readonly repository: IBulkOrderRepository) { }

    async execute(id: string): Promise<BulkOrderRequestResponseDto | null> {
        return this.repository.findRequestById(id);
    }
}
