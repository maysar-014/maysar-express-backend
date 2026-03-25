import { CreateBulkOrderRequestDto, BulkOrderRequestResponseDto } from '../dto/bulk-order.dto';
import { IBulkOrderRepository } from '../interfaces/IBulkOrderRepository';

export class CreateBulkOrderRequest {
    constructor(private readonly repository: IBulkOrderRepository) { }

    async execute(input: CreateBulkOrderRequestDto): Promise<BulkOrderRequestResponseDto> {
        return this.repository.createRequest(input);
    }
}
