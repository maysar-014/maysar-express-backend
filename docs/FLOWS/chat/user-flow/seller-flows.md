# Seller Flows — Chat Service

> **Verification status:** Partially Verified
> **Verification basis:** `docs/FLOWS/_verification/analysis-report.md` (September 2026); `docs/chat/CHAT_SERVICE_SYSTEM.md`
> **Last updated:** September 2026

## Overview

This document covers chat-service flows from the seller's perspective: replying to buyer conversations, sending product cards and quote bundles, and initiating supplier conversations for restocking. WebSocket connection is required for real-time delivery.

---

## Flow Index

| # | Flow Name | Verification Status | Primary Endpoint |
|---|---|---|---|
| 1 | Reply to Buyer Conversation | Partially Verified | `POST /api/chat/v1/conversations/:id/messages` |
| 2 | Send Product Card | Partially Verified | `POST /api/chat/v1/conversations/:id/messages` (type: PRODUCT_CARD) |
| 3 | Send Quote Bundle | Partially Verified | `POST /api/chat/v1/conversations/:id/messages` (type: QUICK_ACTION) |
| 4 | Initiate Seller-Supplier Conversation | Partially Verified | `POST /api/chat/v1/conversations` (type: SELLER_SUPPLIER) |

---

## Flow 1: Reply to Buyer Conversation

### Summary

| Field | Value |
|---|---|
| Actor | Seller |
| Trigger | Seller receives a message notification from a buyer and wants to respond |
| Preconditions | Authenticated (Bearer JWT); conversation exists; seller is a participant |
| Terminal states | Message persisted; delivered via WebSocket to buyer |
| Verification status | Partially Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Seller | Open conversation from inbox | `GET /api/chat/v1/conversations/:id/messages` | Bearer JWT | 200 — message history (createdAt ASC) |
| 2 | Seller | Send reply | `POST /api/chat/v1/conversations/:id/messages` | Bearer JWT | 201 `{ messageId, type: "TEXT", content, createdAt }` |
| 3 | chat-service | Publish to `chat:conv:{id}` Redis channel | Internal | — | Buyer receives via WebSocket |

### Unhappy Path Branches

| Trigger | System Response | Error Code |
|---|---|---|
| Conversation archived (OrderDelivered/Cancelled) | 403 or 409 `CONVERSATION_ARCHIVED` | `CONVERSATION_ARCHIVED` |
| Seller is not a participant | 403 `CHAT_ACCESS_DENIED` | `CHAT_ACCESS_DENIED` |

---

## Flow 2: Send Product Card

### Summary

| Field | Value |
|---|---|
| Actor | Seller |
| Trigger | Seller wants to share a specific product with the buyer |
| Preconditions | Authenticated (Bearer JWT); conversation is active (not archived) |
| Terminal states | PRODUCT_CARD message persisted with immutable product snapshot |
| Verification status | Partially Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Seller | Send product card | `POST /api/chat/v1/conversations/:id/messages` | Bearer JWT | 201 `{ messageId, type: "PRODUCT_CARD", metadata: { productId, title, price, stockStatus, addToCartUrl } }` |
| 2 | chat-service | Snapshot product data from catalog | Internal | — | Snapshot captured: title, price, stockStatus, addToCartUrl — immutable after creation |
| 3 | chat-service | Publish to Redis channel | Internal | — | Buyer receives card via WebSocket |

### Request Body

```json
{
  "type": "PRODUCT_CARD",
  "metadata": {
    "productId": "prod_01..."
  }
}
```

### Service Interaction Chain

chat-service calls catalog-service internally to snapshot the product's current `title`, `price`, `stockStatus`, and `addToCartUrl`. The snapshot is stored immutably on the message — future price or stock changes do not update it. The buyer sees the price at the time the card was sent.

---

## Flow 3: Send Quote Bundle (Negotiation Mode)

### Summary

| Field | Value |
|---|---|
| Actor | Seller |
| Trigger | Seller wants to offer a custom price or bundle to a buyer |
| Preconditions | Authenticated (Bearer JWT); conversation is active |
| Terminal states | QUICK_ACTION message sent; buyer can accept/decline via reply |
| Verification status | Partially Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Seller | Send quote action | `POST /api/chat/v1/conversations/:id/messages` | Bearer JWT | 201 QUICK_ACTION message |
| 2 | Buyer | Accepts or declines via reply | `POST /api/chat/v1/conversations/:id/messages` | Buyer JWT | ACCEPT_OFFER or DECLINE_OFFER message |

### Request Body

```json
{
  "type": "QUICK_ACTION",
  "metadata": {
    "actionType": "REQUEST_QUOTE",
    "checkoutUrl": "https://...single-use-cart-url (24h expiry)"
  }
}
```

---

## Flow 4: Initiate Seller-Supplier Conversation

### Summary

| Field | Value |
|---|---|
| Actor | Seller |
| Trigger | Seller needs to restock and wants to contact a supplier directly |
| Preconditions | Authenticated (Bearer JWT, seller role); supplier `recipientId` known |
| Terminal states | Conversation created with `type: SELLER_SUPPLIER` |
| Verification status | Partially Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Seller | Create seller-supplier conversation | `POST /api/chat/v1/conversations` | Bearer JWT (seller role) | 201 `{ conversationId, type: "SELLER_SUPPLIER" }` |
| 2 | chat-service | Validates initiator role is SELLER | Internal | — | Role check passes |
| 3 | Seller | Send product card for restocking inquiry | `POST /api/chat/v1/conversations/:id/messages` | Bearer JWT | 201 PRODUCT_CARD message |

### Request Body

```json
{
  "type": "SELLER_SUPPLIER",
  "initiatorRole": "SELLER",
  "recipientRole": "SUPPLIER",
  "recipientId": "supplier-user-id"
}
```

### Unhappy Path Branches

| Trigger | System Response | Error Code |
|---|---|---|
| Non-seller attempts to initiate SELLER_SUPPLIER conversation | 403 | `INVALID_INITIATOR_ROLE` |
| `recipientId` not found or not a supplier | 404 or 422 | `USER_NOT_FOUND` |
