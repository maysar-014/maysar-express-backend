/**
 * Payment Admin Controller
 * Admin/operations endpoints over the payment ledger:
 *
 * GET  /admin/payments       — payment summary list (admin roster view)
 * POST /payments/:id/block   — block an in-flight payment (→ FAILED)
 * POST /payments/:id/flag    — flag a payment for review (audit only)
 *
 * The summary is mounted at /admin/payments (index.ts); block/flag are routed
 * under /payments with per-route admin guards in payment.routes.ts — the path
 * contract documented in PAYMENT_SERVICE_SYSTEM.md §8.
 */

import { Request, Response } from "express";
import { BlockTransactionUseCase } from "../../application/use-cases/block-transaction.use-case";
import { FlagTransactionUseCase } from "../../application/use-cases/flag-transaction.use-case";
import { IPaymentRepository } from "../../domain/repositories/payment.repository";
import { logger } from "../../infrastructure/services/logger.service";
import { t } from "@shared/i18n/i18n";

const DEFAULT_PAGE_LIMIT = 50;
const MAX_PAGE_LIMIT = 200;

export class PaymentAdminController {
  constructor(
    private readonly blockTransactionUseCase: BlockTransactionUseCase,
    private readonly flagTransactionUseCase: FlagTransactionUseCase,
    private readonly paymentRepository: IPaymentRepository,
  ) {}

  /**
   * Actor id for audit metadata: admin JWT user, or the calling service key
   * (system-to-system calls carry no user identity).
   */
  private getActor(req: Request): string | null {
    const user = (req as any).user;
    const service = (req as any).service;
    if (user?.userId) {
      return String(user.userId);
    }
    if (service?.serviceKey) {
      return `system:${service.serviceKey}`;
    }
    const headerUserId = Array.isArray(req.headers["x-user-id"])
      ? req.headers["x-user-id"][0]
      : req.headers["x-user-id"];
    return typeof headerUserId === "string" ? headerUserId : null;
  }

  /** Safe localization — falls back to the key if i18n is unavailable. */
  private localized(req: Request, key: string): string {
    try {
      return t(key, { lng: (req as any).language }) || key;
    } catch {
      return key;
    }
  }

  private mapError(res: Response, error: unknown, req: Request): void {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("not found")) {
      res.status(404).json({
        success: false,
        error: this.localized(req, "payment:errors.notFound"),
      });
      return;
    }
    if (message.startsWith("Cannot block a")) {
      res.status(409).json({
        success: false,
        error: {
          code: "PAYMENT_NOT_BLOCKABLE",
          message,
        },
      });
      return;
    }
    logger.error("Admin payment operation failed", { error });
    res.status(500).json({
      success: false,
      error: this.localized(req, "common:errors.internalServerError"),
    });
  }

  /**
   * GET /admin/payments?limit=&offset=
   * Payment summary list. Item shape mirrors the frontend AdminPaymentSummary
   * entity ({ id, method, status, amount }) with extra ops fields; the
   * frontend mapper only reads what it needs.
   */
  async listPayments(req: Request, res: Response): Promise<void> {
    try {
      const limit = Math.min(
        Math.max(Number(req.query.limit) || DEFAULT_PAGE_LIMIT, 1),
        MAX_PAGE_LIMIT,
      );
      const offset = Math.max(Number(req.query.offset) || 0, 0);

      const payments = await this.paymentRepository.findAll(limit, offset);

      res.status(200).json({
        success: true,
        data: payments.map((payment) => ({
          id: payment.id,
          method: payment.method,
          status: payment.status,
          amount: payment.amount,
          currency: payment.currency,
          refundedAmount: payment.refundedAmount,
          environment: payment.environment,
          createdAt: payment.createdAt,
          completedAt: payment.completedAt,
        })),
        meta: { count: payments.length, limit, offset },
      });
    } catch (error) {
      this.mapError(res, error, req);
    }
  }

  /**
   * POST /admin/payments/:id/block
   * Body: { reason: string } — marks a PENDING/PROCESSING payment FAILED
   * and records blockedAt/blockedBy/blockReason audit metadata.
   */
  async blockPayment(req: Request, res: Response): Promise<void> {
    try {
      const actor = this.getActor(req);
      if (!actor) {
        res.status(401).json({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        });
        return;
      }

      await this.blockTransactionUseCase.execute({
        transactionId: req.params.id,
        adminId: actor,
        reason: req.body.reason,
      });

      res.status(200).json({
        success: true,
        data: {
          transactionId: req.params.id,
          action: "blocked",
          blockedBy: actor,
          reason: req.body.reason,
        },
      });
    } catch (error) {
      this.mapError(res, error, req);
    }
  }

  /**
   * POST /admin/payments/:id/flag
   * Body: { reason: string, flagType?: string } — records flaggedAt/flaggedBy/
   * flagReason/flagType audit metadata. Payment status is NOT changed.
   */
  async flagPayment(req: Request, res: Response): Promise<void> {
    try {
      const actor = this.getActor(req);
      if (!actor) {
        res.status(401).json({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        });
        return;
      }

      await this.flagTransactionUseCase.execute({
        transactionId: req.params.id,
        adminId: actor,
        flagType: req.body.flagType,
        reason: req.body.reason,
      });

      res.status(200).json({
        success: true,
        data: {
          transactionId: req.params.id,
          action: "flagged",
          flagType: req.body.flagType,
          flaggedBy: actor,
          reason: req.body.reason,
        },
      });
    } catch (error) {
      this.mapError(res, error, req);
    }
  }
}