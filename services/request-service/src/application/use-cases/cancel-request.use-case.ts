/**
 * CancelRequestUseCase (Phase 1 §1.1)
 *
 * Customer-cancellable only from SUBMITTED | ASSESSING | NEEDS_CLARIFICATION |
 * QUOTE_PUBLISHED (enforced by the entity state machine).
 */

import { RequestEntity } from '../../domain/entities/request.entity';
import { RequestRepository } from '../../domain/repositories/request.repository';
import { RequestMessageRepository } from '../../domain/repositories/request-message.repository';
import { RequestMessage } from '../../domain/entities/request-message.entity';
import { ForbiddenError, NotFoundError } from '../../../../../shared/errors/api-errors';
import { publishRequestEvent } from '../../infrastructure/messaging/request-outbox';
import { recordRequestAudit } from '../services/request-audit';

export class CancelRequestUseCase {
  constructor(
    private readonly requestRepo: RequestRepository,
    private readonly messageRepo: RequestMessageRepository,
  ) {}

  async execute(customerId: string, requestId: string): Promise<RequestEntity> {
    const request = await this.requestRepo.findById(requestId);
    if (!request) throw new NotFoundError(`Request ${requestId} not found`);
    if (request.customerId !== customerId) {
      throw new ForbiddenError('You do not have access to this request');
    }

    request.markCancelled();
    await this.requestRepo.save(request);
    await recordRequestAudit({
      requestId: request.id,
      actorType: 'CUSTOMER',
      actorId: customerId,
      action: 'CANCELLED',
      toStatus: 'CANCELLED',
    });

    try {
      const message = RequestMessage.create({
        requestId: request.id,
        authorType: 'STATUS',
        body: 'Your request has been cancelled.',
      });
      await this.messageRepo.addMessage(message);
    } catch (err: any) {
      console.error('[CancelRequestUseCase] Failed to post status message:', err?.message);
    }

    await publishRequestEvent('request.cancelled', { requestId: request.id, customerId });
    return request;
  }
}