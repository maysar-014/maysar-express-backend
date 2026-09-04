import { PricingAuditRecord } from '../entities/pricing-audit-record.entity';

export interface PricingAuditRecordRepository {
  save(record: PricingAuditRecord): Promise<void>;
  findByQuoteId(quoteId: string): Promise<PricingAuditRecord | null>;
}
