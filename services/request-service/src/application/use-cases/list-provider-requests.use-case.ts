/**
 * ListProviderRequestsUseCase (Phase 1 §1.3)
 * Assigned + pending (unassigned) requests for the provider queue.
 */

import { RequestPage } from '../../domain/repositories/request.repository';
import { RequestRepository } from '../../domain/repositories/request.repository';

export interface ListProviderRequestsInput {
  limit?: number;
  cursor?: string | null;
}

export class ListProviderRequestsUseCase {
  constructor(private readonly requestRepo: RequestRepository) {}

  async execute(providerId: string, input: ListProviderRequestsInput): Promise<RequestPage> {
    return this.requestRepo.findForProvider(providerId, {
      limit: input.limit,
      cursor: input.cursor,
    });
  }
}