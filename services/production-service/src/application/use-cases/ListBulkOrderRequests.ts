import { BulkOrderRequestResponseDto, ListBulkOrderRequestsDto } from '../dto/bulk-order.dto';
import { IBulkOrderRepository } from '../interfaces/IBulkOrderRepository';

export class ListBulkOrderRequests {
    constructor(private readonly repository: IBulkOrderRepository) { }

    async execute(filter: ListBulkOrderRequestsDto): Promise<BulkOrderRequestResponseDto[]> {
        return this.repository.listRequests(filter);
    }
}
