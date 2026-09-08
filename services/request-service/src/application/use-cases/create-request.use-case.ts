/**
 * CreateRequestUseCase (Phase 1 §1.1)
 *
 * customerId ALWAYS comes from the auth context (injected by the controller),
 * never from the request body. Persists the request as SUBMITTED, emits
 * request.submitted, and posts a STATUS conversation message.
 */

import { RequestEntity, RequestDeliveryAddress } from '../../domain/entities/request.entity';
import { RequestRepository } from '../../domain/repositories/request.repository';
import { RequestMessageRepository } from '../../domain/repositories/request-message.repository';
import { RequestMessage } from '../../domain/entities/request-message.entity';
import { ValidationError } from '../../../../../shared/errors/api-errors';
import { publishRequestEvent } from '../../infrastructure/messaging/request-outbox';
import { recordRequestAudit } from '../services/request-audit';

export interface CreateRequestInput {
  title: string;
  description: string;
  deliveryAddress: RequestDeliveryAddress;
  preferredDeliveryDate?: string | null;
  budgetTzs?: number | null;
  attachments?: string[] | null;
}

export interface CreateRequestResult {
  request: ReturnType<RequestEntity['toJSON']>;
  messageId: string;
}

export class CreateRequestUseCase {
  constructor(
    private readonly requestRepo: RequestRepository,
    private readonly messageRepo: RequestMessageRepository,
  ) {}

  async execute(customerId: string, input: CreateRequestInput): Promise<CreateRequestResult> {
    if (!customerId) {
      throw new ValidationError('customerId is required (resolved from the auth context)');
    }
    if (!input.title || input.title.trim() === '') {
      throw new ValidationError('title is required');
    }
    if (!input.description || input.description.trim() === '') {
      throw new ValidationError('description is required');
    }
    const city = input.deliveryAddress?.city;
    const region = input.deliveryAddress?.region;
    if (!city || !region) {
      throw new ValidationError('deliveryAddress.city and deliveryAddress.region are required');
    }

    const request = RequestEntity.create({
      customerId,
      title: input.title.trim(),
      description: input.description.trim(),
      deliveryAddress: input.deliveryAddress,
      preferredDeliveryDate: input.preferredDeliveryDate ? new Date(input.preferredDeliveryDate) : null,
      budgetTzs: input.budgetTzs ?? null,
      attachments: input.attachments ?? null,
    });

    await this.requestRepo.save(request);
    await recordRequestAudit({
      requestId: request.id,
      actorType: 'CUSTOMER',
      actorId: customerId,
      action: 'STATUS_CHANGED',
      fromStatus: null,
      toStatus: 'SUBMITTED',
    });

    // STATUS message: archive the lifecycle step in the conversation (append-only).
    const message = RequestMessage.create({
      requestId: request.id,
      authorType: 'STATUS',
      body: 'Your request has been submitted and is awaiting Maysar assessment.',
    });
    try {
      await this.messageRepo.addMessage(message);
    } catch (err: any) {
      // Non-fatal: request already persisted; consumer can reconcile.
      console.error('[CreateRequestUseCase] Failed to post status message:', err?.message);
    }

    await publishRequestEvent('request.submitted', { requestId: request.id, customerId });

    return { request: request.toJSON(), messageId: message.id };
  }
}