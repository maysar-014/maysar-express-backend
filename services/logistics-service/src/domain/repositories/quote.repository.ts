import { Quote } from '../entities/quote.entity';

export interface QuoteRepository {
  save(quote: Quote): Promise<void>;
  findById(quoteId: string): Promise<Quote | null>;
  markConsumed(quoteId: string): Promise<void>;
  markExpired(quoteId: string): Promise<void>;
}
