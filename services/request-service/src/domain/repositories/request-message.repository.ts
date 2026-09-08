/**
 * RequestMessageRepository (Phase 1 §1.2) — append-only.
 * There is deliberately no update/delete path: history is preserved by design.
 */

import { RequestMessage } from '../entities/request-message.entity';

export interface RequestMessageRepository {
  addMessage(message: RequestMessage): Promise<void>;
  /** Chronological, paginated. */
  listByRequest(requestId: string, opts?: { limit?: number; cursor?: string | null }): Promise<RequestMessage[]>;
}