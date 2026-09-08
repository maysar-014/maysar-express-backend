/**
 * GetRequestUseCase (Phase 1 §1.1) — access-controlled read.
 * A customer can only ever read their own request.
 */

import { RequestEntity } from '../../domain/entities/request.entity';
import { RequestRepository } from '../../domain/repositories/request.repository';
import { ForbiddenError, NotFoundError } from '../../../../../shared/errors/api-errors';

export class GetRequestUseCase {
  constructor(private readonly requestRepo: RequestRepository) {}

  async execute(customerId: string, requestId: string): Promise<RequestEntity> {
    const request = await this.requestRepo.findById(requestId);
    if (!request) throw new NotFoundError(`Request ${requestId} not found`);
    if (request.customerId !== customerId) {
      throw new ForbiddenError('You do not have access to this request');
    }
    return request;
  }
}