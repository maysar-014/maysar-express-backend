import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../../../../shared/middleware/auth-context.middleware';
import type { ConversationController } from '../controllers/conversation.controller';
import type { MessageController } from '../controllers/message.controller';
import type { MediaController } from '../controllers/media.controller';
import type { ModerationController } from '../controllers/moderation.controller';
import type { AdminController } from '../controllers/admin.controller';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// ─── Zod validation middleware factory ────────────────────────────────────────

function validate(schema: z.ZodTypeAny, source: 'body' | 'query' = 'body') {
  return (req: any, res: any, next: any) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(422).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: result.error.errors[0]?.message ?? 'Validation failed' },
      });
    }
    req[source] = result.data;
    next();
  };
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const initiateSchema = z.object({
  type: z.enum(['BUYER_SELLER', 'SELLER_SUPPLIER', 'BUYER_COURIER', 'SELLER_TEAM']),
  recipientId: z.string().min(1),
  initiatorRole: z.enum(['BUYER', 'SELLER', 'SUPPLIER', 'COURIER']),
  recipientRole: z.enum(['BUYER', 'SELLER', 'SUPPLIER', 'COURIER']),
  relatedProductId: z.string().optional().nullable(),
  relatedOrderId: z.string().optional().nullable(),
  relatedShipmentId: z.string().optional().nullable(),
  relatedSupplierRequestId: z.string().optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

const sendMessageSchema = z.object({
  type: z.enum(['TEXT', 'IMAGE', 'VOICE_NOTE', 'PRODUCT_CARD', 'ORDER_REFERENCE', 'LOCATION_PIN', 'QUICK_ACTION']),
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
  router.post('/conversations', requireAuth, validate(initiateSchema), conversationCtrl.initiate);
  router.get('/conversations', requireAuth, conversationCtrl.list);
  router.get('/conversations/search', requireAuth, validate(searchQuerySchema, 'query'), conversationCtrl.search);
  router.get('/conversations/:id', requireAuth, conversationCtrl.getById);
  router.put('/conversations/:id/read', requireAuth, conversationCtrl.markRead);
  router.post('/conversations/:id/mute', requireAuth, conversationCtrl.mute);
  router.delete('/conversations/:id/mute', requireAuth, conversationCtrl.unmute);

  // ── Messages ───────────────────────────────────────────────────────────────
  router.post('/conversations/:id/messages', requireAuth, validate(sendMessageSchema), messageCtrl.send);
  router.get('/conversations/:id/messages', requireAuth, messageCtrl.list);
  router.delete('/conversations/:id/messages/:messageId', requireAuth, messageCtrl.softDelete);
  router.post('/messages/:messageId/report', requireAuth, validate(reportSchema), messageCtrl.report);

  // ── Media ──────────────────────────────────────────────────────────────────
  router.post('/media/upload', requireAuth, upload.single('file'), mediaCtrl.upload);

  // ── User moderation ────────────────────────────────────────────────────────
  router.post('/users/:userId/block', requireAuth, moderationCtrl.blockUser);
  router.delete('/users/:userId/block', requireAuth, moderationCtrl.unblockUser);

  // ── Admin — phishing blocklist ─────────────────────────────────────────────
  router.get('/admin/blocklist/domains', requireRole(['admin']), adminCtrl.getBlocklist);
  router.post('/admin/blocklist/domains', requireRole(['admin']), validate(domainSchema), adminCtrl.addDomain);
  router.delete('/admin/blocklist/domains/:domain', requireRole(['admin']), adminCtrl.removeDomain);

  return router;
}
