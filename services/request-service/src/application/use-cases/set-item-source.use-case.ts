/**
 * SetItemSourceUseCase (Phase 2 §2.2)
 *
 * Attach or update a procurement source for an item. Creates a Request_Source;
 * the provider confirms availability before the quote can be published.
 * supplierId is required unless the item is sourced from Maysar's own
 * inventory (MAYSAR_INVENTORY).
 */

import { RequestItemRepository } from '../../domain/repositories/request-item.repository';
import { RequestSupplierRepository } from '../../domain/repositories/request-supplier.repository';
import { RequestSource, SourceAvailability } from '../../domain/entities/request-source.entity';
import { RequestSourceRepository } from '../../domain/repositories/request-source.repository';
import { NotFoundError, ValidationError } from '../../../../../shared/errors/api-errors';
import { recordRequestAudit } from '../services/request-audit';

export interface SetItemSourceInput {
  supplierId: string | null;
  agreedPriceTzs: number;
  availability?: SourceAvailability;
  availableUntil?: Date | null;
  notes?: string | null;
}

export class SetItemSourceUseCase {
  constructor(
    private readonly itemRepo: RequestItemRepository,
    private readonly sourceRepo: RequestSourceRepository,
    private readonly supplierRepo: RequestSupplierRepository,
  ) {}

  async attach(itemId: string, input: SetItemSourceInput): Promise<RequestSource> {
    const item = await this.itemRepo.findById(itemId);
    if (!item) throw new NotFoundError(`Item ${itemId} not found`);

    if (item.sourceType === 'MAYSAR_INVENTORY') {
      if (input.supplierId !== null && input.supplierId !== undefined) {
        throw new ValidationError('MAYSAR_INVENTORY items cannot reference an external supplier');
      }
    } else if (!input.supplierId) {
      throw new ValidationError('supplierId is required for non-inventory items');
    } else {
      const supplier = await this.supplierRepo.findById(input.supplierId);
      if (!supplier) throw new NotFoundError(`Supplier ${input.supplierId} not found`);
      if (!supplier.isActive) throw new ValidationError(`Supplier ${input.supplierId} is inactive`);
    }

    if (input.agreedPriceTzs < 0) throw new ValidationError('agreedPriceTzs must be ≥ 0');

    const source = RequestSource.create({
      itemId,
      supplierId: input.supplierId ?? null,
      agreedPriceTzs: input.agreedPriceTzs,
      availability: input.availability ?? 'PENDING',
      availableUntil: input.availableUntil,
      notes: input.notes,
    });
    await this.sourceRepo.save(source);

    // Phase 4 §4.3 — append-only audit trail (best-effort).
    await recordRequestAudit({
      requestId: item.requestId,
      actorType: 'PROVIDER',
      action: 'SOURCE_SET',
      toStatus: source.availability,
      detail: { itemId, sourceId: source.id, supplierId: source.supplierId, agreedPriceTzs: source.agreedPriceTzs },
    });

    return source;
  }

  async setAvailability(sourceId: string, availability: SourceAvailability, availableUntil?: Date | null): Promise<void> {
    const source = await this.sourceRepo.findById(sourceId);
    if (!source) throw new NotFoundError(`Source ${sourceId} not found`);
    const fromAvailability = source.availability;
    source.setAvailability(availability);
    await this.sourceRepo.updateAvailability(
      source.id,
      availability,
      availableUntil !== undefined ? (availableUntil ?? null) : undefined,
    );

    const item = await this.itemRepo.findById(source.itemId);
    if (item) {
      await recordRequestAudit({
        requestId: item.requestId,
        actorType: 'PROVIDER',
        action: 'SOURCE_SET',
        fromStatus: fromAvailability,
        toStatus: availability,
        detail: { itemId: source.itemId, sourceId: source.id },
      });
    }
  }

  async confirm(sourceId: string, availableUntil?: Date | null): Promise<void> {
    await this.setAvailability(sourceId, 'CONFIRMED', availableUntil);
  }
}