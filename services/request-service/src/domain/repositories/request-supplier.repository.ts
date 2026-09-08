import { RequestSupplier } from '../entities/request-supplier.entity';

export interface RequestSupplierRepository {
  save(supplier: RequestSupplier): Promise<void>;
  findById(id: string): Promise<RequestSupplier | null>;
  list(filter?: { id?: string; isActive?: boolean }): Promise<RequestSupplier[]>;
  /** Suppliers discovered via a specific request (Phase 5 invite loop). */
  listDiscoveredByRequest(requestId: string): Promise<RequestSupplier[]>;
}