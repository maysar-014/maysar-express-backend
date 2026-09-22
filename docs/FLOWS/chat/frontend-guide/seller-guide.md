# Seller Guide — Chat Service

> Mirrors: `docs/FLOWS/chat/user-flow/seller-flows.md`
> Verification status: Partially Verified
> Last updated: September 2026

## Overview

Chat UI for sellers: replying to buyers, sending product cards and quote bundles, and initiating supplier conversations.

---

## Flow 1: Reply to Buyer

Same as buyer guide — `GET` message history then `POST` message. Seller receives push notification when a buyer sends a message.

---

## Flow 2: Send Product Card

**Action:** `POST /api/chat/v1/conversations/:id/messages` with:
```json
{ "type": "PRODUCT_CARD", "metadata": { "productId": "prod_01..." } }
```

- chat-service snapshots the product automatically (title, price, stockStatus, addToCartUrl)
- Snapshot is immutable — the card always shows the price at the time it was sent
- Render product cards as rich cards with the product image, title, price, and an "Add to cart" button linking to `addToCartUrl`

---

## Flow 3: Send Quote Bundle

**Action:** `POST /api/chat/v1/conversations/:id/messages` with:
```json
{ "type": "QUICK_ACTION", "metadata": { "actionType": "REQUEST_QUOTE", "checkoutUrl": "..." } }
```

- `checkoutUrl` is a single-use cart URL with a 24-hour expiry
- Render as a quote card with an "Accept offer" button
- When buyer accepts: they send `{ "type": "QUICK_ACTION", "metadata": { "actionType": "ACCEPT_OFFER" } }`

---

## Flow 4: Initiate Seller-Supplier Conversation

**Action:** `POST /api/chat/v1/conversations` with:
```json
{ "type": "SELLER_SUPPLIER", "initiatorRole": "SELLER", "recipientRole": "SUPPLIER", "recipientId": "..." }
```

Only sellers can initiate SELLER_SUPPLIER conversations. Show a "Contact Supplier" button in seller context only — not in buyer-facing views.

---

## Archived Conversations

Same as buyer guide. After `OrderDelivered` or `OrderCancelled`: show archived banner, disable input, keep history readable.

## WebSocket

Same requirement as buyer guide — real-time delivery requires WebSocket connection to `chat:conv:{conversationId}`.
