import { RequestSource, SourceAvailability } from '../entities/request-source.entity';

export interface RequestSourceRepository {
  save(source: RequestSource): Promise<void>;
  findById(id: string): Promise<RequestSource | null>;
  findByItemId(itemId: string): Promise<RequestSource[]>;
  listBySupplierId(supplierId: string): Promise<RequestSource[]>;
  updateAvailability(id: string, availability: SourceAvailability, availableUntil?: Date | null): Promise<void>;
}