/**
 * ListSuppliersUseCase (Phase 2 §2.2)
 * Provider-visible supplier registry + what they supply (source history).
 */

import { RequestSupplier, MAYSAR_INVENTORY_SUPPLIER_ID } from '../../domain/entities/request-supplier.entity';
import { RequestSupplierRepository } from '../../domain/repositories/request-supplier.repository';
import { RequestSourceRepository } from '../../domain/repositories/request-source.repository';

export interface SupplierSummary {
  supplier: ReturnType<RequestSupplier['toJSON']>;
  /** Number of item sources this supplier currently backs. */
  suppliedCount: number;
  isInventory: boolean;
}

export class ListSuppliersUseCase {
  constructor(
    private readonly supplierRepo: RequestSupplierRepository,
    private readonly sourceRepo: RequestSourceRepository,
  ) {}

  async execute(activeOnly: boolean = false): Promise<SupplierSummary[]> {
    const suppliers = await this.supplierRepo.list(activeOnly ? { isActive: true } : undefined);
    const summaries: SupplierSummary[] = [];
    for (const supplier of suppliers) {
      const sources = await this.sourceRepo.listBySupplierId(supplier.id);
      summaries.push({
        supplier: supplier.toJSON(),
        suppliedCount: sources.length,
        isInventory: supplier.id === MAYSAR_INVENTORY_SUPPLIER_ID,
      });
    }
    return summaries;
  }
}