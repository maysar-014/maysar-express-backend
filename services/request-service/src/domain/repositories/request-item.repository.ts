import { RequestItem } from '../entities/request-item.entity';

export interface RequestItemRepository {
  save(item: RequestItem): Promise<void>;
  findById(id: string): Promise<RequestItem | null>;
  findByRequestId(requestId: string): Promise<RequestItem[]>;
  findByQuoteId(quoteId: string): Promise<RequestItem[]>;
}