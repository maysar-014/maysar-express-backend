# Implementation Plan: Maysar Chat System

## Overview

Implement the Maysar Chat System as a dedicated `chat-service` microservice following the same DDD layered architecture used across the monorepo. The implementation proceeds bottom-up: database schema → domain layer → infrastructure layer → application layer → WebSocket gateway → API layer → Risk Engine → notifications → Meilisearch → Marketplace Intelligence → property-based tests.

All new files live under `services/chat-service/src/`. The Prisma schema additions are at `prisma/schema.prisma`. Tests use the existing Vitest + fast-check setup.

---

## Tasks

- [x] 1. Database schema — add chat models and run migration
  - Add enums to `prisma/schema.prisma`: `Chat_ConversationType`, `Chat_MessageType`, `Chat_ModerationStatus`, `Chat_ParticipantRole`
  - Add models: `Chat_Conversation`, `Chat_ConversationParticipant`, `Chat_Message`, `Chat_UserBlock`, `Chat_ModerationReport`, `Chat_SpamScoreLog`, `Chat_CheckoutLink`
  - Add all indexes as specified in the design (`[relatedOrderId]`, `[relatedProductId]`, `[lastMessageAt]`, `[conversationId, createdAt]`, `[senderId]`, `[blockedId]`, `[expiresAt]`)
  - Run `npx prisma migrate dev --name add_chat_system` and `npx prisma generate`
  - _Requirements: 1, 2, 3, 4, 8, 13, 14, 16, 17, 19_

- [x] 2. Service scaffold — create chat-service skeleton
  - Create `services/chat-service/` directory with `package.json`, `tsconfig.json`, `src/index.ts`
  - Set up Express app with JSON middleware, auth middleware (reuse existing JWT validation pattern), and error handler
  - Configure Prisma client, Redis client (`ioredis`), and S3 client
  - Add `chat-service` to the monorepo workspace and Docker Compose
  - _Requirements: 4, 7_

- [x] 3. Domain layer — entities and repository interfaces
  - Create `src/domain/entities/`: `conversation.entity.ts`, `message.entity.ts`, `participant.entity.ts`
  - Define all entity interfaces matching the design: `Conversation`, `ConversationParticipant`, `Message`, `UserBlock`, `ModerationReport`, `SpamScoreLog`
  - Create `src/domain/repositories/`: `conversation.repository.interface.ts`, `message.repository.interface.ts`
  - Define `ConversationRepository` and `MessageRepository` interfaces with all methods from the design
  - Export `PaginationOptions`, `PaginatedConversations`, `PaginatedMessages` types
  - _Requirements: 1, 2, 3, 5, 6, 7, 8, 9, 10, 12_

- [x] 4. Infrastructure layer — Prisma repositories
  - [x] 4.1 Implement `PrismaConversationRepository`
    - Create `src/infrastructure/repositories/prisma-conversation.repository.ts`
    - Implement `create`, `findById`, `findExisting` (dedup query on `buyerId + sellerId + relatedProductId`), `findByParticipant` (join `Chat_ConversationParticipant`, order by `lastMessageAt DESC`, paginate), `updateLastMessageAt`, `updateModerationStatus`, `updateMetadata`
    - _Requirements: 1.1, 1.2, 2.1, 3.1, 12.1, 12.5_

  - [x] 4.2 Implement `PrismaMessageRepository`
    - Create `src/infrastructure/repositories/prisma-message.repository.ts`
    - Implement `create`, `findById`, `findByConversation` (order by `createdAt ASC`, paginate), `softDelete` (replace `content` with `"[message deleted]"`, set `deletedAt`), `markAsDisputeEvidence`, `updateModerationStatus`
    - _Requirements: 5.1, 5.5, 6.3, 7.3, 8.3, 19.2, 19.4_

  - [x] 4.3 Implement `RedisPresenceStore`
    - Create `src/infrastructure/redis/presence.store.ts`
    - `setOnline(userId)`: `SET chat:presence:{userId} 1 EX 60`
    - `isOnline(userId)`: `GET chat:presence:{userId}` → boolean
    - `refresh(userId)`: `EXPIRE chat:presence:{userId} 60`
    - _Requirements: 11.3, 11.4_

  - [x] 4.4 Implement `RedisRateLimiter`
    - Create `src/infrastructure/redis/rate-limiter.ts`
    - `checkConversationLimit(userId)`: `INCR chat:ratelimit:conv:{userId}` + `EXPIRE` on first increment; return `{ allowed: boolean, count: number }`
    - `checkMessageLimit(userId)`: same pattern with `chat:ratelimit:msg:{userId}`
    - `checkMassMsgPattern(userId, contentHash)`: `INCR chat:ratelimit:massmsg:{userId}:{contentHash}` with 300s TTL; return count
    - _Requirements: 13.1, 13.3, 13.4, 17.2_

  - [x] 4.5 Implement `RedisPubSub`
    - Create `src/infrastructure/redis/pubsub.ts`
    - `publish(conversationId, payload)`: `PUBLISH chat:conv:{conversationId} JSON.stringify(payload)`
    - `subscribe(conversationId, handler)`: `SUBSCRIBE chat:conv:{conversationId}`
    - `unsubscribe(conversationId)`: `UNSUBSCRIBE chat:conv:{conversationId}`
    - _Requirements: 4.3_

  - [x] 4.6 Implement `S3MediaStore`
    - Create `src/infrastructure/media/s3-media.store.ts`
    - `uploadImage(file, userId)`: validate JPEG/PNG/WebP ≤ 10 MB; upload original to `chat/media/{userId}/{uuid}.{ext}`; generate 300×300 thumbnail via `sharp`; upload thumbnail; return `{ mediaUrl, thumbnailUrl }`
    - `uploadVoiceNote(file, userId)`: validate OGG/OPUS or M4A ≤ 15 MB ≤ 300s; upload to `chat/media/{userId}/{uuid}.{ext}`; return `{ mediaUrl, durationSeconds }`
    - _Requirements: 5.3, 5.5, 5.6, 6.1, 6.3, 6.4_

- [x] 5. Risk Engine
  - Create `src/domain/risk/risk-engine.ts`
  - Implement `computeSpamScore(message, context)` with four signals: URL density (×15), phishing domain match (100), message frequency (30 if >20 msgs in 5 min), mass-messaging (85 if same content to >5 conversations in 5 min)
  - Score = `Math.min(100, Math.max(...signalValues))`
  - Implement `loadBlocklist()`: read `chat:blocklist:domains` Redis Set
  - Implement `addDomain(domain)` / `removeDomain(domain)`: `SADD` / `SREM` on Redis Set
  - Apply penalty score: if `chat:penaltyscore:{userId}` exists in Redis, override score to 85
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 17.1, 17.2, 17.3, 17.4_

- [x] 6. Application layer — use cases
  - [x] 6.1 Implement `InitiateConversationUseCase`
    - Create `src/application/use-cases/initiate-conversation.use-case.ts`
    - Steps: validate role rules → self-chat guard → dedup check → rate limit (429 `CHAT_RATE_LIMIT_EXCEEDED`) → block check → create Conversation + Participants in transaction → auto-send `PRODUCT_CARD` + `TEXT` system message for `BUYER_SELLER` → publish `conversation.created` to Redis → return conversation
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 3.1, 3.4, 13.1, 13.2, 16.2_

  - [x] 6.2 Implement `SendMessageUseCase`
    - Create `src/application/use-cases/send-message.use-case.ts`
    - Steps: participant check (403 `CHAT_ACCESS_DENIED`) → archived check (403 `CHAT_CONVERSATION_ARCHIVED`) → message rate limit (429 `CHAT_MESSAGE_RATE_LIMIT_EXCEEDED`) → block check (403 `CHAT_RECIPIENT_BLOCKED`) → validate payload by type → catalog/order snapshot for `PRODUCT_CARD`/`ORDER_REFERENCE` → Risk Engine → persist message → update `lastMessageAt` → publish to Redis → trigger notifications → return message
    - _Requirements: 4.1, 5.1, 5.2, 5.3, 6.1, 7.1, 8.1, 9.1, 10.1, 13.4, 13.5, 14.1, 14.2, 14.3, 16.5_

  - [x] 6.3 Implement `MarkReadUseCase`
    - Create `src/application/use-cases/mark-read.use-case.ts`
    - Verify participant → update `lastReadAt = now()` → publish `read_receipt` event to Redis channel
    - _Requirements: 11.1, 11.2_

  - [x] 6.4 Implement `GetConversationListUseCase`
    - Create `src/application/use-cases/get-conversation-list.use-case.ts`
    - Query by participant, order by `lastMessageAt DESC`, enrich with unread count + last message preview (100 chars) + other participant display name, paginate (default 20, max 50)
    - _Requirements: 12.1, 12.2, 12.5_

  - [x] 6.5 Implement `SearchConversationsUseCase`
    - Create `src/application/use-cases/search-conversations.use-case.ts`
    - Validate query length [2, 100] (422 if invalid) → query Meilisearch `chat_conversations` index → return results
    - _Requirements: 12.3, 12.4_

  - [x] 6.6 Implement `ModerationUseCase`
    - Create `src/application/use-cases/moderation.use-case.ts`
    - `reportMessage`: create `Chat_ModerationReport` record
    - `blockUser`: create `Chat_UserBlock` record
    - `unblockUser`: delete `Chat_UserBlock` record
    - `muteConversation` / `unmuteConversation`: toggle `isMuted` on `Chat_ConversationParticipant`
    - _Requirements: 16.1, 16.2, 16.3, 16.4_

  - [x] 6.7 Implement `MediaUploadUseCase`
    - Create `src/application/use-cases/media-upload.use-case.ts`
    - Delegate to `S3MediaStore`; return `{ mediaUrl, thumbnailUrl?, durationSeconds? }`
    - _Requirements: 5.3, 5.5, 5.6, 6.1, 6.3, 6.4, 6.5_

- [x] 7. WebSocket Gateway
  - Create `src/infrastructure/websocket/ws-gateway.ts`
  - Manage in-memory connection map: `connections: Map<userId, WebSocket>`
  - `onConnect(ws, userId)`: store connection → set Redis presence → subscribe to Redis channels for all user conversations → send undelivered messages since `lastReadAt`
  - `onHeartbeat(userId)`: refresh Redis presence TTL
  - `onDisconnect(userId)`: remove from map (let Redis TTL expire)
  - `onRedisMessage(channel, payload)`: extract `conversationId` → fan out to all connected participants
  - Handle inbound `heartbeat` and `read_receipt` events from clients
  - Broadcast `presence` change events when user connects/disconnects
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 11.3, 11.4_

- [x] 8. Notification integration
  - Create `src/infrastructure/notifications/notification.client.ts`
  - Implement `notifyOfflineParticipants(message, conversation)`: skip sender, skip muted participants, skip online participants (check Redis presence), call existing Notification_Service HTTP API with push → SMS → email fallback chain
  - Include sender display name, 80-char preview, deep link in payload
  - SMS fallback only for `TEXT` and `VOICE_NOTE` types
  - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6_

- [x] 9. Meilisearch indexing
  - Create `src/infrastructure/search/meilisearch.indexer.ts`
  - Configure index `chat_conversations` with searchable attributes `['participantNames', 'lastMessagePreview']` and sort attribute `lastMessageAt`
  - `indexConversation(conversation, participants, lastMessage)`: upsert document into Meilisearch
  - Call indexer asynchronously (fire-and-forget with retry) after each message is persisted in `SendMessageUseCase`
  - _Requirements: 12.3_

- [ ] 10. API layer — controllers and routes
  - [x] 10.1 Implement `ConversationController`
    - Create `src/api/controllers/conversation.controller.ts`
    - Methods: `initiate`, `list`, `search`, `getById`, `markRead`, `mute`, `unmute`
    - Follow `ApiResponse` envelope pattern; map use case errors to HTTP codes per the error table in the design
    - _Requirements: 1, 2, 3, 11, 12_

  - [x] 10.2 Implement `MessageController`
    - Create `src/api/controllers/message.controller.ts`
    - Methods: `send`, `list`, `softDelete`, `report`
    - _Requirements: 4, 5, 6, 7, 8, 9, 10, 19_

  - [x] 10.3 Implement `MediaController`
    - Create `src/api/controllers/media.controller.ts`
    - Method: `upload` — multipart/form-data, delegate to `MediaUploadUseCase`
    - _Requirements: 5.3, 6.1_

  - [x] 10.4 Implement `ModerationController`
    - Create `src/api/controllers/moderation.controller.ts`
    - Methods: `blockUser`, `unblockUser`, `reportMessage`
    - _Requirements: 16.1, 16.2_

  - [x] 10.5 Implement `AdminController`
    - Create `src/api/controllers/admin.controller.ts`
    - Methods: `getBlocklist`, `addDomain`, `removeDomain` — admin-only, delegate to `RiskEngine`
    - _Requirements: 17.4_

  - [x] 10.6 Create routes and wire into Express app
    - Create `src/api/routes/chat.routes.ts` with Zod validation schemas for all endpoints
    - Register all routes from the design's REST endpoint list
    - Mount WebSocket upgrade handler on `/ws`
    - _Requirements: 1–22_

- [x] 11. Marketplace Intelligence job
  - Create `src/infrastructure/jobs/marketplace-intelligence.job.ts`
  - Run every hour via `node-cron`
  - Query Redis counters for unavailable-product inquiries; emit `CHAT_DEMAND_SIGNAL` to `Analytics_Event` table via outbox when count > 10 in 24h window
  - Query Redis counters for supplier complaint mentions; emit `CHAT_SUPPLIER_RISK_SIGNAL` when count > 3 in 7-day window
  - Ensure no PII in any event payload
  - _Requirements: 21.1, 21.2, 21.3, 21.4_

- [x] 12. Message retention job
  - Create `src/infrastructure/jobs/retention.job.ts`
  - Run daily via `node-cron`
  - Hard-delete messages where `createdAt < now() - 365 days` AND `isDisputeEvidence = false` AND `deletedAt IS NOT NULL`
  - Remove `DISPUTE_EVIDENCE` flag from messages in resolved disputes where resolution date > 90 days ago
  - _Requirements: 19.1, 19.2, 19.3_

- [x] 13. Auto-archive BUYER_COURIER conversations
  - Create `src/infrastructure/jobs/archive-courier-conversations.job.ts`
  - Subscribe to order status change events (via existing outbox/event bus)
  - When order reaches `DELIVERED` or `CANCELLED`, find associated `BUYER_COURIER` conversation and set `moderationStatus = ARCHIVED`
  - _Requirements: 3.2, 3.3_

- [x] 14. Property-based tests using fast-check
  - Create `src/application/__tests__/chat-properties.test.ts`

  - [x] 14.1 Property 1 — Ordering invariant
    - `// Feature: maysar-chat-system, Property 1: Ordering invariant`
    - Generate N messages with random `createdAt` values; persist in random order; fetch history; assert response is sorted `createdAt ASC`
    - _Requirements: 23.1_

  - [x] 14.2 Property 2 — Read-receipt idempotence
    - `// Feature: maysar-chat-system, Property 2: Read-receipt idempotence`
    - For any participant, after `markRead()`, fetch conversation list; assert `unreadCount === 0` regardless of how many times `markRead()` is called
    - _Requirements: 23.2_

  - [x] 14.3 Property 3 — Access control invariant
    - `// Feature: maysar-chat-system, Property 3: Access control invariant`
    - For any `(userId, conversationId)` where user is not a participant, every send/read/list call returns HTTP 403
    - _Requirements: 23.3_

  - [x] 14.4 Property 4 — Media round-trip
    - `// Feature: maysar-chat-system, Property 4: Media round-trip`
    - For any valid image/voice-note upload (correct format, within limits), the returned `mediaUrl` resolves to the stored file with matching content hash
    - _Requirements: 23.4_

  - [x] 14.5 Property 5 — Snapshot immutability
    - `// Feature: maysar-chat-system, Property 5: Snapshot immutability`
    - For any `PRODUCT_CARD` message, update the underlying product record; re-fetch the message; assert `metadata` equals the original snapshot
    - _Requirements: 23.5_

  - [x] 14.6 Property 6 — Rate-limit atomicity
    - `// Feature: maysar-chat-system, Property 6: Rate-limit atomicity`
    - Fire 30 concurrent `InitiateConversation` requests for the same user; assert exactly 20 succeed and 10 receive HTTP 429
    - _Requirements: 23.6_

- [x] 15. Final checkpoint — ensure all tests pass
  - Run `vitest --run` in `services/chat-service`
  - Verify all property tests pass with ≥ 100 iterations each
  - Verify all integration tests pass against a test database
  - Ask the user if any issues arise

---

## Notes

- Tasks 11, 12, 13 are background jobs and can be deferred to a follow-up sprint without blocking Phase 1 delivery
- The `sharp` package is required for image thumbnail generation in task 4.6
- `ffprobe` (via `fluent-ffmpeg`) is required for voice note duration extraction; alternatively accept client-provided duration header with server-side validation
- The phishing domain blocklist in Redis (`chat:blocklist:domains`) must be seeded with an initial set before the Risk Engine goes live
- Phone numbers must never appear in any API response — enforce this at the serialisation layer, not just in use cases
- The `@@id([conversationId, userId])` composite primary key on `Chat_ConversationParticipant` prevents duplicate participant records even under concurrent requests
