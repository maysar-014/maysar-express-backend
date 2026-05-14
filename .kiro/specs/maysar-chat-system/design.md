# Design Document: Maysar Chat System

## Overview

The Maysar Chat System is the commerce communication layer for the Maysar East African marketplace. It is not a generic messenger — every conversation is contextually linked to a product, order, shipment, or supplier contract. The system is implemented as a dedicated **chat-service** microservice following the same DDD layered architecture used across the monorepo.

### Key Design Decisions

1. **Dedicated microservice** — Chat is high-throughput, stateful (WebSocket connections), and has distinct scaling needs from catalog or order services. A standalone `chat-service` isolates these concerns.
2. **WebSocket + Redis Pub/Sub fan-out** — Messages are persisted to PostgreSQL first (durability), then published to a Redis channel for fan-out to all WebSocket Gateway instances. This decouples persistence from delivery.
3. **Context-first conversations** — Every `Conversation` record carries `relatedProductId`, `relatedOrderId`, `relatedShipmentId`, and `relatedSupplierRequestId`. Chat is queryable, auditable, and dispute-capable from day one.
4. **Snapshot-at-send for commerce messages** — `PRODUCT_CARD` and `ORDER_REFERENCE` message metadata is snapshotted at send time into the `metadata` JSON column. Product price changes or order status updates never corrupt historical chat context.
5. **Risk Engine as an in-process pipeline** — Spam scoring runs synchronously before message delivery. Scores ≥ 90 block delivery; scores ≥ 70 flag the message. This keeps the hot path simple without an external service call.
6. **Redis for all ephemeral state** — Presence (TTL 60s), rate-limit counters (rolling window), and pub/sub channels all live in Redis. PostgreSQL holds only durable records.
7. **Meilisearch for conversation search** — Full-text search over conversation participants and last-message previews is offloaded to Meilisearch, keeping PostgreSQL queries simple.
8. **Phone masking by default** — Raw phone numbers are never included in any chat API response. The `PHONE_REVEAL` permission is an explicit operator grant.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  Clients (Next.js Web / Mobile)                                     │
│  REST API calls  +  WebSocket connection                            │
└────────────┬──────────────────────────┬────────────────────────────┘
             │ HTTP                     │ WS
┌────────────▼──────────────────────────▼────────────────────────────┐
│  chat-service  (Express + ws)                                       │
│                                                                     │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  REST Router    │  │  WS Gateway      │  │  Risk Engine     │  │
│  │  (HTTP API)     │  │  (connection mgr)│  │  (spam scoring)  │  │
│  └────────┬────────┘  └────────┬─────────┘  └────────┬─────────┘  │
│           │                   │                      │             │
│  ┌────────▼───────────────────▼──────────────────────▼──────────┐  │
│  │  Application Layer (Use Cases)                               │  │
│  │  ConversationService  ·  MessageService  ·  ModerationService│  │
│  └────────────────────────────┬─────────────────────────────────┘  │
│                               │                                     │
│  ┌────────────────────────────▼─────────────────────────────────┐  │
│  │  Domain Layer                                                │  │
│  │  Conversation · Message · Participant · SpamScoreLog         │  │
│  └────────────────────────────┬─────────────────────────────────┘  │
│                               │                                     │
│  ┌────────────────────────────▼─────────────────────────────────┐  │
│  │  Infrastructure Layer                                        │  │
│  │  PrismaConversationRepo · PrismaMessageRepo                  │  │
│  │  RedisPresenceStore · RedisRateLimiter · RedisPubSub         │  │
│  │  S3MediaStore · MeilisearchIndexer · NotificationClient      │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
             │                   │                      │
    ┌────────▼──────┐   ┌────────▼──────┐   ┌──────────▼──────┐
    │  PostgreSQL   │   │  Redis        │   │  S3 / MinIO     │
    │  (durable)    │   │  (ephemeral)  │   │  (media)        │
    └───────────────┘   └───────────────┘   └─────────────────┘
             │
    ┌────────▼──────────────────────────────────────────────────┐
    │  Meilisearch  (conversation full-text search)             │
    └───────────────────────────────────────────────────────────┘
```

### Message Delivery Flow

```
Client sends message
       │
       ▼
REST POST /conversations/:id/messages
       │
       ├─► 1. Auth + participant check (403 if not member)
       ├─► 2. Rate limit check via Redis (429 if exceeded)
       ├─► 3. Risk Engine spam score (block if ≥ 90, flag if ≥ 70)
       ├─► 4. Persist Message to PostgreSQL
       ├─► 5. Update Conversation.lastMessageAt
       ├─► 6. Publish to Redis channel: chat:conv:{conversationId}
       ├─► 7. WS Gateway fans out to all online participants
       ├─► 8. Trigger push notification for offline participants
       └─► 9. Index in Meilisearch (async)
```

---

## Components and Interfaces

### Domain Entities

```typescript
interface Conversation {
  id: string;
  type: 'BUYER_SELLER' | 'SELLER_SUPPLIER' | 'BUYER_COURIER' | 'SELLER_TEAM';
  moderationStatus: 'ACTIVE' | 'FLAGGED' | 'BLOCKED' | 'ARCHIVED';
  relatedProductId: string | null;
  relatedOrderId: string | null;
  relatedShipmentId: string | null;
  relatedSupplierRequestId: string | null;
  metadata: Record<string, unknown>;   // productUnavailable, negotiationState, etc.
  lastMessageAt: DateTime | null;
  createdAt: DateTime;
}

interface ConversationParticipant {
  conversationId: string;
  userId: string;
  role: 'BUYER' | 'SELLER' | 'SUPPLIER' | 'COURIER';
  lastReadAt: DateTime | null;
  isMuted: boolean;
  joinedAt: DateTime;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: 'TEXT' | 'IMAGE' | 'VOICE_NOTE' | 'PRODUCT_CARD' | 'ORDER_REFERENCE' | 'LOCATION_PIN' | 'QUICK_ACTION';
  content: string | null;
  metadata: Record<string, unknown>;   // mediaUrl, durationSeconds, productSnapshot, etc.
  moderationStatus: 'ACTIVE' | 'FLAGGED' | 'BLOCKED';
  spamScore: number | null;
  isDisputeEvidence: boolean;
  deletedAt: DateTime | null;
  createdAt: DateTime;
}

interface UserBlock {
  blockerId: string;
  blockedId: string;
  createdAt: DateTime;
}

interface ModerationReport {
  id: string;
  reporterId: string;
  messageId: string;
  conversationId: string;
  reason: string;
  reportedAt: DateTime;
}

interface SpamScoreLog {
  id: string;
  messageId: string;
  score: number;
  signals: Record<string, unknown>;
  computedAt: DateTime;
}
```

### Repository Interfaces

```typescript
interface ConversationRepository {
  create(data: CreateConversationInput): Promise<Conversation>;
  findById(id: string): Promise<Conversation | null>;
  findExisting(buyerId: string, sellerId: string, productId: string): Promise<Conversation | null>;
  findByParticipant(userId: string, options: PaginationOptions): Promise<PaginatedConversations>;
  updateLastMessageAt(id: string, at: DateTime): Promise<void>;
  updateModerationStatus(id: string, status: ModerationStatus): Promise<void>;
  updateMetadata(id: string, metadata: Record<string, unknown>): Promise<void>;
}

interface MessageRepository {
  create(data: CreateMessageInput): Promise<Message>;
  findById(id: string): Promise<Message | null>;
  findByConversation(conversationId: string, options: PaginationOptions): Promise<PaginatedMessages>;
  softDelete(id: string): Promise<void>;
  markAsDisputeEvidence(conversationId: string): Promise<void>;
  updateModerationStatus(id: string, status: string, score: number): Promise<void>;
}
```

### Use Cases

**`InitiateConversationUseCase`**
1. Validate participant roles match conversation type rules
2. Check self-chat guard (buyer ≠ seller)
3. Check existing conversation dedup (`findExisting`)
4. Check rate limit (Redis): 20 new conversations / 60 min
5. Check user block table
6. Create `Conversation` + `ConversationParticipant` records in a transaction
7. Auto-send initial `PRODUCT_CARD` + `TEXT` system message for `BUYER_SELLER`
8. Publish `conversation.created` to Redis
9. Return conversation

**`SendMessageUseCase`**
1. Load conversation + verify sender is participant (403 if not)
2. Check message rate limit (Redis): 200 messages / 60 min
3. Check block status
4. Validate message payload by type (content length, file format, coordinate range, etc.)
5. For `PRODUCT_CARD`: fetch catalog snapshot; for `ORDER_REFERENCE`: verify order access
6. Run Risk Engine → compute spam score
7. Persist message (with `moderationStatus` set by spam score)
8. Update `Conversation.lastMessageAt`
9. Publish to `chat:conv:{conversationId}` Redis channel
10. Trigger `NotificationService` for offline participants
11. Return persisted message

**`MarkReadUseCase`**
1. Verify participant membership
2. Update `ConversationParticipant.lastReadAt = now()`
3. Publish `read_receipt` event to Redis channel

**`GetConversationListUseCase`**
1. Query `ConversationParticipant` for userId, ordered by `lastMessageAt DESC`
2. Enrich each item: unread count, last message preview (100 chars), other participant display name
3. Paginate (default 20, max 50)

**`SearchConversationsUseCase`**
1. Validate query length [2, 100]
2. Query Meilisearch index `chat_conversations`
3. Return matching conversations

### WebSocket Gateway

```typescript
// Connection lifecycle
onConnect(ws, userId):
  store ws in memory map: connections[userId] = ws
  set Redis presence: SET chat:presence:{userId} 1 EX 60
  subscribe to Redis channels for all user's conversations
  send undelivered messages since lastReadAt

onHeartbeat(userId):
  refresh Redis presence: SET chat:presence:{userId} 1 EX 60

onDisconnect(userId):
  remove from memory map
  let Redis TTL expire naturally (60s)

// Inbound (client → server)
onMessage(ws, payload):
  if payload.type === 'heartbeat' → refresh presence
  if payload.type === 'read_receipt' → call MarkReadUseCase

// Outbound (Redis → client)
onRedisMessage(channel, payload):
  extract conversationId from channel name
  find all ws connections for participants of that conversation
  send payload to each connected ws
```

### Risk Engine

```typescript
class RiskEngine {
  computeSpamScore(message: CreateMessageInput, context: SenderContext): SpamScoreResult {
    const signals: Record<string, number> = {};

    // Signal 1: external URL density
    signals.urlDensity = countExternalUrls(message.content) * 15;

    // Signal 2: known phishing domain
    signals.phishingDomain = containsPhishingDomain(message.content, this.blocklist) ? 100 : 0;

    // Signal 3: message frequency (from Redis counter)
    signals.frequency = context.messagesLast5Min > 20 ? 30 : 0;

    // Signal 4: mass messaging (same content to >5 conversations in 5 min)
    signals.massMessing = context.sameContentConversations > 5 ? 85 : 0;

    const score = Math.min(100, Math.max(...Object.values(signals)));
    return { score, signals };
  }
}
```

Phishing domain blocklist is stored in Redis as a Set (`chat:blocklist:domains`) and can be updated by operators via admin API without deployment.

---

## Data Models

### Prisma Schema Additions

```prisma
enum Chat_ConversationType {
  BUYER_SELLER
  SELLER_SUPPLIER
  BUYER_COURIER
  SELLER_TEAM
}

enum Chat_MessageType {
  TEXT
  IMAGE
  VOICE_NOTE
  PRODUCT_CARD
  ORDER_REFERENCE
  LOCATION_PIN
  QUICK_ACTION
}

enum Chat_ModerationStatus {
  ACTIVE
  FLAGGED
  BLOCKED
  ARCHIVED
}

enum Chat_ParticipantRole {
  BUYER
  SELLER
  SUPPLIER
  COURIER
}

model Chat_Conversation {
  id                      String                    @id @default(cuid()) @db.VarChar(64)
  type                    Chat_ConversationType
  moderationStatus        Chat_ModerationStatus     @default(ACTIVE)
  relatedProductId        String?                   @db.VarChar(64)
  relatedOrderId          String?                   @db.VarChar(64)
  relatedShipmentId       String?                   @db.VarChar(64)
  relatedSupplierRequestId String?                  @db.VarChar(64)
  metadata                Json?
  lastMessageAt           DateTime?                 @db.Timestamp(6)
  createdAt               DateTime                  @default(now()) @db.Timestamp(6)
  updatedAt               DateTime                  @updatedAt @db.Timestamp(6)

  participants            Chat_ConversationParticipant[]
  messages                Chat_Message[]

  @@index([relatedOrderId])
  @@index([relatedProductId])
  @@index([lastMessageAt])
  @@map("chat_conversations")
}

model Chat_ConversationParticipant {
  conversationId  String                @db.VarChar(64)
  userId          String                @db.VarChar(64)
  role            Chat_ParticipantRole
  lastReadAt      DateTime?             @db.Timestamp(6)
  isMuted         Boolean               @default(false)
  joinedAt        DateTime              @default(now()) @db.Timestamp(6)

  conversation    Chat_Conversation     @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@id([conversationId, userId])
  @@index([userId])
  @@map("chat_conversation_participants")
}

model Chat_Message {
  id                String                @id @default(cuid()) @db.VarChar(64)
  conversationId    String                @db.VarChar(64)
  senderId          String                @db.VarChar(64)
  type              Chat_MessageType
  content           String?
  metadata          Json?
  moderationStatus  Chat_ModerationStatus @default(ACTIVE)
  spamScore         Int?
  isDisputeEvidence Boolean               @default(false)
  deletedAt         DateTime?             @db.Timestamp(6)
  createdAt         DateTime              @default(now()) @db.Timestamp(6)

  conversation      Chat_Conversation     @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  spamScoreLogs     Chat_SpamScoreLog[]

  @@index([conversationId, createdAt])
  @@index([senderId])
  @@map("chat_messages")
}

model Chat_UserBlock {
  blockerId   String   @db.VarChar(64)
  blockedId   String   @db.VarChar(64)
  createdAt   DateTime @default(now()) @db.Timestamp(6)

  @@id([blockerId, blockedId])
  @@index([blockedId])
  @@map("chat_user_blocks")
}

model Chat_ModerationReport {
  id             String   @id @default(cuid()) @db.VarChar(64)
  reporterId     String   @db.VarChar(64)
  messageId      String   @db.VarChar(64)
  conversationId String   @db.VarChar(64)
  reason         String
  reportedAt     DateTime @default(now()) @db.Timestamp(6)

  @@index([conversationId])
  @@index([reporterId])
  @@map("chat_moderation_reports")
}

model Chat_SpamScoreLog {
  id          String   @id @default(cuid()) @db.VarChar(64)
  messageId   String   @db.VarChar(64)
  score       Int
  signals     Json
  computedAt  DateTime @default(now()) @db.Timestamp(6)

  message     Chat_Message @relation(fields: [messageId], references: [id], onDelete: Cascade)

  @@index([messageId])
  @@map("chat_spam_score_logs")
}

model Chat_CheckoutLink {
  id             String   @id @default(cuid()) @db.VarChar(64)
  conversationId String   @db.VarChar(64)
  messageId      String   @db.VarChar(64)
  checkoutUrl    String
  isUsed         Boolean  @default(false)
  expiresAt      DateTime @db.Timestamp(6)
  createdAt      DateTime @default(now()) @db.Timestamp(6)

  @@index([conversationId])
  @@index([expiresAt])
  @@map("chat_checkout_links")
}
```

---

## Redis Data Structures

| Key Pattern | Type | TTL | Purpose |
|---|---|---|---|
| `chat:presence:{userId}` | String (`1`) | 60s | Online/offline presence |
| `chat:ratelimit:conv:{userId}` | String (counter) | 3600s rolling | New conversation rate limit |
| `chat:ratelimit:msg:{userId}` | String (counter) | 3600s rolling | Message send rate limit |
| `chat:ratelimit:massmsg:{userId}:{contentHash}` | String (counter) | 300s | Mass-messaging detection |
| `chat:conv:{conversationId}` | Pub/Sub channel | — | Real-time message fan-out |
| `chat:blocklist:domains` | Set | — | Phishing domain blocklist |
| `chat:penaltyscore:{userId}` | String (`85`) | 3600s | Elevated spam score for penalised users |

Rate limiting uses `INCR` + `EXPIRE` (set on first increment only) for atomic rolling windows.

---

## API Design

### REST Endpoints

```
POST   /api/chat/v1/conversations                        Initiate conversation
GET    /api/chat/v1/conversations                        List user's conversations
GET    /api/chat/v1/conversations/search?q=              Search conversations
GET    /api/chat/v1/conversations/:id                    Get conversation detail
POST   /api/chat/v1/conversations/:id/messages           Send message
GET    /api/chat/v1/conversations/:id/messages           Get message history
PUT    /api/chat/v1/conversations/:id/read               Mark conversation as read
POST   /api/chat/v1/conversations/:id/mute               Mute conversation
DELETE /api/chat/v1/conversations/:id/mute               Unmute conversation
POST   /api/chat/v1/messages/:id/report                  Report a message
DELETE /api/chat/v1/messages/:id                         Soft-delete a message
POST   /api/chat/v1/users/:id/block                      Block a user
DELETE /api/chat/v1/users/:id/block                      Unblock a user
POST   /api/chat/v1/media/upload                         Upload image or voice note
GET    /api/chat/v1/admin/blocklist/domains              Get phishing domain list
POST   /api/chat/v1/admin/blocklist/domains              Add domain to blocklist
DELETE /api/chat/v1/admin/blocklist/domains/:domain      Remove domain
```

### WebSocket Events

```
// Client → Server
{ type: 'heartbeat' }
{ type: 'read_receipt', conversationId: string }

// Server → Client
{ type: 'message',        data: MessageDto }
{ type: 'read_receipt',   data: { conversationId, userId, lastReadAt } }
{ type: 'presence',       data: { userId, online: boolean } }
{ type: 'conversation_archived', data: { conversationId } }
{ type: 'message_blocked', data: { tempId: string } }   // sender-only
```

### Key Request/Response Shapes

```typescript
// POST /conversations
interface InitiateConversationRequest {
  type: Chat_ConversationType;
  recipientId: string;
  relatedProductId?: string;
  relatedOrderId?: string;
  relatedSupplierRequestId?: string;
}

// POST /conversations/:id/messages
interface SendMessageRequest {
  type: Chat_MessageType;
  content?: string;                  // TEXT only
  metadata?: {
    // IMAGE / VOICE_NOTE: set after media upload
    mediaUrl?: string;
    thumbnailUrl?: string;
    durationSeconds?: number;
    // PRODUCT_CARD
    productId?: string;
    // ORDER_REFERENCE
    orderId?: string;
    // LOCATION_PIN
    latitude?: number;
    longitude?: number;
    label?: string;
    // QUICK_ACTION
    actionType?: 'CONFIRM_AVAILABILITY' | 'REQUEST_QUOTE' | 'TRACK_ORDER' | 'ACCEPT_OFFER' | 'DECLINE_OFFER';
  };
}

// MessageDto (response)
interface MessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  type: Chat_MessageType;
  content: string | null;
  metadata: Record<string, unknown>;
  flagged: boolean;
  createdAt: string;
}
```

---

## Media Upload Flow

```
1. Client calls POST /api/chat/v1/media/upload
   - multipart/form-data: file + mediaType (image | voice_note)

2. chat-service validates:
   - IMAGE: JPEG/PNG/WebP, max 10 MB
   - VOICE_NOTE: OGG/OPUS or M4A, max 15 MB, max 300s

3. Upload original to S3: chat/media/{userId}/{uuid}.{ext}

4. For IMAGE: generate 300×300 thumbnail → upload to S3: chat/media/{userId}/{uuid}_thumb.{ext}

5. For VOICE_NOTE: extract duration via ffprobe (or client-provided header)

6. Return { mediaUrl, thumbnailUrl?, durationSeconds? }

7. Client includes mediaUrl in subsequent SendMessage request
```

---

## Notification Integration

The chat-service calls the existing `Notification_Service` HTTP API after persisting each message:

```typescript
async function notifyOfflineParticipants(message: Message, conversation: Conversation) {
  const participants = await getParticipants(conversation.id);
  for (const p of participants) {
    if (p.userId === message.senderId) continue;
    if (p.isMuted) continue;
    const isOnline = await redis.get(`chat:presence:${p.userId}`);
    if (isOnline) continue;

    await notificationClient.send({
      userId: p.userId,
      type: 'CHAT_MESSAGE',
      priority: 'HIGH',
      channels: ['PUSH', 'SMS', 'EMAIL'],   // fallback chain
      data: {
        senderName: await resolveDisplayName(message.senderId),
        preview: truncate(message.content ?? messageTypeLabel(message.type), 80),
        deepLink: `/chat/${conversation.id}`,
      },
    });
  }
}
```

SMS fallback applies only to `TEXT` and `VOICE_NOTE` message types. Email fallback applies when no phone number is available.

---

## Meilisearch Indexing

Index name: `chat_conversations`

```typescript
interface ChatConversationIndex {
  id: string;                    // conversationId
  participantNames: string[];    // display names of all participants
  lastMessagePreview: string;    // truncated to 100 chars
  lastMessageAt: number;         // Unix timestamp for sorting
  type: string;
  relatedProductId: string | null;
  relatedOrderId: string | null;
}
```

Indexed on: `participantNames`, `lastMessagePreview`
Sorted by: `lastMessageAt DESC`

The index is updated asynchronously after each message is persisted (fire-and-forget with retry on failure).

---

## Marketplace Intelligence Events

Emitted to the analytics pipeline (existing `Analytics_Event` table via outbox pattern):

```typescript
// DEMAND_SIGNAL: >10 unique buyers ask about same unavailable product in 24h
{
  type: 'CHAT_DEMAND_SIGNAL',
  data: { productId: string, count: number, windowStart: string }
}

// SUPPLIER_RISK_SIGNAL: supplier mentioned in >3 complaints in 7 days
{
  type: 'CHAT_SUPPLIER_RISK_SIGNAL',
  data: { supplierId: string, count: number }
}
```

No PII (names, phone numbers, message content) is included in any event payload. Signals are computed by a scheduled job running every hour against aggregated Redis counters.

---

## Correctness Properties and Test Strategy

**Library**: `fast-check` (TypeScript, consistent with existing specs)
**Minimum iterations**: 100 per property

| Property | Test Description |
|---|---|
| **P1: Ordering invariant** | Generate N messages with random `createdAt` values; persist in random order; fetch history; assert response is sorted `createdAt ASC` |
| **P2: Read-receipt idempotence** | For any participant, after `markRead()`, fetch conversation list; assert `unreadCount === 0` regardless of how many times `markRead()` is called |
| **P3: Access control invariant** | For any `(userId, conversationId)` where user is not a participant, every send/read/list call returns HTTP 403 |
| **P4: Media round-trip** | For any valid image/voice-note upload (correct format, within limits), the returned `mediaUrl` resolves to the stored file with matching content hash |
| **P5: Snapshot immutability** | For any `PRODUCT_CARD` message, update the underlying product record; re-fetch the message; assert `metadata` equals the original snapshot |
| **P6: Rate-limit atomicity** | Fire 30 concurrent `InitiateConversation` requests for the same user; assert exactly 20 succeed and 10 receive HTTP 429 |

---

## Error Handling

| Scenario | HTTP | Error Code |
|---|---|---|
| Sender not a conversation participant | 403 | `CHAT_ACCESS_DENIED` |
| Recipient has blocked sender | 403 | `CHAT_RECIPIENT_BLOCKED` |
| Order access denied for ORDER_REFERENCE | 403 | `CHAT_ORDER_ACCESS_DENIED` |
| Invalid product reference | 422 | `CHAT_INVALID_PRODUCT_REFERENCE` |
| Text content out of range [1, 4000] | 422 | `VALIDATION_ERROR` |
| Image format/size invalid | 422 | `VALIDATION_ERROR` |
| Voice note format/size/duration invalid | 422 | `VALIDATION_ERROR` |
| Invalid coordinates | 422 | `VALIDATION_ERROR` |
| Invalid actionType | 422 | `VALIDATION_ERROR` |
| Search query < 2 chars | 422 | `VALIDATION_ERROR` |
| Conversation rate limit exceeded | 429 | `CHAT_RATE_LIMIT_EXCEEDED` |
| Message rate limit exceeded | 429 | `CHAT_MESSAGE_RATE_LIMIT_EXCEEDED` |
| Message blocked by Risk Engine | — | Sender notified via WS `message_blocked` event |
| Archived conversation — new message attempt | 403 | `CHAT_CONVERSATION_ARCHIVED` |

All error responses follow the existing `ApiResponse` envelope:

```json
{
  "success": false,
  "error": {
    "code": "CHAT_RATE_LIMIT_EXCEEDED",
    "message": "You have reached the maximum number of new conversations for this hour."
  }
}
```
