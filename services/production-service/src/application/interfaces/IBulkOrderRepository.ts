import {
    BulkOrderQuoteResponseDto,
    BulkOrderRequestResponseDto,
    CreateBulkOrderRequestDto,
    ListBulkOrderRequestsDto,
    SubmitBulkOrderQuoteDto
} from '../dto/bulk-order.dto';

export interface IBulkOrderRepository {
    createRequest(input: CreateBulkOrderRequestDto): Promise<BulkOrderRequestResponseDto>;
    listRequests(filter: ListBulkOrderRequestsDto): Promise<BulkOrderRequestResponseDto[]>;
    findRequestById(id: string): Promise<BulkOrderRequestResponseDto | null>;
    submitQuote(
        requestId: string,
        input: SubmitBulkOrderQuoteDto
    ): Promise<{ request: BulkOrderRequestResponseDto; quote: BulkOrderQuoteResponseDto }>;
}
