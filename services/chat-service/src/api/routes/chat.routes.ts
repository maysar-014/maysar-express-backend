import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { zodOrderNumber } from "@shared/ids/human-readable-ids";
import {
  requireAuth,
  requireRole,
} from "../../../../../shared/middleware/auth-context.middleware";
import type { ConversationController } from "../controllers/conversation.controller";
import type { MessageController } from "../controllers/message.controller";
import type { MediaController } from "../controllers/media.controller";
import type { ModerationController } from "../controllers/moderation.controller";
import type { AdminController } from "../controllers/admin.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

// ─── Zod validation middleware factory ────────────────────────────────────────

function validate(schema: z.ZodTypeAny, source: "body" | "query" = "body") {
  return (req: any, res: any, next: any) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(422).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: result.error.errors[0]?.message ?? "Validation failed",
        },
      });
    }
    req[source] = result.data;
    next();
  };
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const initiateSchema = z
  .object({
    type: z
      .enum(["BUYER_SELLER", "SELLER_SUPPLIER", "BUYER_COURIER", "SELLER_TEAM"])
      .optional(),
    recipientId: z.string().min(1),
    initiatorRole: z
      .enum(["BUYER", "SELLER", "SUPPLIER", "COURIER"])
      .optional(),
    recipientRole: z
      .enum(["BUYER", "SELLER", "SUPPLIER", "COURIER"])
      .optional(),
    relatedProductId: z.string().optional().nullable(),
    // An order reference is exactly an order number (ORD-YYYYMMDD-NLNL).
    relatedOrderId: zodOrderNumber().optional().nullable(),
    relatedShipmentId: z.string().optional().nullable(),
    relatedSupplierRequestId: z.string().optional().nullable(),
    metadata: z.record(z.unknown()).optional(),
  })
  .transform((data) => ({
    ...data,
    // Default type based on roles if not provided
    type: data.type ?? "BUYER_SELLER",
    initiatorRole: data.initiatorRole ?? "BUYER",
    recipientRole: data.recipientRole ?? "SELLER",
  }));

const sendMessageSchema = z.object({
  type: z.enum([
    "TEXT",
    "IMAGE",
    "VOICE_NOTE",
    "PRODUCT_CARD",
    "ORDER_REFERENCE",
    "LOCATION_PIN",
    "QUICK_ACTION",
  ]),
  content: z.string().max(4000).optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

const reportSchema = z.object({
  conversationId: z.string().min(1),
  reason: z.string().min(1).max(500),
});

const searchQuerySchema = z.object({
  q: z.string().min(2).max(100),
  limit: z.coerce.number().min(1).max(50).optional(),
});

const domainSchema = z.object({ domain: z.string().min(1) });

// ── Admin moderation schemas ─────────────────────────────────────────────────

const moderatedListQuerySchema = z.object({
  status: z.enum(["FLAGGED", "BLOCKED", "ALL"]).optional(),
  search: z.string().min(1).max(100).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  cursor: z.string().optional(),
});

const reviewActionSchema = z.object({
  action: z.enum(["APPROVE", "CONFIRM_BLOCK", "DELETE"]),
  notes: z.string().max(500).optional(),
});

const phraseCreateSchema = z.object({
  phrase: z.string().min(1).max(300),
  matchType: z.enum(["SUBSTRING", "REGEX"]).optional(),
  language: z.enum(["EN", "SW", "OTHER"]).optional(),
  category: z.string().min(1).max(64),
  description: z.string().max(500).optional().nullable(),
  weight: z.coerce.number().min(0).max(100).optional(),
  action: z.enum(["FLAG", "BLOCK"]).optional(),
  isActive: z.boolean().optional(),
});

const phraseUpdateSchema = z.object({
  matchType: z.enum(["SUBSTRING", "REGEX"]).optional(),
  language: z.enum(["EN", "SW", "OTHER"]).optional(),
  category: z.string().min(1).max(64).optional(),
  description: z.string().max(500).optional().nullable(),
  weight: z.coerce.number().min(0).max(100).optional(),
  action: z.enum(["FLAG", "BLOCK"]).optional(),
  isActive: z.boolean().optional(),
});

const phraseListQuerySchema = z.object({
  activeOnly: z.enum(["true", "false"]).optional(),
  category: z.string().max(64).optional(),
});

const emergingListQuerySchema = z.object({
  status: z.enum(["PENDING", "PROMOTED", "DISMISSED"]).optional(),
});

const emergingPromoteSchema = z.object({
  action: z.enum(["FLAG", "BLOCK"]).optional(),
  weight: z.coerce.number().min(0).max(100).optional(),
  category: z.string().max(64).optional(),
});

// ─── Router factory ───────────────────────────────────────────────────────────

export function createChatRoutes(
  conversationCtrl: ConversationController,
  messageCtrl: MessageController,
  mediaCtrl: MediaController,
  moderationCtrl: ModerationController,
  adminCtrl: AdminController,
): Router {
  const router = Router();

  // ── Conversations ──────────────────────────────────────────────────────────
  router.post(
    "/conversations",
    requireAuth,
    validate(initiateSchema),
    conversationCtrl.initiate,
  );
  router.get("/conversations", requireAuth, conversationCtrl.list);
  router.get(
    "/conversations/search",
    requireAuth,
    validate(searchQuerySchema, "query"),
    conversationCtrl.search,
  );
  router.get("/conversations/:id", requireAuth, conversationCtrl.getById);
  router.put("/conversations/:id/read", requireAuth, conversationCtrl.markRead);
  router.post("/conversations/:id/mute", requireAuth, conversationCtrl.mute);
  router.delete(
    "/conversations/:id/mute",
    requireAuth,
    conversationCtrl.unmute,
  );

  // ── Messages ───────────────────────────────────────────────────────────────
  router.post(
    "/conversations/:id/messages",
    requireAuth,
    validate(sendMessageSchema),
    messageCtrl.send,
  );
  router.get("/conversations/:id/messages", requireAuth, messageCtrl.list);
  router.delete(
    "/conversations/:id/messages/:messageId",
    requireAuth,
    messageCtrl.softDelete,
  );
  router.post(
    "/messages/:messageId/report",
    requireAuth,
    validate(reportSchema),
    messageCtrl.report,
  );

  // ── Media ──────────────────────────────────────────────────────────────────
  router.post(
    "/media/upload",
    requireAuth,
    upload.single("file"),
    mediaCtrl.upload,
  );

  // ── User moderation ────────────────────────────────────────────────────────
  router.post("/users/:userId/block", requireAuth, moderationCtrl.blockUser);
  router.delete(
    "/users/:userId/block",
    requireAuth,
    moderationCtrl.unblockUser,
  );

  // ── Admin — phishing blocklist ─────────────────────────────────────────────
  router.get(
    "/admin/blocklist/domains",
    requireRole(["admin"]),
    adminCtrl.getBlocklist,
  );
  router.post(
    "/admin/blocklist/domains",
    requireRole(["admin"]),
    validate(domainSchema),
    adminCtrl.addDomain,
  );
  router.delete(
    "/admin/blocklist/domains/:domain",
    requireRole(["admin"]),
    adminCtrl.removeDomain,
  );

  // ── Admin — flagged & blocked message oversight ───────────────────────────
  router.get(
    "/admin/moderation/messages",
    requireRole(["admin"]),
    validate(moderatedListQuerySchema, "query"),
    adminCtrl.listModeratedMessages,
  );
  router.get(
    "/admin/moderation/messages/:messageId",
    requireRole(["admin"]),
    adminCtrl.getModeratedMessageDetail,
  );
  router.post(
    "/admin/moderation/messages/:messageId/review",
    requireRole(["admin"]),
    validate(reviewActionSchema),
    adminCtrl.reviewModeratedMessage,
  );

  // ── Admin — suspicious phrase/pattern registry (dynamic) ──────────────────
  router.get(
    "/admin/moderation/phrases",
    requireRole(["admin"]),
    validate(phraseListQuerySchema, "query"),
    adminCtrl.listPhrases,
  );
  router.get(
    "/admin/moderation/phrases/:id",
    requireRole(["admin"]),
    adminCtrl.getPhrase,
  );
  router.post(
    "/admin/moderation/phrases",
    requireRole(["admin"]),
    validate(phraseCreateSchema),
    adminCtrl.createPhrase,
  );
  router.put(
    "/admin/moderation/phrases/:id",
    requireRole(["admin"]),
    validate(phraseUpdateSchema),
    adminCtrl.updatePhrase,
  );
  router.delete(
    "/admin/moderation/phrases/:id",
    requireRole(["admin"]),
    adminCtrl.deletePhrase,
  );
  router.post(
    "/admin/moderation/phrases/seed",
    requireRole(["admin"]),
    adminCtrl.seedPhrases,
  );

  // ── Admin — emerging patterns (dynamic detection beyond the list) ─────────
  router.get(
    "/admin/moderation/patterns",
    requireRole(["admin"]),
    validate(emergingListQuerySchema, "query"),
    adminCtrl.listEmergingPatterns,
  );
  router.post(
    "/admin/moderation/patterns/mine",
    requireRole(["admin"]),
    adminCtrl.minePatterns,
  );
  router.post(
    "/admin/moderation/patterns/:id/promote",
    requireRole(["admin"]),
    validate(emergingPromoteSchema),
    adminCtrl.promoteEmergingPattern,
  );
  router.delete(
    "/admin/moderation/patterns/:id",
    requireRole(["admin"]),
    adminCtrl.dismissEmergingPattern,
  );

  return router;
}
