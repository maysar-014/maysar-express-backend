import {
    BulkOrderQuoteResponseDto,
    BulkOrderRequestResponseDto,
    SubmitBulkOrderQuoteDto
} from '../dto/bulk-order.dto';
import { IBulkOrderRepository } from '../interfaces/IBulkOrderRepository';

export class SubmitBulkOrderQuote {
    constructor(private readonly repository: IBulkOrderRepository) { }

    async execute(
        requestId: string,
        input: SubmitBulkOrderQuoteDto
    ): Promise<{ request: BulkOrderRequestResponseDto; quote: BulkOrderQuoteResponseDto }> {
        return this.repository.submitQuote(requestId, input);
    }
}
