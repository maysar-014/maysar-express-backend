/**
 * ListMessagesUseCase (Phase 1 §1.2) — access-controlled, chronological.
 */

import { RequestMessage } from '../../domain/entities/request-message.entity';
import { RequestRepository } from '../../domain/repositories/request.repository';
import { RequestMessageRepository } from '../../domain/repositories/request-message.repository';
import { ForbiddenError, NotFoundError } from '../../../../../shared/errors/api-errors';

export class ListMessagesUseCase {
  constructor(
    private readonly requestRepo: RequestRepository,
    private readonly messageRepo: RequestMessageRepository,
  ) {}

  async execute(
    actor: { id: string; role: 'customer' | 'provider' },
    requestId: string,
    opts?: { limit?: number; cursor?: string | null },
  ): Promise<RequestMessage[]> {
    const request = await this.requestRepo.findById(requestId);
    if (!request) throw new NotFoundError(`Request ${requestId} not found`);

    if (actor.role === 'customer' && request.customerId !== actor.id) {
      throw new ForbiddenError('You do not have access to this request');
    }
    if (actor.role === 'provider' && request.assignedProviderId !== actor.id) {
      throw new ForbiddenError('Only the assigned provider can view this request');
    }

    return this.messageRepo.listByRequest(requestId, opts);
  }
}