/**
 * PostMessageUseCase (Phase 1 §1.2)
 *
 * Customer posts CUSTOMER messages on their own request; the assigned
 * provider posts MAYSAR_PROVIDER. Cross-author-type posts are rejected;
 * authorType is never taken from the request body.
 */

import { RequestMessage } from '../../domain/entities/request-message.entity';
import { RequestAuthorType } from '../../domain/entities/request.entity';
import { RequestEntity } from '../../domain/entities/request.entity';
import { RequestRepository } from '../../domain/repositories/request.repository';
import { RequestMessageRepository } from '../../domain/repositories/request-message.repository';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../../../shared/errors/api-errors';
import { recordRequestAudit } from '../services/request-audit';

export interface PostMessageInput {
  body: string;
  attachments?: string[] | null;
}

export class PostMessageUseCase {
  constructor(
    private readonly requestRepo: RequestRepository,
    private readonly messageRepo: RequestMessageRepository,
  ) {}

  async execute(
    actor: { id: string; role: 'customer' | 'provider' },
    requestId: string,
    input: PostMessageInput,
  ): Promise<RequestMessage> {
    const request = await this.requestRepo.findById(requestId);
    if (!request) throw new NotFoundError(`Request ${requestId} not found`);

    const authorType: RequestAuthorType =
      actor.role === 'provider' ? 'MAYSAR_PROVIDER' : 'CUSTOMER';

    if (actor.role === 'customer' && request.customerId !== actor.id) {
      throw new ForbiddenError('You do not have access to this request');
    }
    if (actor.role === 'provider' && request.assignedProviderId !== actor.id) {
      throw new ForbiddenError('Only the assigned provider can message this request');
    }
    if (!input.body || input.body.trim() === '') {
      throw new ValidationError('body is required');
    }

    const message = RequestMessage.create({
      requestId: request.id,
      authorType,
      authorId: actor.id,
      body: input.body.trim(),
      attachments: input.attachments ?? null,
    });
    await this.messageRepo.addMessage(message);
    await recordRequestAudit({
      requestId: request.id,
      actorType: actor.role === 'provider' ? 'PROVIDER' : 'CUSTOMER',
      actorId: actor.id,
      action: 'MESSAGE_POSTED',
      detail: { messageId: message.id },
    });
    return message;
  }
}