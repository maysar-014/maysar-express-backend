# Chat Feature — Frontend Guide

> **Base path:** `POST /api/chat/v1/...`  
> **Auth:** All endpoints require `Authorization: Bearer <token>` unless noted.  
> **Real-time:** WebSocket available at `ws://localhost:3000` (same origin) after HTTP auth.

---

## Overview

The chat system connects buyers, sellers, suppliers, and couriers. Every conversation is typed — the type determines who can talk to whom and what automated messages get sent. All messages are moderated in real-time for suspicious content.

---

## Conversation Types

| Type | Who initiates | Who receives | Auto-messages sent |
|------|--------------|-------------|-------------------|
| `BUYER_SELLER` | Buyer | Seller | Product card (if linked) + "Hi, is this item still available?" |
| `SELLER_SUPPLIER` | Seller only | Supplier | None |
| `BUYER_COURIER` | Buyer or Courier | Courier or Buyer | None |
| `SELLER_TEAM` | Seller | Team member | None |

---

## 1. Start a Conversation

```
POST /api/chat/v1/conversations
```

**Body:**
```json
{
  "recipientId":      "usr_01KRFZ...",
  "type":             "BUYER_SELLER",
  "initiatorRole":    "BUYER",
  "recipientRole":    "SELLER",
  "relatedProductId": "cat_01ABC...",
  "relatedOrderId":   "ORD-20261024-A1B2"
}
```

- `type`, `initiatorRole`, `recipientRole` all default to `BUYER_SELLER` / `BUYER` / `SELLER` if omitted.
- `relatedProductId`, `relatedOrderId`, `relatedShipmentId`, `relatedSupplierRequestId` are all optional.

**Idempotency:** When `type = BUYER_SELLER` AND `relatedProductId` is supplied, a second call with the same buyer+seller+productId returns the **existing** conversation — no duplicate is created. Without `relatedProductId`, each call creates a new conversation thread.

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "id": "cha_con_01M5...",
    "type": "BUYER_SELLER",
    "moderationStatus": "ACTIVE",
    "relatedProductId": "cat_01ABC...",
    "relatedOrderId": null,
    "lastMessageAt": "2026-10-24T21:59:00.000Z",
    "createdAt": "2026-10-24T21:59:00.000Z"
  }
}
```

**On `BUYER_SELLER` creation**, the system auto-sends two messages immediately:
1. A `PRODUCT_CARD` message (if `relatedProductId` was supplied)
2. A `TEXT` message: `"Hi, is this item still available?"`

The frontend should render these as the initial conversation state — no need to send them manually.

---

## 2. List Conversations

```
GET /api/chat/v1/conversations?limit=20&cursor=<ISO_timestamp>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "cha_con_01M5...",
        "type": "BUYER_SELLER",
        "moderationStatus": "ACTIVE",
        "relatedProductId": "cat_01ABC...",
        "lastMessageAt": "2026-10-24T22:00:00.000Z",
        "createdAt": "2026-10-24T21:59:00.000Z"
      }
    ],
    "nextCursor": "2026-10-24T21:59:00.000Z",
    "total": 5
  }
}
```

Paginate by passing `nextCursor` as the `cursor` query param.

---

## 3. Get a Single Conversation

```
GET /api/chat/v1/conversations/:conversationId
```

Returns the conversation only if the authenticated user is a participant. Returns `404` otherwise (security — does not leak that a conversation exists).

---

## 4. Send a Message

```
POST /api/chat/v1/conversations/:conversationId/messages
```

**Body:**
```json
{
  "type": "TEXT",
  "content": "Yes it's available, how many do you need?",
  "metadata": {}
}
```

**Message types:**

| Type | `content` | `metadata` |
|------|-----------|-----------|
| `TEXT` | The message text (max 4000 chars) | optional |
| `IMAGE` | Caption (optional) | `{ url, width, height, mimeType }` |
| `VOICE_NOTE` | null | `{ url, durationSeconds }` |
| `PRODUCT_CARD` | null | `{ productId }` |
| `ORDER_REFERENCE` | null | `{ orderId }` |
| `LOCATION_PIN` | Optional label | `{ lat, lng }` |
| `QUICK_ACTION` | null | `{ actionType: QuickActionType }` |

**Quick action types:** `CONFIRM_AVAILABILITY`, `REQUEST_QUOTE`, `TRACK_ORDER`, `ACCEPT_OFFER`, `DECLINE_OFFER`, `CONFIRM_ORDER`, `DECLINE_ORDER`

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "id": "cha_msg_01M5...",
    "conversationId": "cha_con_01M5...",
    "senderId": "usr_01KRFZ...",
    "type": "TEXT",
    "content": "Yes it's available",
    "metadata": {},
    "moderationStatus": "ACTIVE",
    "moderationReason": null,
    "spamScore": null,
    "isDisputeEvidence": false,
    "deletedAt": null,
    "createdAt": "2026-10-24T22:00:00.000Z"
  }
}
```

**Moderation:** Every message is scanned for suspicious content (phone numbers, external links, banned phrases). If flagged, `moderationStatus` is `"FLAGGED"` and `moderationReason` explains why. If `"BLOCKED"`, the message is hidden from the recipient but the sender sees it with a warning.

---

## 5. List Messages

```
GET /api/chat/v1/conversations/:conversationId/messages?limit=50&cursor=<ISO_timestamp>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "messages": [ ...Message[] ],
    "nextCursor": "2026-10-24T21:59:00.000Z",
    "total": 12
  }
}
```

Messages are ordered **oldest first** by default. Paginate backwards (load earlier messages) by passing the `createdAt` of the oldest visible message as `cursor`.

**Deleted messages:** `deletedAt` is set when a message is soft-deleted. Render as `"This message was deleted"` — the content is nulled out.

---

## 6. Mark Conversation as Read

```
PUT /api/chat/v1/conversations/:conversationId/read
```

Call this when the user opens a conversation. Updates the participant's `lastReadAt` timestamp, which drives unread counts. Returns `{ ok: true }`.

---

## 7. Delete a Message (Soft Delete)

```
DELETE /api/chat/v1/conversations/:conversationId/messages/:messageId
```

Only the sender can delete their own messages. Sets `deletedAt` — the record is kept for dispute evidence purposes. Returns `{ ok: true }`.

---

## 8. Report a Message

```
POST /api/chat/v1/messages/:messageId/report
```

**Body:**
```json
{
  "conversationId": "cha_con_01M5...",
  "reason": "Seller is asking for payment outside the platform"
}
```

Queues the message for admin review. The reporter is not notified of the outcome.

---

## 9. Mute / Unmute a Conversation

```
POST   /api/chat/v1/conversations/:conversationId/mute
DELETE /api/chat/v1/conversations/:conversationId/mute
```

Muted conversations still receive messages — the participant just won't get push notifications. The `isMuted` flag is per-participant, not per-conversation.

---

## 10. Search Conversations

```
GET /api/chat/v1/conversations/search?q=<query>&limit=20
```

Full-text search across conversation content (powered by Meilisearch). Minimum 2 characters. Returns matching conversations in the same shape as the list endpoint.

---

## 11. Media Upload

```
POST /api/chat/v1/media/upload
Content-Type: multipart/form-data
```

Upload a file (max 20MB) before sending an `IMAGE` or `VOICE_NOTE` message. Returns a URL to use in the message `metadata`.

---

## 12. Block / Unblock a User

```
POST   /api/chat/v1/users/:userId/block
DELETE /api/chat/v1/users/:userId/block
```

Blocking a user prevents them from initiating new conversations with you. Existing conversations are not archived — they just can't send new messages. Mutual blocking check: if either party blocks the other, `POST /conversations` returns `403 CHAT_RECIPIENT_BLOCKED`.

---

## Real-time (WebSocket)

Connect to the same origin with a valid JWT in the `Authorization` header or as a query param. On connect the server:
1. Sets the user online (presence)
2. Subscribes to all their conversation channels
3. Delivers any unread messages since `lastReadAt`

**Inbound (client → server):**
```json
{ "type": "heartbeat" }
{ "type": "read_receipt", "conversationId": "cha_con_01M5..." }
```

**Outbound (server → client):**
```json
{ "type": "conversation.created", "conversationId": "cha_con_01M5..." }
{ "type": "message.new", "conversationId": "cha_con_01M5...", "message": { ...Message } }
```

Send `read_receipt` instead of polling `PUT /read` when the WebSocket is connected — it's lower latency and avoids an extra HTTP round-trip.

---

## Order-Triggered Chat

When an order is placed or its status changes, the system **automatically creates a conversation and sends messages** — the frontend does not need to initiate it. Events that trigger auto-messages:

| Order event | Message sent |
|-------------|-------------|
| `order.pending_seller_verification` | Order card + "Your order has been placed and is waiting for seller confirmation." |
| `order.seller_verified` | Confirmation message to both parties |
| `order.declined` | Decline notification with reason |

These conversations have `relatedOrderId` set. The frontend should surface them in the inbox just like any other conversation.

---

## Error Reference

| Code | HTTP | Meaning |
|------|------|---------|
| `CHAT_ACCESS_DENIED` | 403 | Not a participant in this conversation |
| `CHAT_RECIPIENT_BLOCKED` | 403 | Either party has blocked the other |
| `CHAT_ORDER_ACCESS_DENIED` | 403 | Not a party to the related order |
| `CHAT_CONVERSATION_ARCHIVED` | 403 | Conversation has been archived |
| `CHAT_RATE_LIMIT_EXCEEDED` | 429 | Too many conversations started in a short window |
| `VALIDATION_ERROR` | 422 | Invalid request body |
| `NOT_FOUND` | 404 | Conversation or message not found (or not a participant) |

---

## Typical Frontend Flows

**Buyer taps "Chat with seller" on storefront:**
```
1. POST /api/chat/v1/conversations
   { recipientId: seller.id, type: "BUYER_SELLER", relatedProductId: product.id }
2. Navigate to ChatScreen with conversationId
3. GET /api/chat/v1/conversations/:id/messages  ← load history
4. Connect WebSocket, send read_receipt
5. Render auto-sent messages (product card + greeting)
```

**Seller opens inbox:**
```
1. GET /api/chat/v1/conversations  ← list with unread counts
2. Tap a conversation
3. GET /api/chat/v1/conversations/:id/messages
4. PUT /api/chat/v1/conversations/:id/read
5. POST message to reply
```

**Buyer checks order chat:**
```
1. GET /api/chat/v1/conversations?relatedOrderId=ORD-...  ← or filter client-side
   (conversation was auto-created when order was placed)
2. Same flow as above
```
