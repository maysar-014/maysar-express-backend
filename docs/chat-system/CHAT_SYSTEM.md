# Maysar Chat System — Developer Documentation

## Overview

The Maysar Chat System is the commerce communication layer for the Maysar marketplace. It is not a generic messenger — every conversation is contextually linked to a product, order, shipment, or supplier contract. The system is implemented as a dedicated `chat-service` module within the monorepo.

---

## Architecture

```
Client (Web / Mobile)
    │
    ├── REST API  →  /api/chat/v1/*
    └── WebSocket →  /ws?userId=<id>
                         │
                    chat-service
                    ├── ConversationController
                    ├── MessageController
                    ├── MediaController
                    ├── ModerationController
                    ├── AdminController
                    ├── WsGateway
                    ├── RiskEngine
                    └── Background Jobs
                         │
          ┌──────────────┼──────────────┐
          │              │              │
      PostgreSQL       Redis         MinIO (S3)
    (chat tables)  (presence,      (images,
                   rate limits,    voice notes)
                   pub/sub)
```

### Key design decisions

- **Context-first** — every `Conversation` carries `relatedProductId`, `relatedOrderId`, `relatedShipmentId`, `relatedSupplierRequestId`
- **Persist then fan-out** — messages are written to PostgreSQL first, then published to Redis Pub/Sub for WebSocket delivery
- **Risk Engine in-process** — spam scoring runs synchronously before delivery; score ≥ 90 blocks, ≥ 70 flags
- **MinIO for local dev** — S3-compatible object storage started via `npm run infra:up`

---

## File Structure

```
services/chat-service/
├── index.ts                          ← ChatModule (entry point)
└── src/
    ├── config/
    │   └── chat.config.ts            ← All env-driven config
    ├── shared/
    │   ├── errors.ts                 ← ChatError + factory functions
    │   └── response.ts               ← ApiResponse envelope helpers
    ├── domain/
    │   ├── entities/
    │   │   ├── conversation.entity.ts
    │   │   ├── message.entity.ts
    │   │   └── moderation.entity.ts
    │   ├── repositories/
    │   │   ├── conversation.repository.interface.ts
    │   │   ├── message.repository.interface.ts
    │   │   └── moderation.repository.interface.ts
    │   └── risk/
    │       └── risk-engine.ts        ← Spam scoring + blocklist
    ├── application/
    │   └── use-cases/
    │       ├── initiate-conversation.use-case.ts
    │       ├── send-message.use-case.ts
    │       ├── mark-read.use-case.ts
    │       ├── get-conversation-list.use-case.ts
    │       ├── search-conversations.use-case.ts
    │       ├── moderation.use-case.ts
    │       └── media-upload.use-case.ts
    ├── infrastructure/
    │   ├── repositories/
    │   │   ├── prisma-conversation.repository.ts
    │   │   ├── prisma-message.repository.ts
    │   │   └── prisma-moderation.repository.ts
    │   ├── redis/
    │   │   ├── presence.store.ts
    │   │   ├── rate-limiter.ts
    │   │   └── pubsub.ts
    │   ├── media/
    │   │   └── s3-media.store.ts     ← MinIO / S3 uploads
    │   ├── notifications/
    │   │   └── notification.client.ts
    │   ├── search/
    │   │   └── meilisearch.indexer.ts
    │   ├── websocket/
    │   │   └── ws-gateway.ts
    │   └── jobs/
    │       ├── marketplace-intelligence.job.ts  ← hourly
    │       ├── retention.job.ts                 ← daily
    │       └── archive-courier-conversations.job.ts ← event-driven
    ├── api/
    │   ├── controllers/
    │   │   ├── conversation.controller.ts
    │   │   ├── message.controller.ts
    │   │   ├── media.controller.ts
    │   │   ├── moderation.controller.ts
    │   │   └── admin.controller.ts
    │   └── routes/
    │       └── chat.routes.ts
    └── types/
        └── multer.d.ts
```

---

## Database Tables

All tables are prefixed `chat_` and live in the shared PostgreSQL database.

| Table | Purpose |
|---|---|
| `chat_conversations` | One record per conversation thread |
| `chat_conversation_participants` | Composite PK `(conversationId, userId)` |
| `chat_messages` | All messages, soft-deletable |
| `chat_user_blocks` | Block relationships |
| `chat_moderation_reports` | User-submitted reports |
| `chat_spam_score_logs` | Audit trail for Risk Engine scores |
| `chat_checkout_links` | Single-use checkout URLs from negotiation mode |

---

## Environment Variables

Add these to `.env` (already present after setup):

```env
# MinIO / S3
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=maysar
S3_SECRET_ACCESS_KEY=maysar2026
S3_BUCKET_CHAT_MEDIA=chat-media
S3_FORCE_PATH_STYLE=true          # true for MinIO, false for AWS S3

# Notification service
NOTIFICATION_SERVICE_URL=http://localhost:3000/api/notifications
```

All other variables (Redis, Meilisearch, JWT) are shared with the rest of the monorepo.

---

## Starting the Infrastructure

```bash
# Start all infra including MinIO
npm run infra:up

# MinIO web console → http://localhost:9001
# Login: maysar / maysar2026
# The chat-media bucket is created automatically on first start
```

---

## REST API Reference

Base path: `/api/chat/v1`

All endpoints require a valid JWT (`Authorization: Bearer <token>`) or gateway headers (`x-user-id`, `x-user-roles`).

### Conversations

#### Start a conversation
```http
POST /api/chat/v1/conversations
Content-Type: application/json

{
  "type": "BUYER_SELLER",
  "recipientId": "usr_seller_abc",
  "initiatorRole": "BUYER",
  "recipientRole": "SELLER",
  "relatedProductId": "prod_xyz"
}
```

Response `201`:
```json
{
  "success": true,
  "data": {
    "id": "conv_abc123",
    "type": "BUYER_SELLER",
    "moderationStatus": "ACTIVE",
    "relatedProductId": "prod_xyz",
    "relatedOrderId": null,
    "lastMessageAt": "2026-05-14T10:00:00.000Z",
    "createdAt": "2026-05-14T10:00:00.000Z"
  }
}
```

Conversation types: `BUYER_SELLER` | `SELLER_SUPPLIER` | `BUYER_COURIER` | `SELLER_TEAM`

#### List conversations
```http
GET /api/chat/v1/conversations?limit=20&cursor=<ISO-timestamp>
```

#### Search conversations
```http
GET /api/chat/v1/conversations/search?q=laptop&limit=10
```

#### Get single conversation
```http
GET /api/chat/v1/conversations/:id
```

#### Mark conversation as read
```http
PUT /api/chat/v1/conversations/:id/read
```

#### Mute / unmute
```http
POST   /api/chat/v1/conversations/:id/mute
DELETE /api/chat/v1/conversations/:id/mute
```

---

### Messages

#### Send a message
```http
POST /api/chat/v1/conversations/:id/messages
Content-Type: application/json

{
  "type": "TEXT",
  "content": "Is this item still available?"
}
```

Message types and their required metadata:

| type | required fields |
|---|---|
| `TEXT` | `content` (1–4000 chars) |
| `IMAGE` | `metadata.mediaUrl`, `metadata.thumbnailUrl` |
| `VOICE_NOTE` | `metadata.mediaUrl`, `metadata.durationSeconds` |
| `PRODUCT_CARD` | `metadata.productId` |
| `ORDER_REFERENCE` | `metadata.orderId` |
| `LOCATION_PIN` | `metadata.latitude`, `metadata.longitude` |
| `QUICK_ACTION` | `metadata.actionType` |

Quick action types: `CONFIRM_AVAILABILITY` | `REQUEST_QUOTE` | `TRACK_ORDER` | `ACCEPT_OFFER` | `DECLINE_OFFER`

#### List messages in a conversation
```http
GET /api/chat/v1/conversations/:id/messages?limit=50&cursor=<ISO-timestamp>
```

Messages are returned in `createdAt ASC` order.

#### Delete a message (soft)
```http
DELETE /api/chat/v1/conversations/:id/messages/:messageId
```

Content is replaced with `[message deleted]`. The record is retained for dispute purposes.

#### Report a message
```http
POST /api/chat/v1/messages/:messageId/report
Content-Type: application/json

{
  "conversationId": "conv_abc123",
  "reason": "Spam / phishing link"
}
```

---

### Media Upload

Upload before sending an IMAGE or VOICE_NOTE message. The returned URL goes into `metadata.mediaUrl`.

```http
POST /api/chat/v1/media/upload
Content-Type: multipart/form-data

file=<binary>
mediaType=image          # or voice_note
durationSeconds=45       # required for voice_note only
```

Response:
```json
{
  "success": true,
  "data": {
    "mediaUrl": "http://localhost:9000/chat-media/chat/media/usr_abc/uuid.jpg",
    "thumbnailUrl": "http://localhost:9000/chat-media/chat/media/usr_abc/uuid_thumb.jpg"
  }
}
```

Limits:
- Images: JPEG / PNG / WebP, max 10 MB
- Voice notes: OGG/OPUS or M4A, max 15 MB, max 300 seconds

---

### Moderation

#### Block a user
```http
POST   /api/chat/v1/users/:userId/block
DELETE /api/chat/v1/users/:userId/block
```

---

### Admin — Phishing Blocklist

Requires `admin` role.

```http
GET    /api/chat/v1/admin/blocklist/domains
POST   /api/chat/v1/admin/blocklist/domains    { "domain": "scam-site.com" }
DELETE /api/chat/v1/admin/blocklist/domains/:domain
```

The blocklist is stored in Redis (`chat:blocklist:domains`) and takes effect immediately — no deployment needed.

---

## WebSocket API

Connect:
```
ws://localhost:3000/ws?userId=<userId>
```

Or via gateway header:
```
ws://localhost:3000/ws
x-user-id: usr_abc123
```

### Inbound events (client → server)

```json
{ "type": "heartbeat" }
{ "type": "read_receipt", "conversationId": "conv_abc123" }
```

Send a heartbeat every 30 seconds to stay marked as online.

### Outbound events (server → client)

```json
{ "type": "message",      "data": { ...MessageDto } }
{ "type": "read_receipt", "data": { "conversationId": "...", "userId": "...", "lastReadAt": "..." } }
{ "type": "presence",     "data": { "userId": "...", "online": true } }
{ "type": "conversation_archived", "data": { "conversationId": "..." } }
{ "type": "message_blocked", "data": { "tempId": "..." } }
```

On connect, the server automatically delivers all unread messages since the participant's `lastReadAt`.

---

## Typical Flows

### Buyer opens chat from product page

```
1. POST /api/chat/v1/conversations
   { type: "BUYER_SELLER", recipientId: sellerId, relatedProductId: productId, ... }

2. Server auto-sends:
   - PRODUCT_CARD message (snapshot of product at send time)
   - TEXT message: "Hi, is this item still available?"

3. Connect WebSocket → receive real-time messages
```

### Seller sends a product card

```
1. POST /api/chat/v1/media/upload  (if image needed)
2. POST /api/chat/v1/conversations/:id/messages
   {
     "type": "PRODUCT_CARD",
     "metadata": { "productId": "prod_xyz" }
   }
   → Server snapshots title, price, stockStatus, addToCartUrl at send time
```

### Sending a voice note

```
1. POST /api/chat/v1/media/upload
   mediaType=voice_note, durationSeconds=42, file=<ogg binary>
   → { mediaUrl: "...", durationSeconds: 42 }

2. POST /api/chat/v1/conversations/:id/messages
   {
     "type": "VOICE_NOTE",
     "metadata": { "mediaUrl": "...", "durationSeconds": 42 }
   }
```

### Courier delivery coordination

```
1. BUYER_COURIER conversation is created automatically when a delivery is assigned
2. Buyer or courier sends LOCATION_PIN:
   {
     "type": "LOCATION_PIN",
     "metadata": { "latitude": -6.7924, "longitude": 39.2083, "label": "Kariakoo Market" }
   }
3. Conversation is auto-archived when order reaches DELIVERED or CANCELLED
```

---

## Trust & Safety

### Spam scoring

Every TEXT message is scored 0–100 by the Risk Engine:

| Score | Action |
|---|---|
| < 70 | Delivered normally |
| 70–89 | Delivered with `flagged: true` indicator |
| ≥ 90 | Blocked — not delivered to recipient |

Signals: external URL density, phishing domain match, message frequency, mass-messaging pattern.

### Rate limits (per user, rolling 60-minute window)

| Limit | Value |
|---|---|
| New conversations | 20 / hour |
| Messages sent | 200 / hour |

Exceeded limits return HTTP 429.

### Phone masking

Raw phone numbers are never included in any chat API response. The `phoneNumber` field is stripped at the serialisation layer.

---

## Background Jobs

| Job | Schedule | Purpose |
|---|---|---|
| `MarketplaceIntelligenceJob` | Every hour | Emits `CHAT_DEMAND_SIGNAL` and `CHAT_SUPPLIER_RISK_SIGNAL` to analytics pipeline |
| `RetentionJob` | Daily at 02:00 UTC | Hard-deletes soft-deleted messages older than 365 days; clears dispute evidence flags after 90-day grace |
| `ArchiveCourierConversationsJob` | Event-driven | Archives `BUYER_COURIER` conversations when order reaches `DELIVERED` or `CANCELLED` |

---

## Running Tests

```bash
# Property-based tests (8 tests, 100 iterations each)
npx jest --selectProjects=chat-service --testPathPattern="chat-properties" --no-coverage
```

All 6 correctness properties are verified:
1. Message ordering invariant (createdAt ASC)
2. Read-receipt idempotence (unread count = 0 after markRead)
3. Access control invariant (non-participants get 403)
4. Media round-trip (mediaUrl resolves to stored file)
5. Snapshot immutability (product card metadata frozen at send time)
6. Rate-limit atomicity (exactly 20 conversations allowed per window)

---

## Error Codes

| Code | HTTP | Meaning |
|---|---|---|
| `CHAT_ACCESS_DENIED` | 403 | Not a participant in this conversation |
| `CHAT_RECIPIENT_BLOCKED` | 403 | Recipient has blocked the sender |
| `CHAT_ORDER_ACCESS_DENIED` | 403 | Sender is not a party to the referenced order |
| `CHAT_CONVERSATION_ARCHIVED` | 403 | Conversation is archived (e.g. delivery completed) |
| `CHAT_RATE_LIMIT_EXCEEDED` | 429 | Too many new conversations this hour |
| `CHAT_MESSAGE_RATE_LIMIT_EXCEEDED` | 429 | Too many messages this hour |
| `CHAT_INVALID_PRODUCT_REFERENCE` | 422 | Product ID does not exist in catalog |
| `VALIDATION_ERROR` | 422 | Invalid input (content length, coordinates, etc.) |
| `CHAT_NOT_FOUND` | 404 | Conversation or message not found |

All errors follow the standard envelope:
```json
{
  "success": false,
  "error": {
    "code": "CHAT_RATE_LIMIT_EXCEEDED",
    "message": "You have reached the maximum number of new conversations for this hour."
  }
}
```
