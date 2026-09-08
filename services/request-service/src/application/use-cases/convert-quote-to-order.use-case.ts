/**
 * ConvertQuoteToOrderUseCase (Phase 1 §1.6)
 *
 * The idempotent Request → Order conversion. Inside ONE transaction:
 *   1. Re-validates the full §1.5 fulfillment gate (link active + unexpired,
 *      request QUOTE_PUBLISHED, quote PUBLISHED + unexpired).
 *   2. Creates a NORMAL Order_Order + Order_OrderItem rows (same tables/fields
 *      the order-service writes). sellerId = Maysar reseller account. Items
 *      carry `requestQuoteId` and `requestId`; a synthetic `productId` is used
 *      for non-catalog request items (§B-1: catalog is never a prerequisite).
 *   3. Marks quote CONVERTED, request CONVERTED (orderId + convertedQuoteId),
 *      link USED.
 *   4. Posts an ORDER conversation message + emits `request.converted`.
 *
 * Idempotency: `Order_Order.requestQuoteId` is UNIQUE. A second conversion of
 * the same quote — double-click, refresh, double link-open, network retry —
 * returns the EXISTING order (200) instead of creating another.
 */

import { makeId, getModelPrefix } from '../../../../../shared/ids/id';
import { RequestEntity } from '../../domain/entities/request.entity';
import { RequestQuote } from '../../domain/entities/request-quote.entity';
import { RequestAccessLink, hashToken } from '../../domain/entities/request-access-link.entity';
import { RequestMessage } from '../../domain/entities/request-message.entity';
import { RequestProcurement } from '../../domain/entities/request-procurement.entity';
import { MAYSAR_INVENTORY_SUPPLIER_ID } from '../../domain/entities/request-supplier.entity';
import { RequestRepository } from '../../domain/repositories/request.repository';
import { RequestQuoteRepository } from '../../domain/repositories/request-quote.repository';
import { RequestAccessLinkRepository } from '../../domain/repositories/request-access-link.repository';
import { RequestMessageRepository } from '../../domain/repositories/request-message.repository';
import { RequestItemRepository } from '../../domain/repositories/request-item.repository';
import { RequestSourceRepository } from '../../domain/repositories/request-source.repository';
import { publishRequestEvent } from '../../infrastructure/messaging/request-outbox';
import { LinkResolutionError, ResolveAssessmentLinkUseCase, LINK_ERRORS } from './resolve-assessment-link.use-case';
import { recordRequestAudit } from '../services/request-audit';

export interface ConvertQuoteToOrderResult {
  orderId: string;
  created: boolean;
  requestId: string;
  quoteId: string;
}

/** Maysar reseller account used as `sellerId` on Request orders (§B-2). */
export function maysarResellerSellerId(): string {
  return process.env.MAYSAR_RESELLER_SELLER_ID || 'seller_maysar_reseller';
}

export class ConvertQuoteToOrderUseCase {
  constructor(
    private readonly requestRepo: RequestRepository,
    private readonly quoteRepo: RequestQuoteRepository,
    private readonly linkRepo: RequestAccessLinkRepository,
    private readonly messageRepo: RequestMessageRepository,
    private readonly resolver: ResolveAssessmentLinkUseCase,
    private readonly prisma: any = (globalThis as any).prisma,
    private readonly itemRepo?: RequestItemRepository,
    private readonly sourceRepo?: RequestSourceRepository,
  ) {}

  async execute(params: { token: string }): Promise<ConvertQuoteToOrderResult> {
    const prisma = this.prisma || (globalThis as any).prisma;
    if (!prisma) throw new Error('ConvertQuoteToOrderUseCase requires a prisma client');

    // ── Idempotency look-up BEFORE the gate (§1.6) ──────────────────────────
    // A repeat conversion (double-click/refresh/retry) arrives with a USED
    // link — the gate would reject it before the idempotency check. Resolve
    // the link leniently first; if its quote is already converted, return the
    // existing order. Only fresh conversions pass through the full §1.5 gate.
    const link = await this.linkRepo.findByHash(hashToken(params.token));
    if (link) {
      const existing = await this.findExistingOrderPrisma(prisma, link.quoteId);
      if (existing) {
        return { orderId: existing.id, created: false, requestId: link.requestId, quoteId: link.quoteId };
      }
    }

    // ── Full §1.5 gate re-validation ────────────────────────────────────────
    const { quote, request } = await this.resolveGate(params.token);
    return this.convert(prisma, link!, quote, request);
  }

  private async convert(
    prisma: any,
    link: RequestAccessLink,
    quote: RequestQuote,
    request: RequestEntity,
  ): Promise<ConvertQuoteToOrderResult> {
    try {
      const result = await prisma.$transaction(async (tx: any) => {
        // Re-check inside the tx for concurrent double-click safety.
        const dup = await tx.order_Order?.findUnique?.({
          where: { requestQuoteId: quote.id },
        });
        if (dup) return { orderId: dup.id as string, created: false };

        const orderId = makeId(getModelPrefix('Order_Order'));
        const orderItems = quote.items.map((item, index) => ({
          id: makeId(getModelPrefix('Order_OrderItem')),
          // Synthetic productId for non-catalog request items (§B-1).
          productId: `req-item-${quote.id}-${index}`,
          // Free-text description — the buyer's order must show what they
          // bought even though no catalog row exists for this item (§B-1).
          description: item.description,
          quantity: item.quantity,
          price: item.unitPriceTzs,
          currency: 'TZS',
          weight: 0.5, // conservative default; refined in Phase 2 Request_Item
        }));

        await tx.order_Order?.create?.({
          data: {
            id: orderId,
            trackingNumber: null,
            buyerId: request.customerId,
            sellerId: maysarResellerSellerId(),
            status: 'PENDING',
            paymentMethod: 'COD',
            totalAmount: quote.sellingPriceTzs,
            currency: 'TZS',
            totalWeight: orderItems.reduce((sum, it) => sum + it.weight * it.quantity, 0),
            deliveryAddress: request.deliveryAddress,
            orderSource: 'DIRECT',
            requestQuoteId: quote.id,
            items: { create: orderItems },
          },
        });

        // Status transitions go through the repositories (domain layer) so they
        // apply consistently in tests (fakes) and production (Prisma).
        await this.quoteRepo.updateStatus(quote.id, 'CONVERTED');
        // Phase 3 — exactly one offer can become an order: converting this
        // quote supersedes EVERY sibling PUBLISHED quote of the same request.
        // SUPERSEDED rows stay in the DB for audit but are never purchasable again.
        const siblings = await this.quoteRepo.listByRequest(request.id);
        for (const sibling of siblings) {
          if (sibling.id !== quote.id && sibling.status === 'PUBLISHED') {
            await this.quoteRepo.updateStatus(sibling.id, 'SUPERSEDED');
          }
        }
        await this.requestRepo.updateStatus(request.id, 'CONVERTED', { orderId, convertedQuoteId: quote.id });
        await this.linkRepo.updateStatus(link.id, 'USED', { usedAt: new Date() });

        // §2.3 — one Request_Procurement row per item, preserving the exact
        // Order → Item → Supplier map from the confirmed sources. Maysar-
        // internal; the customer never sees these rows.
        await this.createProcurements(tx, quote.id, orderId);

        return { orderId, created: true };
      });

      await this.postConvertSideEffects(request.id, result.orderId);
      await recordRequestAudit({
        requestId: request.id,
        actorType: 'SYSTEM',
        action: 'CONVERTED',
        toStatus: 'CONVERTED',
        detail: { orderId: result.orderId, quoteId: quote.id },
      });
      return { requestId: request.id, quoteId: quote.id, ...result };
    } catch (err: any) {
      // Unique-constraint race: another conversion won between the lookup and
      // the tx — treat as the idempotent path.
      if (err?.message?.includes('requestQuoteId') || err?.code === 'P2002') {
        const existingOrder = await this.findExistingOrderPrisma(prisma, quote.id);
        if (existingOrder) {
          return { orderId: existingOrder.id, created: false, requestId: request.id, quoteId: quote.id };
        }
      }
      throw err;
    }
  }

  /**
   * §2.3 — for each Request_Item on the quote, create one Request_Procurement
   * row from the item's usable (CONFIRMED, unexpired) source. MAYSAR_INVENTORY
   * items (no supplier) use the canonical Maysar inventory supplier row.
   * Non-fatal on infrastructure gaps: procurement is internal bookkeeping and
   * must never fail the customer's order creation.
   */
  private async createProcurements(tx: any, quoteId: string, orderId: string): Promise<void> {
    if (!this.itemRepo || !this.sourceRepo) return;
    try {
      const items = await this.itemRepo.findByQuoteId(quoteId);
      for (const item of items) {
        const sources = await this.sourceRepo.findByItemId(item.id);
        const usable = sources.filter((s) => s.isUsable());
        const chosen = usable[0] ?? null; // first-created CONFIRMED source
        const supplierId = chosen?.supplierId ?? MAYSAR_INVENTORY_SUPPLIER_ID;
        const procurement = RequestProcurement.create({
          orderId,
          itemId: item.id,
          supplierId,
          sourceId: chosen?.id ?? null,
          agreedPriceTzs: chosen?.agreedPriceTzs ?? item.unitPriceTzs,
        });
        await tx.request_Procurement?.create?.({ data: procurement.toJSON() });
      }
    } catch (err: any) {
      console.error('[ConvertQuoteToOrderUseCase] procurement generation failed (order kept):', err?.message);
    }
  }

  private async postConvertSideEffects(requestId: string, orderId: string): Promise<void> {
    try {
      const message = RequestMessage.create({
        requestId,
        authorType: 'ORDER',
        body: `Your order ${orderId} has been created.`,
      });
      await this.messageRepo.addMessage(message);
    } catch (err: any) {
      console.error('[ConvertQuoteToOrderUseCase] Failed to post ORDER message:', err?.message);
    }
    await publishRequestEvent('request.converted', { requestId, orderId });
  }

  /** Resolve + re-validate the token against the §1.5 gate. */
  private async resolveGate(token: string): Promise<{
    link: RequestAccessLink;
    quote: RequestQuote;
    request: RequestEntity;
  }> {
    const resolved = await this.resolver.execute(token);
    const [request, quote, link] = await Promise.all([
      this.requestRepo.findById(resolved.requestId),
      this.quoteRepo.findById(resolved.quoteId),
      this.linkRepo.findByHash(hashToken(token)),
    ]);
    if (!request || !quote || !link) {
      throw new LinkResolutionError(LINK_ERRORS.NOT_FOUND, 'Request/quote/link not found');
    }
    return { link, quote, request };
  }

  private async findExistingOrderPrisma(prisma: any, quoteId: string): Promise<any | null> {
    try {
      return (await prisma.order_Order?.findUnique?.({
        where: { requestQuoteId: quoteId },
      })) ?? null;
    } catch (err: any) {
      // Column/index absent in older DBs — treat as no existing order.
      console.warn('[ConvertQuoteToOrderUseCase] findExistingOrder failed:', err?.message);
      return null;
    }
  }
}