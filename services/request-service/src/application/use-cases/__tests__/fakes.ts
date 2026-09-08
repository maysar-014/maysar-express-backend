/**
 * Shared in-memory fakes for request-service use-case tests.
 * The entity owns all invariants/state-machine logic; these fakes persist
 * whole entities and delegate lookup/pagination faithfully to the repo
 * contracts.
 */

import { RequestEntity, RequestStatus } from '../../../domain/entities/request.entity';
import { RequestMessage } from '../../../domain/entities/request-message.entity';
import { RequestQuote, QuoteStatus } from '../../../domain/entities/request-quote.entity';
import { RequestAssessment } from '../../../domain/entities/request-assessment.entity';
import { RequestAccessLink } from '../../../domain/entities/request-access-link.entity';
import { RequestRepository, RequestPage } from '../../../domain/repositories/request.repository';
import { RequestMessageRepository } from '../../../domain/repositories/request-message.repository';
import { RequestQuoteRepository } from '../../../domain/repositories/request-quote.repository';
import { RequestAssessmentRepository } from '../../../domain/repositories/request-assessment.repository';
import { RequestAccessLinkRepository } from '../../../domain/repositories/request-access-link.repository';

export class FakeRequestRepository implements RequestRepository {
  public rows = new Map<string, RequestEntity>();

  async save(request: RequestEntity): Promise<void> {
    this.rows.set(request.id, request);
  }
  async findById(id: string): Promise<RequestEntity | null> {
    return this.rows.get(id) ?? null;
  }
  async findByCustomerId(customerId: string): Promise<RequestPage> {
    const items = [...this.rows.values()]
      .filter((r) => r.customerId === customerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return { items, nextCursor: null, hasMore: false };
  }
  async findForProvider(providerId: string | null): Promise<RequestPage> {
    const items = [...this.rows.values()].filter((r) =>
      providerId ? r.assignedProviderId === providerId || r.assignedProviderId === null : r.assignedProviderId === null,
    );
    return { items, nextCursor: null, hasMore: false };
  }
  async updateStatus(
    id: string,
    status: RequestStatus,
    extra?: { unfulfillableReason?: string | null; orderId?: string | null; convertedQuoteId?: string | null },
  ): Promise<void> {
    const row = this.rows.get(id);
    if (row) {
      const data = row.toJSON();
      this.rows.set(id, new RequestEntity({ ...data, status, ...extra } as any));
    }
  }
  async assignProvider(id: string, providerId: string): Promise<void> {
    const row = this.rows.get(id);
    if (row) row.assignProvider(providerId);
  }
  async listAll(): Promise<RequestEntity[]> {
    return [...this.rows.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

export class FakeMessageRepository implements RequestMessageRepository {
  public rows: RequestMessage[] = [];
  async addMessage(message: RequestMessage): Promise<void> {
    this.rows.push(message);
  }
  async listByRequest(requestId: string): Promise<RequestMessage[]> {
    return this.rows
      .filter((m) => m.requestId === requestId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
}

export class FakeQuoteRepository implements RequestQuoteRepository {
  public rows = new Map<string, RequestQuote>();
  async save(quote: RequestQuote): Promise<void> {
    this.rows.set(quote.id, quote);
  }
  async updateStatus(id: string, status: QuoteStatus, extra?: { publishedAt?: Date | null }): Promise<void> {
    const q = this.rows.get(id);
    if (!q) return;
    const data = q.toJSON();
    this.rows.set(id, new RequestQuote({ ...data, status, publishedAt: extra?.publishedAt ?? data.publishedAt }));
  }
  async findById(id: string): Promise<RequestQuote | null> {
    return this.rows.get(id) ?? null;
  }
  async listByRequest(requestId: string): Promise<RequestQuote[]> {
    return [...this.rows.values()].filter((q) => q.requestId === requestId);
  }
  async listCustomerVisible(requestId: string): Promise<RequestQuote[]> {
    // Customer-visible = currently offered quotes only. SUPERSEDED rows are
    // preserved for history but must never be purchasable again (Phase 1 §B-6).
    return [...this.rows.values()].filter(
      (q) => q.requestId === requestId && ['PUBLISHED', 'ACCEPTED'].includes(q.status),
    );
  }
  async listAll(): Promise<RequestQuote[]> {
    return [...this.rows.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

export class FakeAssessmentRepository implements RequestAssessmentRepository {
  public rows: RequestAssessment[] = [];
  async save(assessment: RequestAssessment): Promise<void> {
    this.rows.push(assessment);
  }
  async findById(id: string): Promise<RequestAssessment | null> {
    return this.rows.find((a) => a.id === id) ?? null;
  }
  async listByRequest(requestId: string): Promise<RequestAssessment[]> {
    return this.rows.filter((a) => a.requestId === requestId);
  }
}

export class FakeLinkRepository implements RequestAccessLinkRepository {
  public rows = new Map<string, RequestAccessLink>();
  async save(link: RequestAccessLink): Promise<void> {
    this.rows.set(link.id, link);
  }
  async updateStatus(id: string, status: any, extra?: { usedAt?: Date | null }): Promise<void> {
    const l = this.rows.get(id);
    if (!l) return;
    const data = l.toJSON();
    this.rows.set(id, new RequestAccessLink({ ...data, status, usedAt: extra?.usedAt ?? data.usedAt }));
  }
  async findByHash(tokenHash: string): Promise<RequestAccessLink | null> {
    return [...this.rows.values()].find((l) => l.tokenHash === tokenHash) ?? null;
  }
  async findById(id: string): Promise<RequestAccessLink | null> {
    return this.rows.get(id) ?? null;
  }
  async listByQuote(quoteId: string): Promise<RequestAccessLink[]> {
    return [...this.rows.values()].filter((l) => l.quoteId === quoteId);
  }
}

/** Silence outbox writes in unit tests. */
export function silenceOutbox(): void {
  (globalThis as any).prisma = undefined;
}

// ── Phase 2 §2.1–2.3 fakes ─────────────────────────────────────────────────────

import { RequestItem } from '../../../domain/entities/request-item.entity';
import { RequestSupplier, MAYSAR_INVENTORY_SUPPLIER_ID } from '../../../domain/entities/request-supplier.entity';
import { RequestSource, SourceAvailability } from '../../../domain/entities/request-source.entity';
import { RequestProcurement, ProcurementStatus } from '../../../domain/entities/request-procurement.entity';
import { RequestItemRepository } from '../../../domain/repositories/request-item.repository';
import { RequestSupplierRepository } from '../../../domain/repositories/request-supplier.repository';
import { RequestSourceRepository } from '../../../domain/repositories/request-source.repository';
import { RequestProcurementRepository } from '../../../domain/repositories/request-procurement.repository';

export class FakeItemRepository implements RequestItemRepository {
  public rows = new Map<string, RequestItem>();
  async save(item: RequestItem): Promise<void> {
    this.rows.set(item.id, item);
  }
  async findById(id: string): Promise<RequestItem | null> {
    return this.rows.get(id) ?? null;
  }
  async findByRequestId(requestId: string): Promise<RequestItem[]> {
    return [...this.rows.values()].filter((i) => i.requestId === requestId);
  }
  async findByQuoteId(quoteId: string): Promise<RequestItem[]> {
    return [...this.rows.values()].filter((i) => i.quoteId === quoteId);
  }
}

export class FakeSupplierRepository implements RequestSupplierRepository {
  public rows = new Map<string, RequestSupplier>();

  constructor() {
    // Canonical MAYSAR_INVENTORY supplier always present (mirrors the
    // production migration seed).
    this.rows.set(
      MAYSAR_INVENTORY_SUPPLIER_ID,
      new RequestSupplier({
        id: MAYSAR_INVENTORY_SUPPLIER_ID,
        name: 'Maysar Own Inventory',
        contact: { phone: 'internal' },
        source: 'KNOWN',
        discoveredViaRequestId: null,
        isActive: true,
        notes: 'Canonical inventory supplier',
        createdAt: new Date(),
      }),
    );
  }

  async save(supplier: RequestSupplier): Promise<void> {
    this.rows.set(supplier.id, supplier);
  }
  async findById(id: string): Promise<RequestSupplier | null> {
    return this.rows.get(id) ?? null;
  }
  async list(filter?: { id?: string; isActive?: boolean }): Promise<RequestSupplier[]> {
    return [...this.rows.values()].filter((s) => {
      if (filter?.id && s.id !== filter.id) return false;
      if (filter?.isActive !== undefined && s.isActive !== filter.isActive) return false;
      return true;
    });
  }
  async listDiscoveredByRequest(requestId: string): Promise<RequestSupplier[]> {
    return [...this.rows.values()].filter((s) => s.source === 'DISCOVERED' && s.discoveredViaRequestId === requestId);
  }
}

export class FakeSourceRepository implements RequestSourceRepository {
  public rows = new Map<string, RequestSource>();
  async save(source: RequestSource): Promise<void> {
    this.rows.set(source.id, source);
  }
  async findById(id: string): Promise<RequestSource | null> {
    return this.rows.get(id) ?? null;
  }
  async findByItemId(itemId: string): Promise<RequestSource[]> {
    return [...this.rows.values()].filter((s) => s.itemId === itemId);
  }
  async listBySupplierId(supplierId: string): Promise<RequestSource[]> {
    return [...this.rows.values()].filter((s) => s.supplierId === supplierId);
  }
  async updateAvailability(id: string, availability: SourceAvailability, availableUntil?: Date | null): Promise<void> {
    const s = this.rows.get(id);
    if (!s) return;
    const data = s.toJSON();
    this.rows.set(
      id,
      new RequestSource({
        ...data,
        availability,
        availableUntil: availableUntil !== undefined ? availableUntil : data.availableUntil,
      }),
    );
  }
}

export class FakeProcurementRepository implements RequestProcurementRepository {
  public rows = new Map<string, RequestProcurement>();
  async save(procurement: RequestProcurement): Promise<void> {
    this.rows.set(procurement.id, procurement);
  }
  async findById(id: string): Promise<RequestProcurement | null> {
    return this.rows.get(id) ?? null;
  }
  async findByOrderId(orderId: string): Promise<RequestProcurement[]> {
    return [...this.rows.values()].filter((p) => p.orderId === orderId);
  }
  async updateStatus(
    id: string,
    status: ProcurementStatus,
    extra?: { orderedAt?: Date | null; receivedAt?: Date | null; notes?: string | null },
  ): Promise<void> {
    const p = this.rows.get(id);
    if (!p) return;
    const data = p.toJSON();
    this.rows.set(
      id,
      new RequestProcurement({
        ...data,
        procurementStatus: status,
        orderedAt: extra?.orderedAt !== undefined ? extra.orderedAt : data.orderedAt,
        receivedAt: extra?.receivedAt !== undefined ? extra.receivedAt : data.receivedAt,
        notes: extra?.notes !== undefined ? extra.notes : data.notes,
      }),
    );
  }
}

/**
 * Attach one source per item of a quote (test seed helper — mirrors the
 * provider confirming availability before publishing, §2.2).
 */
export async function confirmQuoteSources(
  itemRepo: FakeItemRepository,
  sourceRepo: FakeSourceRepository,
  supplierRepo: FakeSupplierRepository,
  quoteId: string,
  availability: SourceAvailability = 'CONFIRMED',
): Promise<string[]> {
  const items = await itemRepo.findByQuoteId(quoteId);
  const ids: string[] = [];
  let supplierId: string | null = null;
  if (items.some((i) => i.sourceType !== 'MAYSAR_INVENTORY')) {
    let known = (await supplierRepo.list()).find(
      (s) => s.source === 'KNOWN' && s.id !== MAYSAR_INVENTORY_SUPPLIER_ID,
    );
    if (!known) {
      known = RequestSupplier.create({ name: 'Test Supplier A', contact: { phone: '+255700000000' } });
      await supplierRepo.save(known);
    }
    supplierId = known.id;
  }
  for (const item of items) {
    const src = RequestSource.create({
      itemId: item.id,
      supplierId: item.sourceType === 'MAYSAR_INVENTORY' ? null : supplierId,
      agreedPriceTzs: item.unitPriceTzs,
      availability,
    });
    await sourceRepo.save(src);
    ids.push(src.id);
  }
  return ids;
}