/**
 * QuoteValidationService
 *
 * Service-to-service client that validates delivery quotes with the logistics-service
 * before checkout is allowed to proceed. Resolves the authoritative shipping fee
 * from the server instead of trusting the client-supplied value.
 *
 * Endpoints consumed:
 *   GET  {LOGISTICS_SERVICE_URL}/api/internal/quotes/:quoteId          — validate
 *   PATCH {LOGISTICS_SERVICE_URL}/api/internal/quotes/:quoteId/consume  — mark consumed
 */

export type QuoteRejectionReason =
  | 'NOT_FOUND'
  | 'EXPIRED'
  | 'CONSUMED'
  | 'DELIVERY_UNAVAILABLE'
  | 'SERVICE_UNAVAILABLE';

export interface QuoteValidationResult {
  valid: boolean;
  /** Authoritative delivery fee (TZS). Present only when valid === true. */
  deliveryFee?: number;
  /** Pricing config version used for auditing. Present only when valid === true. */
  pricingVersion?: number;
  /** Reason the quote was rejected. Present only when valid === false. */
  rejectionReason?: QuoteRejectionReason;
}

export class QuoteValidationService {
  private readonly logisticsBaseUrl: string;

  constructor(logisticsBaseUrl?: string) {
    this.logisticsBaseUrl = (
      logisticsBaseUrl ??
      process.env.LOGISTICS_SERVICE_URL ??
      'http://localhost:3000'
    ).replace(/\/+$/, '');
  }

  /**
   * Calls the logistics-service to validate a quote by ID.
   * Returns the authoritative delivery fee if the quote is valid and active.
   */
  async validate(quoteId: string): Promise<QuoteValidationResult> {
    const url = `${this.logisticsBaseUrl}/api/logistics/internal/quotes/${encodeURIComponent(quoteId)}`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: { 'content-type': 'application/json' },
      });
    } catch (networkErr: any) {
      // Network-level failure — treat as service unavailable
      return { valid: false, rejectionReason: 'SERVICE_UNAVAILABLE' };
    }

    if (response.status === 404) {
      return { valid: false, rejectionReason: 'NOT_FOUND' };
    }

    if (!response.ok) {
      return { valid: false, rejectionReason: 'SERVICE_UNAVAILABLE' };
    }

    let body: any;
    try {
      body = await response.json();
    } catch {
      return { valid: false, rejectionReason: 'SERVICE_UNAVAILABLE' };
    }

    const data = body?.data;
    if (!data) {
      return { valid: false, rejectionReason: 'SERVICE_UNAVAILABLE' };
    }

    const status: string = data.status;

    switch (status) {
      case 'ACTIVE':
        return {
          valid: true,
          deliveryFee: typeof data.deliveryFee === 'number' ? data.deliveryFee : Number(data.deliveryFee),
          pricingVersion: typeof data.pricingVersion === 'number' ? data.pricingVersion : Number(data.pricingVersion),
        };

      case 'EXPIRED':
        return { valid: false, rejectionReason: 'EXPIRED' };

      case 'CONSUMED':
        return { valid: false, rejectionReason: 'CONSUMED' };

      case 'DELIVERY_UNAVAILABLE':
        return { valid: false, rejectionReason: 'DELIVERY_UNAVAILABLE' };

      default:
        // Unknown status — treat as unavailable
        return { valid: false, rejectionReason: 'SERVICE_UNAVAILABLE' };
    }
  }

  /**
   * Marks the quote as consumed after a successful checkout.
   * Fire-and-forget on failure — the logistics-service will eventually GC stale quotes.
   */
  async markConsumed(quoteId: string): Promise<void> {
    const url = `${this.logisticsBaseUrl}/api/logistics/internal/quotes/${encodeURIComponent(quoteId)}/consume`;

    try {
      await fetch(url, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
      });
    } catch {
      // Non-fatal — log but don't crash checkout
    }
  }
}
