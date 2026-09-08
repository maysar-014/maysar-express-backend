/**
 * GenerateAssessmentLinkUseCase (Phase 1 §1.5)
 *
 * THE §B-4 fulfillment gate lives here. A link is generated ONLY when:
 *   - request status = QUOTE_PUBLISHED
 *   - quote status  = PUBLISHED
 *   - quote.validUntil is in the future
 *
 * No link is generated otherwise — regardless of any UI state. The raw token
 * is returned exactly once; only its SHA-256 hash is persisted (§B-7).
 */

import { RequestAccessLink, generateRawToken, hashToken } from '../../domain/entities/request-access-link.entity';
import { RequestRepository } from '../../domain/repositories/request.repository';
import { RequestQuoteRepository } from '../../domain/repositories/request-quote.repository';
import { RequestAccessLinkRepository } from '../../domain/repositories/request-access-link.repository';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../../../shared/errors/api-errors';
import { recordRequestAudit } from '../services/request-audit';

export interface GenerateAssessmentLinkResult {
  /** The full secure URL the customer opens. Shown exactly once. */
  url: string;
  token: string;
  linkId: string;
  expiresAt: string;
}

export class GenerateAssessmentLinkUseCase {
  constructor(
    private readonly requestRepo: RequestRepository,
    private readonly quoteRepo: RequestQuoteRepository,
    private readonly linkRepo: RequestAccessLinkRepository,
    private readonly baseUrl: string,
  ) {}

  async execute(providerId: string, quoteId: string, ttlMs = 7 * 24 * 60 * 60 * 1000): Promise<GenerateAssessmentLinkResult> {
    if (ttlMs <= 0) {
      throw new ValidationError('Assessment link TTL must be positive');
    }
    const quote = await this.quoteRepo.findById(quoteId);
    if (!quote) throw new NotFoundError(`Quote ${quoteId} not found`);
    if (quote.createdByProviderId !== providerId) {
      throw new ForbiddenError('Only the quote creator can generate an assessment link');
    }
    if (quote.status !== 'PUBLISHED') {
      throw new ValidationError('Assessment link requires a PUBLISHED quote', { quoteStatus: quote.status });
    }

    const request = await this.requestRepo.findById(quote.requestId);
    if (!request) throw new NotFoundError(`Request ${quote.requestId} not found`);
    if (request.status !== 'QUOTE_PUBLISHED') {
      throw new ValidationError('Assessment link requires the request to be QUOTE_PUBLISHED', {
        requestStatus: request.status,
      });
    }
    if (quote.validUntil <= new Date()) {
      throw new ValidationError('Assessment link requires an unexpired quote — the quote has expired, please re-quote');
    }

    const rawToken = generateRawToken();
    const link = RequestAccessLink.create({
      requestId: request.id,
      quoteId: quote.id,
      customerId: request.customerId,
      expiresAt: new Date(Date.now() + ttlMs),
      rawToken,
    });

    await this.linkRepo.save(link);
    await recordRequestAudit({
      requestId: link.requestId,
      actorType: 'PROVIDER',
      actorId: providerId,
      action: 'LINK_GENERATED',
      detail: { linkId: link.id, quoteId: link.quoteId },
    });

    const safeUrlBase = (this.baseUrl || process.env.REQUEST_ASSESS_BASE_URL || '/api/request').replace(/\/$/, '');
    return {
      url: `${safeUrlBase}/requests/assess/${rawToken}`,
      token: rawToken,
      linkId: link.id,
      expiresAt: link.expiresAt.toISOString(),
    };
  }
}

/** Proof-harness helper: hash a raw token so tests never persist plaintext. */
export { hashToken };