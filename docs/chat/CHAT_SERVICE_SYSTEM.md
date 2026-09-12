# Maysar Chat Service — Implementation Reference (As-Built)

> **Status:** Live and verified — commerce-contextual messaging, risk engine moderation, real-time WebSocket delivery, media upload, push notifications for offline participants.
> **Last updated:** September 2026
> **Scope:** `services/chat-service`

---

## 1. Guiding Principles Enforced by the Code

| Principle | Where it lives in code |
|---|---|
| **Every conversation requires a commerce context** | `InitiateConversationUseCase` enforces at least one of `relatedProductId`, `relatedOrderId`, or `relatedShipmentId` |
| **Risk engine scores every TEXT message before delivery** | `SendMessageUseCase` calls `RiskEngine.score()` before persisting; score ≥ 90 → message blocked, score 70–89 → `moderationStatus: FLAGGED` |
| **BUYER_COURIER conversations auto-archive on delivery** | `ArchiveCourierConversationsJob` subscribes to `OrderDelivered` and `OrderCancelled` events |
| **Order status changes post system messages** | `OrderChatHandler` handles `order.pending_seller_verification`, `order.seller_verified`, `order.seller_declined` and posts `SYSTEM` messages into the conversation |
| **PRODUCT_CARD is a snapshot, not a live reference** | `catalogClient.getProductSnapshot()` captures title/price/stock at send time — immutable after sending |
| **Rate limiting is Redis-backed per user** | `RedisRateLimiter` enforces 20 conversations/hour and 200 messages/hour per user |
| **Presence is tracked per user per Redis key** | `RedisPresenceStore` tracks online/offline; offline participants receive push via `NotificationClient` |
| **Pub/Sub uses separate Redis connections** | `RedisPubSub` uses dedicated publisher and subscriber connections to avoid command conflicts |
| **Phishing blocklist lives in Redis** | `RiskEngine` checks domain blocklist from Redis on every URL-containing message; `adminCtrl.addDomain` updates it immediately |

---

## 2. Domain Model

### 2.1 Conversation Entity (`domain/entities/conversation.entity.ts`)

```
ConversationType:  BUYER_SELLER | SELLER_SUPPLIER | BUYER_COURIER | SELLER_TEAM
ModerationStatus:  ACTIVE | FLAGGED | BLOCKED | ARCHIVED
```

Fields: `id`, `type`, `moderationStatus`, `relatedProductId`, `relatedOrderId`, `relatedShipmentId`, `relatedSupplierRequestId`, `metadata`, `lastMessageAt`, `createdAt`

### 2.2 ConversationParticipant

Fields: `conversationId`, `userId`, `role` (`BUYER | SELLER | SUPPLIER | COURIER`), `lastReadAt`, `isMuted`, `joinedAt`

Unread count = messages after `lastReadAt`.

### 2.3 Message Entity (`domain/entities/message.entity.ts`)

```
MessageType: TEXT | IMAGE | VOICE_NOTE | PRODUCT_CARD | ORDER_REFERENCE | ORDER_CARD | LOCATION_PIN | QUICK_ACTION
MessageModerationStatus: ACTIVE | FLAGGED | BLOCKED
QuickActionType: CONFIRM_AVAILABILITY | REQUEST_QUOTE | TRACK_ORDER | ACCEPT_OFFER | DECLINE_OFFER | CONFIRM_ORDER | DECLINE_ORDER
```

Fields: `id`, `conversationId`, `senderId`, `type`, `content`, `metadata`, `moderationStatus`, `spamScore`, `moderationReason` (human-readable explanation for FLAGGED/BLOCKED; null when ACTIVE), `moderationSignals` (structured audit payload: score, signal breakdown, matchedPatterns[], anomalySignals[], phoneEvidence[], evaluatedAt), `isDisputeEvidence`, `deletedAt`, `createdAt`

**ORDER_CARD:** System-generated only — created by `OrderChatHandler` when an order is placed. Metadata: `{ orderId, items[], totalAmount, currency, actionButtons: ["CONFIRM_ORDER","DECLINE_ORDER"] }`. Not sendable via REST API.

Soft-deleted messages: `deletedAt` is set, content replaced with `[message deleted]`.

### 2.4 Moderation Entities (`domain/entities/moderation.entity.ts`)

- `UserBlock` — blocked user pairs
- `ModerationReport` — user reports
- `AdminModerationAction` — admin review actions (`APPROVE | CONFIRM_BLOCK | DELETE`)
- `SuspiciousPhrase` — dynamic phrase registry (`source: SEED | ADMIN | AUTO`, `matchType: SUBSTRING | REGEX`, `action: FLAG | BLOCK`, `language: EN | SW | OTHER`)
- `EmergingPattern` — auto-mined patterns (`status: PENDING | PROMOTED | DISMISSED`)

### 2.5 Risk Engine (`domain/risk/risk-engine.ts`)

**8-layer scoring model (score = max of all signal values, capped at 100):**

| Signal | Score range | Trigger |
|---|---|---|
| URL density | 0–60 | External URLs × 15 per URL |
| Phishing domain | 0 or 100 | Any URL matches Redis blocklist |
| Suspicious phrase | 0–100 | BLOCK match → 100; FLAG matches → `maxWeight + 10×(count-1)`, max 95 |
| Phone number | 0 or 70 or 95 | Phone alone → 70; phone + off-platform intent → 95 |
| Anomaly signals | 0–100 | Hidden control chars (+45), leet-speak (+55), spaced letters (+55), repeated chars (+35), CAPS flood (+30), encoded blobs (+40), link shorteners (+45), punctuation flood (+25), emoji flood (+20) |
| Message frequency | 0 or 30 | >20 messages in 5 min |
| Mass messaging | 0 or 85 | Same content to >5 conversations in 5 min |
| Penalty override | 0 or 85 | User previously detected mass-messaging (1-hour window) |

**Thresholds:**
- `< 70` → `ACTIVE`, delivered normally
- `70–89` → `FLAGGED`, delivered with `flagged: true` + `moderationReason` set
- `≥ 90` → `BLOCKED`, not delivered; `message_blocked` WS event sent to sender

**Content normalization (before phrase matching):**
Leet-speak decode (`tum@` → `tuma`), zero-width char removal, spaced-letter joining (`t u m a` → `tuma`), collapsed repeated chars, lowercasing. Defeats common evasion.

**Phrase registry:** 240+ seed phrases/patterns (English + Swahili). Admin can add/update/delete via API. Regex patterns support obfuscated variant matching. Redis-cached; updates take effect immediately.

**Phone detection:** Tanzanian format `(+255|0)[67]\d{2}-\d{3}-\d{3}`. Context-aware: phone alone = FLAG, phone + off-platform category match = BLOCK. Masked in explanations.

---

## 3. Application Layer (Use Cases)

| Use case | What it does |
|---|---|
| `InitiateConversationUseCase` | Validates participants, rate-limits, deduplicates (BUYER_SELLER + productId), creates conversation, auto-posts PRODUCT_CARD + greeting |
| `SendMessageUseCase` | Rate limit → risk score → persist (if not blocked) → pub/sub broadcast → notify offline participants → record frequency/mass-messaging |
| `MarkReadUseCase` | Updates `lastReadAt` → publishes `read_receipt` event via pub/sub |
| `GetConversationListUseCase` | Paginated conversations with unread counts |
| `SearchConversationsUseCase` | Full-text search via Meilisearch |
| `ModerationUseCase` | Block/unblock users, mute/unmute, report messages |
| `MediaUploadUseCase` | Validates file type/size → stores in S3 → returns `mediaUrl` + `thumbnailUrl` |
| `AdminModerationUseCase` | List/filter flagged+blocked messages, admin review (APPROVE/CONFIRM_BLOCK/DELETE) |
| `SuspiciousPhraseUseCase` | CRUD on phrase registry, seed bootstrap, pattern mining, promote/dismiss emerging patterns |

---

## 4. HTTP Surface

Mounted at `/api/chat` (module name `chat-service` → strip `-service` → `/api/chat`). All REST routes under `/v1/`.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/chat/v1/conversations` | JWT | Start conversation (deduplicates BUYER_SELLER+productId) |
| GET | `/api/chat/v1/conversations` | JWT | List conversations (paginated) |
| GET | `/api/chat/v1/conversations/search` | JWT | Search conversations |
| GET | `/api/chat/v1/conversations/:id` | JWT | Get conversation detail |
| PUT | `/api/chat/v1/conversations/:id/read` | JWT | Mark conversation as read |
| POST | `/api/chat/v1/conversations/:id/mute` | JWT | Mute conversation |
| DELETE | `/api/chat/v1/conversations/:id/mute` | JWT | Unmute conversation |
| POST | `/api/chat/v1/conversations/:id/messages` | JWT | Send message |
| GET | `/api/chat/v1/conversations/:id/messages` | JWT | List messages (paginated) |
| DELETE | `/api/chat/v1/conversations/:id/messages/:messageId` | JWT | Soft delete message |
| POST | `/api/chat/v1/messages/:messageId/report` | JWT | Report message |
| POST | `/api/chat/v1/media/upload` | JWT | Upload media (multipart) |
| POST | `/api/chat/v1/users/:userId/block` | JWT | Block user |
| DELETE | `/api/chat/v1/users/:userId/block` | JWT | Unblock user |

### Admin routes (require `admin` role)

| Method | Path | Description |
|---|---|---|
| GET | `/api/chat/v1/admin/blocklist/domains` | List phishing domain blocklist |
| POST | `/api/chat/v1/admin/blocklist/domains` | Add domain to blocklist |
| DELETE | `/api/chat/v1/admin/blocklist/domains/:domain` | Remove domain from blocklist |
| GET | `/api/chat/v1/admin/moderation/messages` | List flagged/blocked messages (`?status=FLAGGED\|BLOCKED\|ALL`) |
| GET | `/api/chat/v1/admin/moderation/messages/:messageId` | Message moderation detail (incl. signals, matched patterns) |
| POST | `/api/chat/v1/admin/moderation/messages/:messageId/review` | Review message (`action: APPROVE\|CONFIRM_BLOCK\|DELETE`, `notes?`) |
| GET | `/api/chat/v1/admin/moderation/phrases` | List phrase registry (`?activeOnly=true&category=...`) |
| GET | `/api/chat/v1/admin/moderation/phrases/:id` | Get phrase detail |
| POST | `/api/chat/v1/admin/moderation/phrases` | Create phrase |
| PUT | `/api/chat/v1/admin/moderation/phrases/:id` | Update phrase |
| DELETE | `/api/chat/v1/admin/moderation/phrases/:id` | Delete phrase |
| POST | `/api/chat/v1/admin/moderation/phrases/seed` | Bootstrap seed catalog |
| GET | `/api/chat/v1/admin/moderation/patterns` | List emerging patterns (`?status=PENDING\|PROMOTED\|DISMISSED`) |
| POST | `/api/chat/v1/admin/moderation/patterns/mine` | Trigger pattern mining (`?days=7`) |
| POST | `/api/chat/v1/admin/moderation/patterns/:id/promote` | Promote to phrase registry |
| DELETE | `/api/chat/v1/admin/moderation/patterns/:id` | Dismiss pattern |
| GET | `/api/chat/health` | Health check |

---

## 5. WebSocket Gateway (`infrastructure/websocket/ws-gateway.ts`)

Connection: `ws://{host}/ws?userId=<userId>` or `ws://{host}/ws` with `x-user-id` header.

The gateway connects to Redis Pub/Sub — messages published by `SendMessageUseCase` via `RedisPubSub` are fanned out to all connected clients in the conversation.

### Outbound events (server → client)

| Event type | When emitted |
|---|---|
| `message` | New message in a conversation the user participates in |
| `read_receipt` | Another participant marked the conversation as read |
| `presence` | User online/offline status change |
| `conversation_archived` | `BUYER_COURIER` conversation auto-archived after order delivered/cancelled |
| `message_blocked` | Risk engine blocked the sender's message — sent to sender only |

### Inbound events (client → server)

| Event type | What it does |
|---|---|
| `heartbeat` | Keeps user marked as online; missing heartbeats mark offline |
| `read_receipt` | `{ conversationId }` — triggers `MarkReadUseCase` |

---

## 6. Background Jobs

| Job | Schedule | What it does |
|---|---|---|
| `MarketplaceIntelligenceJob` | Periodic (on init) | Analyzes message patterns for product demand signals |
| `RetentionJob` | Periodic (on init) | Archives stale conversations, cleans expired data |
| `ArchiveCourierConversationsJob` | Event-driven | Archives `BUYER_COURIER` conversations on `OrderDelivered`/`OrderCancelled`; backfills on startup for missed events |
| `OrderChatHandler` | Event-driven | Creates `BUYER_SELLER` conversation + posts `ORDER_CARD` on order placement; posts status messages on seller verification/decline |
| `EmergingPatternsJob` | Hourly (`:15` past the hour) | Mines n-grams from recent flagged/blocked messages → saves qualifying patterns as `PENDING` emerging patterns for admin review |

### OrderChatHandler — event subscriptions

| Event | Action |
|---|---|
| `order.pending_seller_verification` | Creates (or reuses) `BUYER_SELLER` conversation + posts `ORDER_CARD` with items, total, and `CONFIRM_ORDER`/`DECLINE_ORDER` action buttons |
| `order.seller_verified` | Posts status message: "Seller confirmed your order" |
| `order.seller_declined` | Posts status message: "Seller declined — reason: ..." |

All handlers are idempotent — check for existing messages before posting.

---

## 7. Events Consumed

| Event | Handler | Action |
|---|---|---|
| `order.pending_seller_verification` | `OrderChatHandler` | Create conversation + ORDER_CARD |
| `order.seller_verified` | `OrderChatHandler` | Post confirmation message |
| `order.seller_declined` | `OrderChatHandler` | Post declined message |
| `OrderDelivered` | `ArchiveCourierConversationsJob` | Archive `BUYER_COURIER` conversation |
| `OrderCancelled` | `ArchiveCourierConversationsJob` | Archive `BUYER_COURIER` conversation |

---

## 8. Media Constraints

| Type | Formats | Max size | Max duration |
|---|---|---|---|
| Image | JPEG, PNG, WebP | 10 MB | — |
| Voice note | OGG/OPUS, M4A | 15 MB | 300 seconds |

Stored in S3 via `S3MediaStore`. `thumbnailUrl` generated for images (300×300, fit inside).

---

## 9. Rate Limits

| Action | Limit | Window |
|---|---|---|
| New conversations | 20 | 60 minutes |
| Messages sent | 200 | 60 minutes |

Enforced per `userId` via `RedisRateLimiter`. Both return HTTP 429 when exceeded.
