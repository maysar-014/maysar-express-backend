# Buyer Guide — Chat Service

> Mirrors: `docs/FLOWS/chat/user-flow/buyer-flows.md`
> Verification status: Partially Verified
> Last updated: September 2026

## Overview

Chat UI for buyers: starting conversations with sellers, messaging, and handling archived conversations.

---

## Flow 1: Start Conversation

**User Goal:** Contact a seller about a product.

**UI States:** Loading | Conversation created | Error

**Action:** `POST /api/chat/v1/conversations` with `{ type: "BUYER_SELLER", recipientId, productId? }`

- Success: navigate to conversation screen. A `PRODUCT_CARD` message snapshot is automatically sent — display it immediately at the top of the thread.
- Existing conversation: returns existing `conversationId` — navigate to it directly (idempotent)

---

## Flow 2: Send Message

**Action:** `POST /api/chat/v1/conversations/:id/messages` with `{ type: "TEXT", content: "..." }`

**UI States:** Message input enabled | Sending (optimistic append) | Sent | Archived (input disabled) | Error

| Status | Message |
|---|---|
| 403 CHAT_ACCESS_DENIED | "You are not a participant in this conversation." |
| 409 CONVERSATION_ARCHIVED | Show archived state — disable input |

---

## Flow 3: View Message History

**Action:** `GET /api/chat/v1/conversations/:id/messages`

Show messages ordered oldest-first (`createdAt` ASC). `PRODUCT_CARD` messages render the product snapshot card. `TEXT` messages render as standard chat bubbles.

---

## Flow 4: Conversation Archival

**Trigger:** `OrderDelivered` or `OrderCancelled` event — automatic, not buyer-initiated.

**UI treatment:**
- Show a banner at the top of the archived conversation: "This conversation is closed — order completed/cancelled"
- Disable the message input field with the label "This conversation is closed"
- Existing messages remain fully readable
- Do not hide the conversation from the inbox — show it with an "Archived" badge

---

## WebSocket Requirement

Real-time delivery requires a WebSocket connection.

- Connect to the WebSocket gateway after starting or opening a conversation
- Subscribe to channel `chat:conv:{conversationId}`
- If disconnected: missed messages can be fetched via `GET .../messages` on reconnect
- Show a "Connecting..." indicator while establishing the WebSocket connection
- On persistent connection failure: show "Real-time updates unavailable. Pull to refresh for new messages."
