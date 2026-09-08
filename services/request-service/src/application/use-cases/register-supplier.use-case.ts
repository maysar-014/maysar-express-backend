/**
 * RegisterSupplierUseCase (Phase 2 §2.2)
 *
 * Register/update a fulfillment supplier. Suppliers are sourcing records only
 * — they never become Maysar sellers and never appear customer-facing.
 * DISCOVERED suppliers carry their originating request reference (Phase 5
 * invite loop feeds off this).
 */

import { RequestSupplier, SupplierContact } from '../../domain/entities/request-supplier.entity';
import { RequestSupplierRepository } from '../../domain/repositories/request-supplier.repository';
import { recordRequestAudit } from '../services/request-audit';
import { NotFoundError, ValidationError } from '../../../../../shared/errors/api-errors';

export interface RegisterSupplierInput {
  name: string;
  contact: SupplierContact;
  source?: 'KNOWN' | 'DISCOVERED';
  discoveredViaRequestId?: string | null;
  isActive?: boolean;
  notes?: string | null;
}

export class RegisterSupplierUseCase {
  constructor(private readonly supplierRepo: RequestSupplierRepository) {}

  async create(input: RegisterSupplierInput): Promise<RequestSupplier> {
    if (!input.name || input.name.trim() === '') {
      throw new ValidationError('name is required');
    }
    const supplier = RequestSupplier.create({
      name: input.name,
      contact: input.contact,
      source: input.source,
      discoveredViaRequestId: input.discoveredViaRequestId,
      isActive: input.isActive,
      notes: input.notes,
    });
    await this.supplierRepo.save(supplier);
    return supplier;
  }

  async update(supplierId: string, input: Partial<RegisterSupplierInput>): Promise<RequestSupplier> {
    const existing = await this.supplierRepo.findById(supplierId);
    if (!existing) throw new NotFoundError(`Supplier ${supplierId} not found`);

    const data = existing.toJSON();
    const updated = new RequestSupplier({
      ...data,
      name: input.name && input.name.trim() !== '' ? input.name : data.name,
      contact: input.contact ?? data.contact,
      notes: input.notes !== undefined ? input.notes : data.notes,
      isActive: input.isActive !== undefined ? input.isActive : data.isActive,
    });
    await this.supplierRepo.save(updated);
    return updated;
  }
}