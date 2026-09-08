/**
 * MarkSupplierInviteUseCase (Phase 5 — Marketplace Growth Loop)
 *
 * Advances a supplier through the invite lifecycle: PENDING → INVITE_READY →
 * INVITED. The entity enforces the transition guards; when a DISCOVERED
 * supplier is marked INVITE_READY, a `supplier.invite_recommended` outbox
 * event is emitted so the growth/onboarding consumer can act on it.
 */

import { RequestSupplier } from '../../domain/entities/request-supplier.entity';
import { RequestSupplierRepository } from '../../domain/repositories/request-supplier.repository';
import { recordRequestAudit } from '../services/request-audit';
import { publishRequestEvent } from '../../infrastructure/messaging/request-outbox';
import { NotFoundError, ValidationError } from '../../../../../shared/errors/api-errors';

export class MarkSupplierInviteUseCase {
  constructor(private readonly supplierRepo: RequestSupplierRepository) {}

  /** PENDING → INVITE_READY. DISCOVERED suppliers additionally emit an invite recommendation. */
  async markInviteReady(supplierId: string, actorId?: string | null): Promise<RequestSupplier> {
    const existing = await this.supplierRepo.findById(supplierId);
    if (!existing) throw new NotFoundError(`Supplier ${supplierId} not found`);

    const from = existing.inviteStatus;
    existing.markInviteReady();
    await this.supplierRepo.save(existing);

    const data = existing.toJSON();
    await recordRequestAudit({
      requestId: data.discoveredViaRequestId ?? data.id,
      actorType: 'PROVIDER',
      actorId: actorId ?? null,
      action: 'SUPPLIER_INVITE_READY',
      fromStatus: from,
      toStatus: 'INVITE_READY',
      detail: { supplierId },
    });

    if (data.source === 'DISCOVERED' && data.discoveredViaRequestId) {
      await publishRequestEvent('supplier.invite_recommended', {
        supplierId,
        requestId: data.discoveredViaRequestId,
        supplierName: data.name,
        discoveredViaRequestId: data.discoveredViaRequestId,
      });
    }

    return existing;
  }

  /** INVITE_READY → INVITED (terminal). */
  async markInvited(supplierId: string, actorId?: string | null): Promise<RequestSupplier> {
    const existing = await this.supplierRepo.findById(supplierId);
    if (!existing) throw new NotFoundError(`Supplier ${supplierId} not found`);

    const from = existing.inviteStatus;
    if (from === 'PENDING') {
      throw new ValidationError('Supplier must be INVITE_READY before being marked INVITED');
    }

    existing.markInvited();
    await this.supplierRepo.save(existing);

    const data = existing.toJSON();
    await recordRequestAudit({
      requestId: data.discoveredViaRequestId ?? data.id,
      actorType: 'PROVIDER',
      actorId: actorId ?? null,
      action: 'SUPPLIER_INVITED',
      fromStatus: from,
      toStatus: 'INVITED',
      detail: { supplierId },
    });

    return existing;
  }
}
