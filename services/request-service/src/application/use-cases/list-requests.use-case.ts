/**
 * ListRequestsUseCase (Phase 1 §1.1) — customer's own requests, paginated.
 */

import { RequestRepository, RequestPage } from '../../domain/repositories/request.repository';

export interface ListRequestsInput {
  limit?: number;
  cursor?: string | null;
}

export class ListRequestsUseCase {
  constructor(private readonly requestRepo: RequestRepository) {}

  async execute(customerId: string, input: ListRequestsInput): Promise<RequestPage> {
    return this.requestRepo.findByCustomerId(customerId, {
      limit: input.limit,
      cursor: input.cursor,
    });
  }
}