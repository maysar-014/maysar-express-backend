import type { Request, Response } from "express";
import type { RiskEngine } from "../../domain/risk/risk-engine";
import type { AdminModerationUseCase } from "../../application/use-cases/admin-moderation.use-case";
import type { SuspiciousPhraseUseCase } from "../../application/use-cases/suspicious-phrase.use-case";
import type { AdminReviewAction } from "../../domain/entities/moderation.entity";
import { sendSuccess, sendError } from "../../shared/response";
import { ChatError, chatValidationError } from "../../shared/errors";

export class AdminController {
  constructor(
    private readonly riskEngine: RiskEngine,
    private readonly adminModerationUseCase: AdminModerationUseCase,
    private readonly suspiciousPhraseUseCase: SuspiciousPhraseUseCase,
  ) {}

  // ── Phishing domain blocklist ───────────────────────────────────────────────

  getBlocklist = async (_req: Request, res: Response): Promise<void> => {
    const domains = await this.riskEngine.listDomains();
    sendSuccess(res, { domains });
  };

  addDomain = async (req: Request, res: Response): Promise<void> => {
    const { domain } = req.body as { domain: string };
    await this.riskEngine.addDomain(domain);
    sendSuccess(res, { ok: true });
  };

  removeDomain = async (req: Request, res: Response): Promise<void> => {
    await this.riskEngine.removeDomain(req.params.domain);
    sendSuccess(res, { ok: true });
  };

  // ── Flagged & blocked message oversight ─────────────────────────────────────

  listModeratedMessages = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const status = (req.query.status as string) || "ALL";
    if (!["FLAGGED", "BLOCKED", "ALL"].includes(status)) {
      return sendError(
        res,
        chatValidationError("status must be one of: FLAGGED, BLOCKED, ALL"),
      );
    }
    const result = await this.adminModerationUseCase.listMessages({
      status: status as "FLAGGED" | "BLOCKED" | "ALL",
      search: req.query.search as string | undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      cursor: req.query.cursor as string | undefined,
    });
    sendSuccess(res, result);
  };

  getModeratedMessageDetail = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const result = await this.adminModerationUseCase.getMessageDetail(
      req.params.messageId,
    );
    sendSuccess(res, result);
  };

  reviewModeratedMessage = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const adminId = (req as any).user.userId as string;
      const action = req.body.action as AdminReviewAction;
      const result = await this.adminModerationUseCase.reviewMessage(
        adminId,
        req.params.messageId,
        action,
        (req.body.notes as string | undefined) ?? null,
      );
      sendSuccess(res, result);
    } catch (err) {
      if (err instanceof ChatError) return sendError(res, err);
      throw err;
    }
  };

  // ── Suspicious phrase registry (dynamic) ───────────────────────────────────

  listPhrases = async (req: Request, res: Response): Promise<void> => {
    const result = await this.suspiciousPhraseUseCase.listPhrases({
      activeOnly: req.query.activeOnly === "true",
      category: req.query.category as string | undefined,
    });
    sendSuccess(res, { phrases: result });
  };

  getPhrase = async (req: Request, res: Response): Promise<void> => {
    try {
      const phrase = await this.suspiciousPhraseUseCase.getPhrase(
        req.params.id,
      );
      sendSuccess(res, phrase);
    } catch (err) {
      if (err instanceof ChatError) return sendError(res, err);
      throw err;
    }
  };

  createPhrase = async (req: Request, res: Response): Promise<void> => {
    try {
      const phrase = await this.suspiciousPhraseUseCase.createPhrase(req.body);
      sendSuccess(res, phrase, 201);
    } catch (err) {
      if (err instanceof ChatError) return sendError(res, err);
      throw err;
    }
  };

  updatePhrase = async (req: Request, res: Response): Promise<void> => {
    try {
      const phrase = await this.suspiciousPhraseUseCase.updatePhrase(
        req.params.id,
        req.body,
      );
      sendSuccess(res, phrase);
    } catch (err) {
      if (err instanceof ChatError) return sendError(res, err);
      throw err;
    }
  };

  deletePhrase = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.suspiciousPhraseUseCase.deletePhrase(req.params.id);
      sendSuccess(res, { ok: true });
    } catch (err) {
      if (err instanceof ChatError) return sendError(res, err);
      throw err;
    }
  };

  seedPhrases = async (_req: Request, res: Response): Promise<void> => {
    const result = await this.suspiciousPhraseUseCase.seedDefaults();
    sendSuccess(res, result);
  };

  // ── Emerging patterns (dynamic detection) ──────────────────────────────────

  minePatterns = async (req: Request, res: Response): Promise<void> => {
    const days = req.query.days ? Number(req.query.days) : undefined;
    const scanned = await this.suspiciousPhraseUseCase.minePatterns(
      days ? { days } : undefined,
    );
    sendSuccess(res, { scanned });
  };

  listEmergingPatterns = async (req: Request, res: Response): Promise<void> => {
    const status = req.query.status as string | undefined;
    const patterns = await this.suspiciousPhraseUseCase.listEmergingPatterns(
      status as "PENDING" | "PROMOTED" | "DISMISSED" | undefined,
    );
    sendSuccess(res, { patterns });
  };

  promoteEmergingPattern = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const overrides = {
        action: req.body?.action as "FLAG" | "BLOCK" | undefined,
        weight: req.body?.weight as number | undefined,
        category: req.body?.category as string | undefined,
      };
      const pattern = await this.suspiciousPhraseUseCase.promoteEmergingPattern(
        req.params.id,
        overrides.action || overrides.weight || overrides.category
          ? overrides
          : undefined,
      );
      sendSuccess(res, pattern);
    } catch (err) {
      if (err instanceof ChatError) return sendError(res, err);
      throw err;
    }
  };

  dismissEmergingPattern = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const pattern = await this.suspiciousPhraseUseCase.dismissEmergingPattern(
        req.params.id,
      );
      sendSuccess(res, pattern);
    } catch (err) {
      if (err instanceof ChatError) return sendError(res, err);
      throw err;
    }
  };
}
