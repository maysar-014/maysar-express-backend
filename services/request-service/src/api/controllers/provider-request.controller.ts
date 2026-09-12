/**
 * ProviderRequestController (Phase 1 §1.3–§1.5) — provider/ops surface.
 *
 * Role enforcement (`provider` / `admin`) is applied by route middleware in
 * request.routes.ts (requireRole) — the providerId still comes from the auth
 * context for ownership checks, never from the body.
 */

import { Request, Response } from 'express';
import { ListProviderRequestsUseCase } from '../../application/use-cases/list-provider-requests.use-case';
import { AssessRequestUseCase } from '../../application/use-cases/assess-request.use-case';
import { AssignRequestProviderUseCase } from '../../application/use-cases/assign-request-provider.use-case';
import { CreateQuoteUseCase } from '../../application/use-cases/create-quote.use-case';
import { PublishQuoteUseCase } from '../../application/use-cases/publish-quote.use-case';
import { GetProviderQuoteDetailUseCase } from '../../application/use-cases/get-provider-quote-detail.use-case';
import { GenerateAssessmentLinkUseCase } from '../../application/use-cases/generate-assessment-link.use-case';
import { ListMessagesUseCase } from '../../application/use-cases/list-messages.use-case';
import { RegisterSupplierUseCase } from '../../application/use-cases/register-supplier.use-case';
import { ListSuppliersUseCase } from '../../application/use-cases/list-suppliers.use-case';
import { SetItemSourceUseCase } from '../../application/use-cases/set-item-source.use-case';
import { ListProcurementUseCase } from '../../application/use-cases/list-procurement.use-case';
import { AdvanceProcurementUseCase } from '../../application/use-cases/advance-procurement.use-case';
import { MarkSupplierInviteUseCase } from '../../application/use-cases/mark-supplier-invite.use-case';
import { listRequestAudit } from '../../application/services/request-audit';
import { GetDemandAnalyticsUseCase } from '../../application/use-cases/get-demand-analytics.use-case';

export class ProviderRequestController {
  constructor(
    private readonly listProviderRequests: ListProviderRequestsUseCase,
    private readonly assessRequest: AssessRequestUseCase,
    private readonly assignProvider: AssignRequestProviderUseCase,
    private readonly _createQuote: CreateQuoteUseCase,
    private readonly _publishQuote: PublishQuoteUseCase,
    private readonly getQuoteDetail: GetProviderQuoteDetailUseCase,
    private readonly generateLink: GenerateAssessmentLinkUseCase,
    private readonly _listMessages: ListMessagesUseCase,
    private readonly registerSupplier: RegisterSupplierUseCase,
    private readonly _listSuppliers: ListSuppliersUseCase,
    private readonly setItemSource: SetItemSourceUseCase,
    private readonly listProcurement: ListProcurementUseCase,
    private readonly advanceProcurement: AdvanceProcurementUseCase,
    private readonly markSupplierInvite: MarkSupplierInviteUseCase,
    private readonly getDemandAnalytics: GetDemandAnalyticsUseCase,
  ) {}

  private actorIds(req: Request): { userId: string; roles: string[] } {
    const user = (req as any).user;
    return { userId: user?.userId ?? '', roles: user?.roles ?? [] };
  }

  async list(_req: Request, res: Response): Promise<void> {
    try {
      const data = await this.listProviderRequests.execute(this.actorIds(_req).userId, {
        limit: Number(_req.query.limit ?? 20),
        cursor: typeof _req.query.cursor === 'string' ? _req.query.cursor : null,
      });
      res.json({ success: true, data, timestamp: new Date() });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /** Provider detail — includes internal fields (assessments, procurement). */
  async get(req: Request, res: Response): Promise<void> {
    try {
      const actorId = this.actorIds(req).userId;
      const { GetProviderRequestDetailUseCase } = await import('../../application/use-cases/get-provider-request-detail.use-case');
      const { PrismaRequestAssessmentRepository } = await import('../../infrastructure/repositories/prisma-request-assessment.repository');
      const requestRepo = new (await import('../../infrastructure/repositories/prisma-request.repository')).PrismaRequestRepository();
      const assessmentRepo = new PrismaRequestAssessmentRepository();
      const useCase = new GetProviderRequestDetailUseCase(requestRepo, assessmentRepo);
      const data = await useCase.execute(actorId, req.params.requestId);
      res.json({ success: true, data, timestamp: new Date() });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async assess(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.assessRequest.execute(this.actorIds(req).userId, req.params.requestId, {
        decision: req.body?.decision,
        unfulfillableReason: req.body?.unfulfillableReason,
        internalNotes: req.body?.internalNotes,
      });
      res.json({ success: true, data: result, timestamp: new Date() });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /** Admin/ops route: POST /api/requests/provider/requests/:requestId/assign { providerId } */
  async assign(req: Request, res: Response): Promise<void> {
    try {
      const actorId = this.actorIds(req).userId;
      const data = await this.assignProvider.execute(actorId, req.params.requestId, req.body?.providerId);
      res.json({ success: true, data: data.toJSON(), timestamp: new Date() });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async createQuote(req: Request, res: Response): Promise<void> {
    try {
      const result = await this._createQuote.execute(this.actorIds(req).userId, req.params.requestId, req.body ?? {});
      res.status(201).json({ success: true, data: result, timestamp: new Date() });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async publishQuote(req: Request, res: Response): Promise<void> {
    try {
      const result = await this._publishQuote.execute(this.actorIds(req).userId, req.params.quoteId);
      res.json({ success: true, data: result, timestamp: new Date() });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async quoteDetail(req: Request, res: Response): Promise<void> {
    try {
      const data = await this.getQuoteDetail.execute(this.actorIds(req).userId, req.params.quoteId);
      res.json({ success: true, data: data.toJSON(), timestamp: new Date() });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async generateAssessmentLink(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.generateLink.execute(this.actorIds(req).userId, req.params.quoteId);
      res.status(201).json({ success: true, data: result, timestamp: new Date() });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async listMessages(req: Request, res: Response): Promise<void> {
    try {
      const messages = await this._listMessages.execute(
        { id: this.actorIds(req).userId, role: 'provider' },
        req.params.requestId,
      );
      res.json({ success: true, data: messages.map((m) => m.toJSON()), timestamp: new Date() });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  // ── Phase 2 §2.2 — supplier registry ───────────────────────────────────────

  async createSupplier(req: Request, res: Response): Promise<void> {
    try {
      const supplier = await this.registerSupplier.create(req.body ?? {});
      res.status(201).json({ success: true, data: supplier.toJSON(), timestamp: new Date() });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async updateSupplier(req: Request, res: Response): Promise<void> {
    try {
      const supplier = await this.registerSupplier.update(req.params.supplierId, req.body ?? {});
      res.json({ success: true, data: supplier.toJSON(), timestamp: new Date() });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async listSuppliers(req: Request, res: Response): Promise<void> {
    try {
      const activeOnly = req.query.active === 'true';
      const data = await this._listSuppliers.execute(activeOnly);
      res.json({ success: true, data, timestamp: new Date() });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /** PENDING → INVITE_READY (Phase 5 growth loop). */
  async markSupplierInviteReady(req: Request, res: Response): Promise<void> {
    try {
      const supplier = await this.markSupplierInvite.markInviteReady(
        req.params.supplierId,
        (req as unknown as { userId?: string }).userId ?? null,
      );
      res.json({ success: true, data: supplier.toJSON(), timestamp: new Date() });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /** INVITE_READY → INVITED (terminal, Phase 5 growth loop). */
  async markSupplierInvited(req: Request, res: Response): Promise<void> {
    try {
      const supplier = await this.markSupplierInvite.markInvited(
        req.params.supplierId,
        (req as unknown as { userId?: string }).userId ?? null,
      );
      res.json({ success: true, data: supplier.toJSON(), timestamp: new Date() });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /** Demand analytics aggregate (§5.3) — admin/provider/ops. */
  async analytics(_req: Request, res: Response): Promise<void> {
    try {
      const result = await this.getDemandAnalytics.execute();
      res.json({ success: true, data: result, timestamp: new Date() });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /** Append-only audit trail for a request (§4.3) — admin/provider/ops. */
  async requestAudit(req: Request, res: Response): Promise<void> {
    const requestId = req.params.requestId;
    if (!requestId) {
      res.status(400).json({ success: false, error: { code: 'REQUEST_ID_REQUIRED', message: 'requestId is required' } });
      return;
    }
    try {
      const entries = await listRequestAudit(requestId);
      res.json({ success: true, data: { requestId, entries } });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /** Attach/update a procurement source on an item (§2.2). */
  async attachItemSource(req: Request, res: Response): Promise<void> {
    try {
      const source = await this.setItemSource.attach(req.params.itemId, {
        supplierId: req.body?.supplierId ?? null,
        agreedPriceTzs: Number(req.body?.agreedPriceTzs ?? 0),
        availability: req.body?.availability,
        availableUntil: req.body?.availableUntil ? new Date(req.body.availableUntil) : undefined,
        notes: req.body?.notes,
      });
      res.status(201).json({ success: true, data: source.toJSON(), timestamp: new Date() });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async confirmItemSource(req: Request, res: Response): Promise<void> {
    try {
      await this.setItemSource.confirm(
        req.params.sourceId,
        req.body?.availableUntil ? new Date(req.body.availableUntil) : undefined,
      );
      res.json({ success: true, data: { sourceId: req.params.sourceId, availability: 'CONFIRMED' }, timestamp: new Date() });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  // ── Phase 2 §2.3 — procurement (Maysar-internal) ───────────────────────────

  async orderProcurement(req: Request, res: Response): Promise<void> {
    try {
      const rows = await this.listProcurement.execute(req.params.orderId);
      res.json({ success: true, data: rows.map((p) => p.toJSON()), timestamp: new Date() });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async patchProcurement(req: Request, res: Response): Promise<void> {
    try {
      await this.advanceProcurement.execute(req.params.procurementId, req.body?.status, req.body?.notes);
      res.json({ success: true, data: { id: req.params.procurementId, status: req.body?.status }, timestamp: new Date() });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  private handleError(error: unknown, res: Response): void {
    const anyError = error as any;
    const status = typeof anyError?.httpStatus === 'number' ? anyError.httpStatus : 500;
    const code = typeof anyError?.code === 'string' ? anyError.code : 'INTERNAL_SERVER_ERROR';
    const message = anyError?.message ?? 'Unknown error';
    if (status >= 500) console.error('[ProviderRequestController]', error);
    res.status(status).json({ success: false, error: { code, message }, timestamp: new Date() });
  }
}