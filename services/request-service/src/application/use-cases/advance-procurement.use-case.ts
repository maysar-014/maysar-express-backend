/**
 * AdvanceProcurementUseCase (Phase 2 §2.3)
 *
 * Provider/ops advances a procurement row: PENDING → ORDERED → RECEIVED | FAILED.
 * The entity enforces legal transitions; a FAILED status requires a note.
 * Maysar-internal — the customer never sees procurement status.
 */

import { ProcurementStatus } from '../../domain/entities/request-procurement.entity';
import { RequestProcurementRepository } from '../../domain/repositories/request-procurement.repository';
import { RequestItemRepository } from '../../domain/repositories/request-item.repository';
import { recordRequestAudit } from '../services/request-audit';
import { NotFoundError, ValidationError } from '../../../../../shared/errors/api-errors';

export class AdvanceProcurementUseCase {
  constructor(
    private readonly procurementRepo: RequestProcurementRepository,
    private readonly itemRepo: RequestItemRepository,
  ) {}

  async execute(procurementId: string, status: ProcurementStatus, notes?: string | null): Promise<void> {
    const procurement = await this.procurementRepo.findById(procurementId);
    if (!procurement) throw new NotFoundError(`Procurement ${procurementId} not found`);

    const now = new Date();
    const fromStatus = procurement.procurementStatus;
    switch (status) {
      case 'ORDERED':
        procurement.markOrdered(now);
        break;
      case 'RECEIVED':
        procurement.markReceived(now);
        break;
      case 'FAILED':
        if (!notes || notes.trim() === '') {
          throw new ValidationError('FAILED procurement requires a reason (notes)');
        }
        procurement.markFailed(notes);
        break;
      default:
        throw new ValidationError(`Cannot advance procurement to ${status}`);
    }
    await this.procurementRepo.updateStatus(procurement.id, status, {
      orderedAt: procurement.orderedAt,
      receivedAt: procurement.receivedAt,
      notes: procurement.notes,
    });

    // Phase 4 §4.3 — append-only audit trail (best-effort).
    const item = await this.itemRepo.findById(procurement.itemId);
    if (item) {
      await recordRequestAudit({
        requestId: item.requestId,
        actorType: 'PROVIDER',
        action: 'PROCUREMENT_ADVANCED',
        fromStatus,
        toStatus: status,
        detail: { procurementId: procurement.id, orderId: procurement.orderId, notes: notes ?? null },
      });
    }
  }
}