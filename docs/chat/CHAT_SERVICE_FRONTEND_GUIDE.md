# Chat Service — Frontend Integration Guide

> Mount path: `/api/chat/v1`
> WebSocket: `ws://{host}/ws?userId=<userId>`
> Audience: All authenticated users (buyer, seller, courier, supplier, enabler)

---

## What the Chat Service Does

Commerce-contextual messaging. Every conversation is linked to a product, order, shipment, or supplier request. Not a generic messenger — context is mandatory.

```
Buyer opens product page → POST /conversations (relatedProductId)
→ WebSocket delivers messages in real-time
→ Risk Engine scores every TEXT message before delivery
→ score ≥ 90 → blocked; 70–89 → flagged; < 70 → delivered
```

**Order lifecycle integration:** When a buyer places an order, the chat service automatically creates a `BUYER_SELLER` conversation and posts a system `ORDER_CARD` message. The seller can confirm or decline the order directly from the conversation.

```
Order placed → chat service creates BUYER_SELLER conversation
→ ORDER_CARD message posted with items + action buttons
→ Seller taps CONFIRM_ORDER or DECLINE_ORDER
→ System posts status message (verified/declined)
```

---

## Conversation Types

| Type | Participants |
|------|-------------|
| `BUYER_SELLER` | Buyer ↔ Seller |
| `SELLER_SUPPLIER` | Seller ↔ Supplier |
| `BUYER_COURIER` | Buyer ↔ Courier (auto-created on delivery assignment) |
| `SELLER_TEAM` | Internal seller team |

`BUYER_COURIER` conversations are **auto-archived** when the order reaches `DELIVERED` or `CANCELLED`. No manual close needed.

---

## Rate Limits (per user, rolling 60-minute window)

| Action | Limit |
|--------|-------|
| New conversations | 20 / hour |
| Messages sent | 200 / hour |

Both return HTTP 429 when exceeded.

---

## REST API Reference

All endpoints require `Authorization: Bearer <token>`.

### Conversations

#### Start a conversation
`POST /api/chat/v1/conversations` → **201**

```jsonc
{
  "type": "BUYER_SELLER",
  "recipientId": "usr_seller_01J...",
  "initiatorRole": "BUYER",
  "recipientRole": "SELLER",
  "relatedProductId": "prd_01J...",   // optional — link to product
  "relatedOrderId": null,             // optional — link to order
  "relatedShipmentId": null           // optional — link to shipment
}
```

**Deduplication:** For `BUYER_SELLER` conversations with `relatedProductId`, the server checks for an existing conversation between the same buyer/seller pair for the same product and returns it instead of creating a duplicate. The response HTTP status will be `200` (existing) vs `201` (new).

**Auto-greeting:** For new `BUYER_SELLER` conversations with a `relatedProductId`, the server automatically posts two messages on behalf of the buyer:
1. A `PRODUCT_CARD` snapshot of the product
2. A `TEXT` message: "Hi, is this item still available?"

These are system-initiated — do not show them as messages typed by the user. They will appear in the conversation history immediately.

```jsonc
// Response 201
{
  "success": true,
  "data": {
    "id": "conv_01J...",
    "type": "BUYER_SELLER",
    "moderationStatus": "ACTIVE",
    "relatedProductId": "prd_01J...",
    "relatedOrderId": null,
    "lastMessageAt": "2026-09-01T10:00:00.000Z",
    "createdAt": "2026-09-01T10:00:00.000Z"
  }
}
```

#### List conversations
`GET /api/chat/v1/conversations?limit=20&cursor=<ISO-timestamp>` → **200**

Cursor is an ISO timestamp — pass `lastMessageAt` of the last item for the next page.

#### Search conversations
`GET /api/chat/v1/conversations/search?q=laptop&limit=10` → **200**

#### Get single conversation
`GET /api/chat/v1/conversations/:id` → **200**

#### Mark conversation as read
`PUT /api/chat/v1/conversations/:id/read` → **200**

Resets unread count for the caller. Also triggers a `read_receipt` WebSocket event to the other participant.

#### Mute / unmute
```
POST   /api/chat/v1/conversations/:id/mute
DELETE /api/chat/v1/conversations/:id/mute
```

---

### Messages

#### Send a message
`POST /api/chat/v1/conversations/:id/messages` → **201**

```jsonc
// TEXT
{ "type": "TEXT", "content": "Is this item still available?" }

// IMAGE (upload first, then send)
{
  "type": "IMAGE",
  "metadata": {
    "mediaUrl": "https://storage.../img.jpg",
    "thumbnailUrl": "https://storage.../img_thumb.jpg"
  }
}

// VOICE_NOTE
{
  "type": "VOICE_NOTE",
  "metadata": { "mediaUrl": "https://storage.../note.ogg", "durationSeconds": 42 }
}

// PRODUCT_CARD
{ "type": "PRODUCT_CARD", "metadata": { "productId": "prd_01J..." } }

// ORDER_REFERENCE
{ "type": "ORDER_REFERENCE", "metadata": { "orderId": "ord_01J..." } }

// LOCATION_PIN
{ "type": "LOCATION_PIN", "metadata": { "latitude": -6.7924, "longitude": 39.2083, "label": "Kariakoo Market" } }

// QUICK_ACTION
{ "type": "QUICK_ACTION", "metadata": { "actionType": "CONFIRM_AVAILABILITY" } }
```

**Message type constraints:**

| Type | Required fields | Content limit |
|------|----------------|---------------|
| `TEXT` | `content` | 1–4000 chars |
| `IMAGE` | `metadata.mediaUrl`, `metadata.thumbnailUrl` | — |
| `VOICE_NOTE` | `metadata.mediaUrl`, `metadata.durationSeconds` | max 300s |
| `PRODUCT_CARD` | `metadata.productId` | — |
| `ORDER_REFERENCE` | `metadata.orderId` | — |
| `ORDER_CARD` | system-generated only | — |
| `LOCATION_PIN` | `metadata.latitude`, `metadata.longitude` | — |
| `QUICK_ACTION` | `metadata.actionType` | — |

**Quick action types:** `CONFIRM_AVAILABILITY` | `REQUEST_QUOTE` | `TRACK_ORDER` | `ACCEPT_OFFER` | `DECLINE_OFFER` | `CONFIRM_ORDER` | `DECLINE_ORDER`

**`CONFIRM_ORDER` / `DECLINE_ORDER` note:** These are used by sellers in response to ORDER_CARD messages. They trigger order status transitions on the order-service.

**ORDER_CARD note:** This message type is **system-generated** — it cannot be sent by clients via the REST API. It is created automatically by the chat service when an order is placed (via `order.pending_seller_verification` event). Its metadata contains:
```jsonc
{
  "orderId": "ord_01J...",
  "items": [{ "name": "Cotton Shirt M", "quantity": 2, "unitPrice": 12000 }],
  "totalAmount": 24000,
  "currency": "TZS",
  "actionButtons": ["CONFIRM_ORDER", "DECLINE_ORDER"]
}
```

**PRODUCT_CARD note:** The server snapshots `title`, `price`, `stockStatus`, and `addToCartUrl` at send time. The card is immutable after sending — price changes do not update it.

```jsonc
// Response 201
{
  "success": true,
  "data": {
    "id": "msg_01J...",
    "conversationId": "conv_01J...",
    "senderId": "usr_01J...",
    "type": "TEXT",
    "content": "Is this item still available?",
    "flagged": false,
    "moderationReason": null,
    "createdAt": "2026-09-01T10:00:00.000Z"
  }
}
```

`flagged: true` means the Risk Engine scored the message 70–89. Show a subtle warning indicator — the message was delivered but is under review.

`moderationReason` is a human-readable string set when `flagged: true` or when a message is blocked. It explains why (e.g. "This message contains what appears to be off-platform payment instructions."). Show it in a non-alarmist way: "This message has been flagged for review" with an expandable detail if `moderationReason` is present.

#### List messages
`GET /api/chat/v1/conversations/:id/messages?limit=50&cursor=<ISO-timestamp>` → **200**

Messages returned in `createdAt ASC` order. Use `createdAt` of the oldest loaded message as cursor for loading older history.

#### Delete a message (soft)
`DELETE /api/chat/v1/conversations/:id/messages/:messageId` → **200**

Content replaced with `[message deleted]`. Record retained for dispute purposes. Show as greyed-out deleted bubble.

#### Report a message
`POST /api/chat/v1/messages/:messageId/report` → **201**

```jsonc
{ "conversationId": "conv_01J...", "reason": "Spam / phishing link" }
```

---

### Media Upload

Upload before sending an IMAGE or VOICE_NOTE message.

`POST /api/chat/v1/media/upload` — multipart/form-data → **200**

| Field | Value |
|-------|-------|
| `file` | binary |
| `mediaType` | `image` or `voice_note` |
| `durationSeconds` | required for `voice_note` only |

**Limits:**
- Images: JPEG / PNG / WebP, max **10 MB**
- Voice notes: OGG/OPUS or M4A, max **15 MB**, max **300 seconds**

```jsonc
// Response 200
{
  "success": true,
  "data": {
    "mediaUrl": "https://storage.../chat/media/usr_01J.../uuid.jpg",
    "thumbnailUrl": "https://storage.../chat/media/usr_01J.../uuid_thumb.jpg"
  }
}
```

Use `mediaUrl` and `thumbnailUrl` directly in the message `metadata`.

---

### Moderation

#### Block a user
```
POST   /api/chat/v1/users/:userId/block
DELETE /api/chat/v1/users/:userId/block
```

Blocked users cannot send messages to the blocker. Existing conversations are not deleted.

---

### Admin — Phishing Blocklist (admin role only)

```
GET    /api/chat/v1/admin/blocklist/domains
POST   /api/chat/v1/admin/blocklist/domains    { "domain": "scam-site.com" }
DELETE /api/chat/v1/admin/blocklist/domains/:domain
```

Blocklist stored in Redis — takes effect immediately.

---

## WebSocket API

### Connect
```
ws://{host}/ws?userId=<userId>
```

Or via header (gateway):
```
ws://{host}/ws
x-user-id: usr_01J...
```

On connect, the server delivers all unread messages since the participant's `lastReadAt`.

### Inbound events (client → server)

```jsonc
{ "type": "heartbeat" }
```
Send every **30 seconds** to stay marked as online. Missing heartbeats mark the user offline.

```jsonc
{ "type": "read_receipt", "conversationId": "conv_01J..." }
```
Marks all messages in the conversation as read for the sender.

### Outbound events (server → client)

```jsonc
{ "type": "message",      "data": { /* MessageDto */ } }
{ "type": "read_receipt", "data": { "conversationId": "conv_01J...", "userId": "usr_01J...", "lastReadAt": "2026-09-01T10:05:00.000Z" } }
{ "type": "presence",     "data": { "userId": "usr_01J...", "online": true } }
{ "type": "conversation_archived", "data": { "conversationId": "conv_01J..." } }
{ "type": "message_blocked", "data": { "tempId": "local-uuid" } }
```

`message_blocked` is sent back to the **sender only** when the Risk Engine blocks their message (score ≥ 90). Use `tempId` (a client-generated UUID sent with the message) to match the blocked message in the optimistic UI and remove it.

---

## Risk Engine Display Rules

| Score | `flagged` field | `moderationReason` | UI treatment |
|-------|----------------|-------------------|--------------|
| < 70 | `false` | `null` | Normal display |
| 70–89 | `true` | Human-readable explanation | Show subtle ⚠ icon — "This message has been flagged for review" |
| ≥ 90 | Message blocked | Not in response | Remove from optimistic UI on `message_blocked` WS event |

Never expose the numeric score to users. The `moderationReason` field is safe to show — it contains only the category of concern (e.g. "off-platform payment instructions"), not the matching phrase or internal scoring.

**Risk signals (8-layer model):**
1. External URL density — each external URL adds 15 points, capped at 60
2. Phishing domain match — any URL matching the blocklist → 100 (immediate block)
3. Suspicious phrases — matched against a dynamic registry of 240+ patterns in English and Swahili, including regex for obfuscated variants
4. Phone number detection — Tanzanian phone alone → 70 (flag); phone + off-platform payment/contact intent → 95 (block)
5. Anomaly heuristics — hidden control characters, leet-speak, spaced-out letters, encoded blobs, link shorteners, CAPS flood, emoji flood → each adds 20–55 points
6. Message frequency — >20 messages in 5 minutes → +30
7. Mass messaging — same content to >5 conversations in 5 minutes → +85
8. Penalty override — user previously flagged for mass messaging → +85 (1-hour window)

**Content normalization:** Before phrase matching, the content is normalized to defeat common evasion techniques: leet-speak decoding (`tum@` → `tuma`), zero-width character removal, collapsed repeated characters, spaced-out letter joining (`t u m a` → `tuma`). This means variations like "Tum@ Pesa", "T.U.M.A pesa", and "tuma   pesa" all match the same pattern.

---

## Common Integration Patterns

### Buyer opens chat from product page

```
1. POST /conversations { type: "BUYER_SELLER", recipientId: sellerId, relatedProductId }
2. Connect WebSocket
3. GET /conversations/:id/messages  (load history)
4. Send heartbeat every 30s
5. On WS "message" event → append to message list
6. On WS "read_receipt" event → update read indicators
```

### Sending an image

```
1. User selects image
2. POST /media/upload (multipart, mediaType=image)
   → { mediaUrl, thumbnailUrl }
3. POST /conversations/:id/messages
   { type: "IMAGE", metadata: { mediaUrl, thumbnailUrl } }
```

### Sending a voice note

```
1. User records audio → OGG/OPUS blob
2. POST /media/upload (multipart, mediaType=voice_note, durationSeconds=42)
   → { mediaUrl }
3. POST /conversations/:id/messages
   { type: "VOICE_NOTE", metadata: { mediaUrl, durationSeconds: 42 } }
```

### Optimistic message send

```
1. Generate tempId = uuid()
2. Append message to local list with status "sending"
3. POST /conversations/:id/messages
   → on success: replace tempId with server id, status "sent"
   → on WS "message_blocked": remove message, show "Message blocked" toast
   → on HTTP error: show retry option
```

---

## Error Codes

| Code | HTTP | Meaning | UI action |
|------|------|---------|-----------|
| `CHAT_ACCESS_DENIED` | 403 | Not a participant in this conversation | Hide conversation |
| `CHAT_RECIPIENT_BLOCKED` | 403 | Recipient has blocked the sender | Show "You cannot message this user" |
| `CHAT_ORDER_ACCESS_DENIED` | 403 | Not a party to the referenced order | Remove order reference |
| `CHAT_CONVERSATION_ARCHIVED` | 403 | Conversation archived (delivery completed) | Show "This conversation is closed" banner |
| `CHAT_RATE_LIMIT_EXCEEDED` | 429 | Too many new conversations this hour | Show cooldown timer |
| `CHAT_MESSAGE_RATE_LIMIT_EXCEEDED` | 429 | Too many messages this hour | Disable send button with countdown |
| `CHAT_INVALID_PRODUCT_REFERENCE` | 422 | Product ID does not exist | Remove product card, show error |
| `CHAT_NOT_FOUND` | 404 | Conversation or message not found | Show "not found" |
| `VALIDATION_ERROR` | 422 | Content too long, invalid coordinates, etc. | Highlight field |
| `UNAUTHORIZED` | 401 | No/expired JWT | Re-login |

---

## UX Patterns

**Conversation list:**
- Show unread count badge per conversation.
- Show `lastMessageAt` as relative time ("2 min ago").
- Show `moderationStatus: ARCHIVED` conversations in a separate "Closed" tab.
- Muted conversations: show mute icon, suppress notification badge.

**Message thread:**
- Load last 50 messages on open. Load older history on scroll-up (cursor pagination).
- Show `[message deleted]` in grey italic for soft-deleted messages.
- Show `flagged: true` messages with a subtle ⚠ icon. If `moderationReason` is present, show it in a collapsible tooltip — "Flagged: [reason]".
- Show PRODUCT_CARD as a rich card with snapshot price and "Add to Cart" button.
- Show ORDER_CARD as a structured order summary card with item list, total amount, and action buttons (CONFIRM_ORDER / DECLINE_ORDER for sellers). Buyers see ORDER_CARD as a read-only summary.
- Show LOCATION_PIN as a static map thumbnail with coordinates.
- Show QUICK_ACTION as a tappable button chip.
- `CONFIRM_ORDER` / `DECLINE_ORDER` quick action chips: only show to the seller, not the buyer. Disable after the order is no longer in `PENDING_SELLER_VERIFICATION` status.

**WebSocket reconnection:**
- On disconnect: show "Reconnecting..." banner.
- On reconnect: re-fetch unread messages since last `lastReadAt` via REST, then re-subscribe.
- Resume heartbeat immediately after reconnect.

**Phone number masking:**
Raw phone numbers are stripped from all API responses. Never attempt to display a phone number from chat data.

**Integration checklist:**
- [ ] Connect WebSocket on chat screen open, disconnect on unmount
- [ ] Send heartbeat every 30s while connected
- [ ] Use `tempId` for optimistic sends — handle `message_blocked` WS event
- [ ] Upload media before sending IMAGE/VOICE_NOTE messages
- [ ] Show `flagged: true` messages with warning indicator and optional `moderationReason` tooltip (not hidden)
- [ ] Handle `CHAT_CONVERSATION_ARCHIVED` (403) — show closed banner, hide input
- [ ] Handle `CHAT_MESSAGE_RATE_LIMIT_EXCEEDED` (429) — disable send with countdown
- [ ] Cursor-paginate message history on scroll-up
- [ ] Mark conversation read on open via `PUT /conversations/:id/read`
- [ ] Handle deduplication: `POST /conversations` may return 200 (existing) or 201 (new) — navigate to conversation either way
- [ ] ORDER_CARD messages: show action buttons (CONFIRM_ORDER / DECLINE_ORDER) for sellers only; disable after order leaves pending verification status
- [ ] Auto-greeting: first messages in a new BUYER_SELLER conversation are system-initiated — do not surface them as "sent by user" in the UI
- [ ] ORDER_CARD type is received via WebSocket push — handle it in your message renderer even though clients cannot send it

---

## Order Lifecycle in Chat

When a buyer places an order, the chat service automatically creates a conversation and posts an ORDER_CARD. No frontend action is needed to create this — it happens via the `order.pending_seller_verification` event.

### What the frontend receives

When the order is placed, the buyer's and seller's chat feeds receive a new `BUYER_SELLER` conversation (or the existing one for that product is reused) containing an ORDER_CARD message:

```jsonc
// ORDER_CARD message (received via WebSocket or in message list)
{
  "id": "msg_01J...",
  "type": "ORDER_CARD",
  "senderId": "system",
  "metadata": {
    "orderId": "ORD-01J...",
    "items": [
      { "name": "Men's Cotton Shirt M", "quantity": 2, "unitPrice": 12000 }
    ],
    "totalAmount": 24000,
    "currency": "TZS",
    "actionButtons": ["CONFIRM_ORDER", "DECLINE_ORDER"]
  },
  "createdAt": "2026-09-06T10:00:00Z"
}
```

### Seller UI for ORDER_CARD

Show the ORDER_CARD as a structured card with:
- Item list with quantities and unit prices
- Total amount
- Two action buttons: **Confirm Order** and **Decline Order**

When the seller taps:
- **Confirm Order** → send `QUICK_ACTION` message with `actionType: "CONFIRM_ORDER"` → order-service picks this up and transitions the order
- **Decline Order** → send `QUICK_ACTION` message with `actionType: "DECLINE_ORDER"` → order-service cancels the order

After the seller acts, the system automatically posts a status message in the conversation reflecting the outcome.

### Status messages timeline

```
ORDER_CARD posted         ← order.pending_seller_verification
Seller taps confirm   →   system: "Seller confirmed your order"
  — OR —
Seller taps decline   →   system: "Seller declined — reason: ..."
```

**Show action buttons only to the seller.** Buyers see the ORDER_CARD as a read-only summary.
**Disable action buttons** once the order is no longer in `PENDING_SELLER_VERIFICATION` status — check order status via `/api/order/orders/:orderId` before rendering.

---

## Route Map

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/chat/v1/conversations` | JWT | Start conversation (deduplicates BUYER_SELLER+productId) |
| GET | `/api/chat/v1/conversations` | JWT | List conversations |
| GET | `/api/chat/v1/conversations/search` | JWT | Search conversations |
| GET | `/api/chat/v1/conversations/:id` | JWT | Get conversation |
| PUT | `/api/chat/v1/conversations/:id/read` | JWT | Mark as read |
| POST | `/api/chat/v1/conversations/:id/mute` | JWT | Mute |
| DELETE | `/api/chat/v1/conversations/:id/mute` | JWT | Unmute |
| POST | `/api/chat/v1/conversations/:id/messages` | JWT | Send message |
| GET | `/api/chat/v1/conversations/:id/messages` | JWT | List messages |
| DELETE | `/api/chat/v1/conversations/:id/messages/:messageId` | JWT | Delete message |
| POST | `/api/chat/v1/messages/:messageId/report` | JWT | Report message |
| POST | `/api/chat/v1/media/upload` | JWT | Upload media |
| POST | `/api/chat/v1/users/:userId/block` | JWT | Block user |
| DELETE | `/api/chat/v1/users/:userId/block` | JWT | Unblock user |
| GET | `/api/chat/v1/admin/blocklist/domains` | JWT (admin) | List blocklist |
| POST | `/api/chat/v1/admin/blocklist/domains` | JWT (admin) | Add domain |
| DELETE | `/api/chat/v1/admin/blocklist/domains/:domain` | JWT (admin) | Remove domain |
| GET | `/api/chat/v1/admin/moderation/messages` | JWT (admin) | List flagged/blocked messages |
| GET | `/api/chat/v1/admin/moderation/messages/:messageId` | JWT (admin) | Message detail + signals |
| POST | `/api/chat/v1/admin/moderation/messages/:messageId/review` | JWT (admin) | Review message |
| GET | `/api/chat/v1/admin/moderation/phrases` | JWT (admin) | List phrase registry |
| GET | `/api/chat/v1/admin/moderation/phrases/:id` | JWT (admin) | Get phrase |
| POST | `/api/chat/v1/admin/moderation/phrases` | JWT (admin) | Create phrase |
| PUT | `/api/chat/v1/admin/moderation/phrases/:id` | JWT (admin) | Update phrase |
| DELETE | `/api/chat/v1/admin/moderation/phrases/:id` | JWT (admin) | Delete phrase |
| POST | `/api/chat/v1/admin/moderation/phrases/seed` | JWT (admin) | Bootstrap seed catalog |
| GET | `/api/chat/v1/admin/moderation/patterns` | JWT (admin) | List emerging patterns |
| POST | `/api/chat/v1/admin/moderation/patterns/mine` | JWT (admin) | Trigger pattern mining |
| POST | `/api/chat/v1/admin/moderation/patterns/:id/promote` | JWT (admin) | Promote to phrase registry |
| DELETE | `/api/chat/v1/admin/moderation/patterns/:id` | JWT (admin) | Dismiss pattern |
| WS | `/ws?userId=<id>` | JWT or x-user-id | WebSocket connection |

> **Admin guide:** see `CHAT_SERVICE_ADMIN_GUIDE.md` for full documentation of the moderation, phrase registry, and emerging pattern endpoints.
