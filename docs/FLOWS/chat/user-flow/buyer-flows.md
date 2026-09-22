# Buyer Flows — Chat Service

> **Verification status:** Partially Verified
> **Verification basis:** `docs/FLOWS/_verification/analysis-report.md` (September 2026); `docs/chat/CHAT_SERVICE_SYSTEM.md`
> **Last updated:** September 2026

## Overview

This document covers chat-service flows from the buyer's perspective: starting a conversation with a seller about a product, sending and receiving messages, and understanding conversation archival after order completion. WebSocket connection is required for real-time message delivery.

---

## Flow Index

| # | Flow Name | Verification Status | Primary Endpoint |
|---|---|---|---|
| 1 | Start Buyer-Seller Conversation | Partially Verified | `POST /api/chat/v1/conversations` |
| 2 | Send Message | Partially Verified | `POST /api/chat/v1/conversations/:id/messages` |
| 3 | View Message History | Partially Verified | `GET /api/chat/v1/conversations/:id/messages` |
| 4 | Conversation Archival (Event-Driven) | Partially Verified | Triggered by `OrderDelivered` / `OrderCancelled` events |

---

## Flow 1: Start Buyer-Seller Conversation

### Summary

| Field | Value |
|---|---|
| Actor | Buyer |
| Trigger | Buyer wants to ask a question about a product or contact the seller |
| Preconditions | Authenticated (Bearer JWT); seller `recipientId` known |
| Terminal states | Conversation created; auto `PRODUCT_CARD` message snapshot sent |
| Verification status | Partially Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Buyer | Create conversation with seller | `POST /api/chat/v1/conversations` | Bearer JWT | 201 `{ conversationId, type: "BUYER_SELLER" }` |
| 2 | chat-service | Auto-sends `PRODUCT_CARD` message snapshot | Internal | — | PRODUCT_CARD message created with product title, price, stock status, addToCartUrl |
| 3 | chat-service | Publishes message to Redis channel `chat:conv:{id}` | Internal | — | Seller receives via WebSocket |

### Request Body

```json
{
  "type": "BUYER_SELLER",
  "recipientId": "seller-user-id",
  "productId": "optional-product-id"
}
```

### Service Interaction Chain

`POST /api/chat/v1/conversations` creates the conversation record and immediately triggers the `PRODUCT_CARD` auto-message if a `productId` is supplied. The card snapshot captures `title`, `price`, `stockStatus`, and `addToCartUrl` from catalog-service at creation time — the snapshot is immutable after creation. Messages are delivered in real-time via WebSocket on the `chat:conv:{id}` Redis channel.

### Unhappy Path Branches

| Trigger | System Response | Error Code |
|---|---|---|
| `recipientId` not found | 404 | `USER_NOT_FOUND` |
| Buyer attempts to message themselves | 422 | `INVALID_RECIPIENT` |
| Conversation already exists between buyer and seller for this product | Returns existing conversationId (idempotent) | — |

---

## Flow 2: Send Message

### Summary

| Field | Value |
|---|---|
| Actor | Buyer |
| Trigger | Buyer sends a text or quick-action message in a conversation |
| Preconditions | Authenticated (Bearer JWT); conversation is not archived |
| Terminal states | Message persisted; delivered via WebSocket to seller |
| Verification status | Partially Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Buyer | Send message | `POST /api/chat/v1/conversations/:id/messages` | Bearer JWT | 201 `{ messageId, type, content, createdAt }` |
| 2 | chat-service | Publishes to `chat:conv:{id}` Redis channel | Internal | — | Seller receives via WebSocket |

### Request Body

```json
{
  "type": "TEXT",
  "content": "Is this available in blue?"
}
```

### Unhappy Path Branches

| Trigger | System Response | Error Code |
|---|---|---|
| Conversation is archived | 403 or 409 — no new messages after archival | `CONVERSATION_ARCHIVED` |
| Buyer is not a participant | 403 `CHAT_ACCESS_DENIED` | `CHAT_ACCESS_DENIED` |
| Conversation not found | 404 data-level | `RESOURCE_NOT_FOUND` |

---

## Flow 3: View Message History

### Summary

| Field | Value |
|---|---|
| Actor | Buyer |
| Trigger | Buyer opens a conversation to read the message thread |
| Preconditions | Authenticated (Bearer JWT); buyer is a participant in the conversation |
| Terminal states | 200 with messages ordered `createdAt` ASC |
| Verification status | Partially Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Buyer | Fetch message history | `GET /api/chat/v1/conversations/:id/messages` | Bearer JWT | 200 `{ messages[], pagination }` |

### Unhappy Path Branches

| Trigger | System Response | Error Code |
|---|---|---|
| Caller is not a conversation participant | 403 `CHAT_ACCESS_DENIED` | `CHAT_ACCESS_DENIED` |
| Conversation not found | 404 data-level | `RESOURCE_NOT_FOUND` |

---

## Flow 4: Conversation Archival (Event-Driven)

This flow is not buyer-initiated. The conversation is automatically archived when the associated order reaches a terminal state.

| Event | Trigger Service | Effect on Conversation |
|---|---|---|
| `OrderDelivered` | order-service | Conversation archived — no new messages can be sent |
| `OrderCancelled` | order-service | Conversation archived — no new messages can be sent |

After archival:
- Existing messages remain readable
- No new messages can be sent by either party
- The UI must show an archived/read-only state for the conversation
- Attempting to send a message after archival returns 403 or 409 `CONVERSATION_ARCHIVED`

### WebSocket Requirement

Real-time message delivery requires a WebSocket connection. The buyer app must:
1. Connect to the WebSocket gateway after starting a conversation
2. Subscribe to `chat:conv:{conversationId}` on the Redis channel
3. Handle disconnection and reconnection gracefully — missed messages can be fetched via `GET .../messages`
