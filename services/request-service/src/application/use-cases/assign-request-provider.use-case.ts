/**
 * AssignRequestProviderUseCase (Phase 1 §1.3) — admin/ops only.
 * Sets the assigned provider on a request.
 */

import { RequestEntity } from '../../domain/entities/request.entity';
import { RequestRepository } from '../../domain/repositories/request.repository';
import { NotFoundError, ValidationError } from '../../../../../shared/errors/api-errors';
import { recordRequestAudit } from '../services/request-audit';

export class AssignRequestProviderUseCase {
  constructor(private readonly requestRepo: RequestRepository) {}

  async execute(adminActorId: string, requestId: string, providerId: string): Promise<RequestEntity> {
    if (!adminActorId) throw new ValidationError('admin actor id is required (auth context)');
    if (!providerId) throw new ValidationError('providerId is required');

    const request = await this.requestRepo.findById(requestId);
    if (!request) throw new NotFoundError(`Request ${requestId} not found`);

    request.assignProvider(providerId);
    await this.requestRepo.save(request);
    await recordRequestAudit({
      requestId: request.id,
      actorType: 'PROVIDER',
      actorId: adminActorId,
      action: 'STATUS_CHANGED',
      toStatus: 'ASSIGNED',
      detail: { role: 'admin' },
    });
    return request;
  }
}