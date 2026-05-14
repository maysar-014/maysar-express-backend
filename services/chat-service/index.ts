import { Router } from 'express';
import type { Module } from '../../src/core/module.interface';
import { ServiceLogger } from '../../shared/logger/logger';
import { createPrismaClient } from '../../shared/database/prisma-client';
import Redis from 'ioredis';
import { chatConfig } from './src/config/chat.config';

// Infrastructure
import { PrismaConversationRepository } from './src/infrastructure/repositories/prisma-conversation.repository';
import { PrismaMessageRepository } from './src/infrastructure/repositories/prisma-message.repository';
import { PrismaModerationRepository } from './src/infrastructure/repositories/prisma-moderation.repository';
import { RedisPresenceStore } from './src/infrastructure/redis/presence.store';
import { RedisRateLimiter } from './src/infrastructure/redis/rate-limiter';
import { RedisPubSub } from './src/infrastructure/redis/pubsub';
import { S3MediaStore } from './src/infrastructure/media/s3-media.store';
import { NotificationClient } from './src/infrastructure/notifications/notification.client';
import { MeilisearchIndexer } from './src/infrastructure/search/meilisearch.indexer';
import { WsGateway } from './src/infrastructure/websocket/ws-gateway';

// Domain
import { RiskEngine } from './src/domain/risk/risk-engine';

// Use cases
import { InitiateConversationUseCase } from './src/application/use-cases/initiate-conversation.use-case';
import { SendMessageUseCase } from './src/application/use-cases/send-message.use-case';
import { MarkReadUseCase } from './src/application/use-cases/mark-read.use-case';
import { GetConversationListUseCase } from './src/application/use-cases/get-conversation-list.use-case';
import { SearchConversationsUseCase } from './src/application/use-cases/search-conversations.use-case';
import { ModerationUseCase } from './src/application/use-cases/moderation.use-case';
import { MediaUploadUseCase } from './src/application/use-cases/media-upload.use-case';

// Controllers
import { ConversationController } from './src/api/controllers/conversation.controller';
import { MessageController } from './src/api/controllers/message.controller';
import { MediaController } from './src/api/controllers/media.controller';
import { ModerationController } from './src/api/controllers/moderation.controller';
import { AdminController } from './src/api/controllers/admin.controller';

// Routes
import { createChatRoutes } from './src/api/routes/chat.routes';

// Jobs
import { MarketplaceIntelligenceJob } from './src/infrastructure/jobs/marketplace-intelligence.job';
import { RetentionJob } from './src/infrastructure/jobs/retention.job';
import { ArchiveCourierConversationsJob } from './src/infrastructure/jobs/archive-courier-conversations.job';

const logger = new ServiceLogger('ChatService', 'chat-service');

let redisClient: Redis | null = null;
let pubSub: RedisPubSub | null = null;
let wsGateway: WsGateway | null = null;
let prismaClient: ReturnType<typeof createPrismaClient> | null = null;

// Stub catalog/order clients — resolved via shared Prisma in the same DB
const catalogClient = {
  async getProductSnapshot(productId: string): Promise<Record<string, unknown> | null> {
    if (!prismaClient) return null;
    const product = await prismaClient.product.findUnique({
      where: { id: productId },
      include: { variants: { take: 1 } },
    });
    if (!product) return null;
    return {
      title: product.title,
      price: product.variants[0]?.price ?? null,
      imageUrl: null,
      stockStatus: product.status,
      productPageUrl: `/products/${product.slug}`,
      addToCartUrl: `/cart/add?productId=${product.id}`,
    };
  },
};

const orderClient = {
  async getOrderSnapshot(orderId: string, userId: string): Promise<Record<string, unknown> | null> {
    if (!prismaClient) return null;
    const order = await (prismaClient as any).order_Order.findFirst({
      where: {
        id: orderId,
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
    });
    if (!order) return null;
    return {
      status: order.status,
      totalAmount: order.totalAmount,
      currency: order.currency ?? 'TZS',
      orderPageUrl: `/orders/${orderId}`,
    };
  },
};

export const ChatModule: Module = {
  name: 'chat-service',

  initialize: async () => {
    prismaClient = createPrismaClient();

    // Redis — single client for presence + rate limiting
    redisClient = new Redis(chatConfig.redis.url, {
      password: chatConfig.redis.password || undefined,
      lazyConnect: true,
    });

    try {
      await redisClient.connect();
      logger.info('Redis connected for chat-service');
    } catch (err) {
      logger.warn('chat-service: Redis connection failed — continuing in degraded mode', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // Pub/Sub uses separate connections
    pubSub = new RedisPubSub(
      chatConfig.redis.url,
      chatConfig.redis.password || undefined,
    );

    // Infrastructure
    const conversationRepo = new PrismaConversationRepository(prismaClient);
    const messageRepo = new PrismaMessageRepository(prismaClient);
    const moderationRepo = new PrismaModerationRepository(prismaClient);
    const presence = new RedisPresenceStore(redisClient);
    const rateLimiter = new RedisRateLimiter(redisClient);
    const mediaStore = new S3MediaStore();
    const notificationClient = new NotificationClient(conversationRepo, presence);
    const meilisearch = new MeilisearchIndexer();
    const riskEngine = new RiskEngine(redisClient);

    // Ensure Meilisearch index is configured (fire-and-forget)
    meilisearch.ensureIndex().catch((e) => logger.warn('Meilisearch index setup failed', { e }));

    // Notification helper passed to SendMessageUseCase
    const notifyOffline = async (message: any, conversationId: string) => {
      await notificationClient.notifyOfflineParticipants(message, conversationId);
    };

    // Use cases
    const initiateUseCase = new InitiateConversationUseCase(
      conversationRepo, messageRepo, moderationRepo, rateLimiter, pubSub,
    );
    const sendUseCase = new SendMessageUseCase(
      conversationRepo, messageRepo, moderationRepo, rateLimiter, pubSub,
      riskEngine, catalogClient, orderClient, notifyOffline,
    );
    const markReadUseCase = new MarkReadUseCase(conversationRepo, pubSub);
    const listUseCase = new GetConversationListUseCase(conversationRepo);
    const searchUseCase = new SearchConversationsUseCase();
    const moderationUseCase = new ModerationUseCase(conversationRepo, moderationRepo);
    const mediaUploadUseCase = new MediaUploadUseCase(mediaStore);

    // Controllers
    const conversationCtrl = new ConversationController(
      initiateUseCase, listUseCase, searchUseCase, markReadUseCase, moderationUseCase, conversationRepo,
    );
    const messageCtrl = new MessageController(sendUseCase, moderationUseCase, messageRepo, conversationRepo);
    const mediaCtrl = new MediaController(mediaUploadUseCase);
    const moderationCtrl = new ModerationController(moderationUseCase);
    const adminCtrl = new AdminController(riskEngine);

    // WebSocket Gateway
    wsGateway = new WsGateway(
      conversationRepo, messageRepo, presence, pubSub,
      (conversationId, userId) => markReadUseCase.execute(conversationId, userId),
    );

    // Router
    const router = Router();
    router.use('/v1', createChatRoutes(conversationCtrl, messageCtrl, mediaCtrl, moderationCtrl, adminCtrl));
    router.get('/health', (_req, res) => res.json({ status: 'ok', service: 'chat-service' }));

    ChatModule.routes = router;
    (ChatModule as any)._wsGateway = wsGateway;

    // Background jobs
    const intelligenceJob = new MarketplaceIntelligenceJob(prismaClient);
    const retentionJob = new RetentionJob(prismaClient);
    const archiveJob = new ArchiveCourierConversationsJob(prismaClient);

    intelligenceJob.start();
    retentionJob.start();

    // Backfill any missed courier conversation archives on startup
    archiveJob.backfill().catch((e) => logger.warn('Archive backfill failed', { e }));

    // Subscribe to order status events for auto-archiving
    try {
      const { eventBus } = await import('../../shared/events/eventBus');
      void eventBus.subscribe('OrderDelivered', async (envelope: { payload?: { orderId?: string }; data?: { orderId?: string } }) => {
        const orderId = envelope?.payload?.orderId ?? envelope?.data?.orderId;
        if (orderId) await archiveJob.handleOrderStatusChanged({ orderId, status: 'DELIVERED' });
      });
      void eventBus.subscribe('OrderCancelled', async (envelope: { payload?: { orderId?: string }; data?: { orderId?: string } }) => {
        const orderId = envelope?.payload?.orderId ?? envelope?.data?.orderId;
        if (orderId) await archiveJob.handleOrderStatusChanged({ orderId, status: 'CANCELLED' });
      });
      logger.info('chat-service subscribed to order status events');
    } catch (e) {
      logger.warn('chat-service: could not subscribe to order events', { e });
    }

    (ChatModule as any)._jobs = [intelligenceJob, retentionJob];

    logger.info('✅ chat-service initialized');
  },

  routes: Router(),

  shutdown: async () => {
    logger.info('Shutting down chat-service');
    if (wsGateway) await wsGateway.shutdown();
    if (pubSub) await pubSub.disconnect();
    if (redisClient) {
      try { await redisClient.quit(); } catch { /* ignore */ }
      redisClient = null;
    }
    if (prismaClient) {
      await prismaClient.$disconnect();
      prismaClient = null;
    }
  },
};
