# Requirements Document

## Introduction

This document defines the requirements for the Maysar Chat System — the communication layer for the Maysar East African e-commerce marketplace. The system is not a generic messenger; it is commerce infrastructure. Every conversation is contextually linked to a product, order, shipment, or supplier contract, and every feature is designed to help transactions complete, trust grow, disputes reduce, and logistics coordinate.

The system supports four conversation types: Buyer ↔ Seller (product inquiry, negotiation, post-order support), Seller ↔ Supplier (B2B procurement and restocking), Buyer ↔ Courier (delivery coordination, order-scoped and temporary), and Seller Team/Internal (deferred to a later phase). Message types include text, images, voice notes (critical for East African commerce), product cards, order references, location pins, and quick-action buttons. The real-time infrastructure is built on WebSockets, Redis Pub/Sub, and PostgreSQL, with media stored in S3/MinIO/R2.

The Phase 1 scope covers: real-time text and image messaging, voice note recording and playback, product-linked conversation initiation, order-linked conversation context, commerce-native message types (product cards, order references), trust and safety controls (rate limiting, spam scoring, phone masking, moderation tools), push/email/SMS notifications, and message retention policies.

---

## Glossary

- **Chat_System**: The subsystem responsible for creating, routing, storing, and delivering all marketplace messages.
- **Conversation**: A persistent, contextual thread between two or more participants, linked to a product, order, shipment, or supplier request.
- **Conversation_Type**: An enumerated classification of a conversation: `BUYER_SELLER`, `SELLER_SUPPLIER`, `BUYER_COURIER`, or `SELLER_TEAM`.
- **Message**: A single unit of communication within a Conversation, carrying a `type`, `content`, optional `metadata`, and a `senderId`.
- **Message_Type**: An enumerated classification of a message: `TEXT`, `IMAGE`, `VOICE_NOTE`, `PRODUCT_CARD`, `ORDER_REFERENCE`, `LOCATION_PIN`, or `QUICK_ACTION`.
- **Participant**: A user who is a member of a Conversation, identified by `userId` and assigned a `role` within that conversation.
- **Participant_Role**: An enumerated role within a conversation: `BUYER`, `SELLER`, `SUPPLIER`, `COURIER`.
- **Product_Card**: A structured message payload containing a product's `productId`, `title`, `price`, `imageUrl`, `stockStatus`, and a deep-link URL to the product page.
- **Order_Reference**: A structured message payload containing an `orderId`, `status`, `totalAmount`, and a deep-link URL to the order detail page.
- **Voice_Note**: An audio message stored as a media file (OGG/OPUS or M4A format) with a duration in seconds.
- **Location_Pin**: A structured message payload containing `latitude`, `longitude`, and an optional `label`.
- **Quick_Action**: A structured message payload containing a `label` and an `actionType` (e.g., `CONFIRM_AVAILABILITY`, `REQUEST_QUOTE`, `TRACK_ORDER`).
- **Read_Receipt**: A record indicating that a Participant has read all messages up to a given `lastReadAt` timestamp.
- **Presence**: A real-time indicator of whether a user is currently online, stored in Redis.
- **Spam_Score**: A numeric risk score (0–100) computed by the Risk_Engine for each message or conversation initiation event.
- **Risk_Engine**: The subsystem responsible for computing Spam_Score, detecting scam behaviour, and triggering moderation actions.
- **Phone_Masking**: The practice of withholding a participant's raw phone number from other participants until a trust threshold is met.
- **Media_Store**: The object storage backend (S3/MinIO/R2) used to persist image and voice note files.
- **WebSocket_Gateway**: The real-time connection layer that maintains persistent WebSocket connections and routes messages via Redis Pub/Sub.
- **Notification_Service**: The existing notification subsystem that delivers push, email, and SMS alerts.
- **Marketplace_Intelligence**: Aggregated, anonymised signals derived from chat activity used to inform demand forecasting, supplier performance, and fraud detection.
- **Retention_Policy**: The rules governing how long messages are stored, when they are deleted, and which messages are preserved as dispute evidence.
- **Moderation_Status**: An enumerated state of a message or conversation: `ACTIVE`, `FLAGGED`, `BLOCKED`, or `ARCHIVED`.

---

## Requirements

### Requirement 1: Conversation Initiation — Buyer to Seller

**User Story:** As a buyer, I want to open a chat with a seller directly from a product page, so that I can ask questions and negotiate before placing an order.

#### Acceptance Criteria

1. WHEN a buyer initiates a chat from a product page, THE Chat_System SHALL create a new Conversation of type `BUYER_SELLER` with the `relatedProductId` set to the product's id.
2. WHEN a Conversation of type `BUYER_SELLER` is created for a given `(buyerId, sellerId, relatedProductId)` triple and an active Conversation already exists for that triple, THE Chat_System SHALL return the existing Conversation instead of creating a duplicate.
3. WHEN a new `BUYER_SELLER` Conversation is created, THE Chat_System SHALL automatically send an initial system message with the text "Hi, is this item still available?" attributed to the buyer.
4. WHEN a `BUYER_SELLER` Conversation is created, THE Chat_System SHALL attach the Product_Card for the related product as the first message in the conversation thread.
5. IF the target product's `status` is not `active`, THEN THE Chat_System SHALL still allow the Conversation to be created but SHALL include a `productUnavailable: true` flag in the Conversation metadata.
6. THE Chat_System SHALL enforce that a buyer cannot initiate a `BUYER_SELLER` Conversation with themselves.

---

### Requirement 2: Conversation Initiation — Seller to Supplier

**User Story:** As a seller, I want to open a procurement chat with a supplier when my inventory is low, so that I can negotiate restocking terms without leaving the platform.

#### Acceptance Criteria

1. WHEN a seller initiates a chat with a supplier, THE Chat_System SHALL create a new Conversation of type `SELLER_SUPPLIER` with the `relatedSupplierRequestId` set when a supplier request id is provided.
2. WHEN a `SELLER_SUPPLIER` Conversation is created, THE Chat_System SHALL allow the seller to attach an initial Product_Card referencing the product to be restocked.
3. THE Chat_System SHALL enforce that only users with role `SELLER` can initiate a `SELLER_SUPPLIER` Conversation as the initiating party.
4. THE Chat_System SHALL enforce that only users with role `SUPPLIER` can be the receiving party in a `SELLER_SUPPLIER` Conversation.

---

### Requirement 3: Conversation Initiation — Buyer to Courier

**User Story:** As a buyer, I want to chat with my assigned courier about delivery details, so that I can coordinate handoff without sharing my phone number.

#### Acceptance Criteria

1. WHEN a delivery is assigned to a courier for an order, THE Chat_System SHALL create a Conversation of type `BUYER_COURIER` with the `relatedOrderId` set to the order's id.
2. THE Chat_System SHALL enforce that a `BUYER_COURIER` Conversation is scoped to a single order and is automatically archived when the order reaches status `DELIVERED` or `CANCELLED`.
3. WHEN a `BUYER_COURIER` Conversation is archived, THE Chat_System SHALL set the Conversation's `Moderation_Status` to `ARCHIVED` and prevent new messages from being sent.
4. THE Chat_System SHALL enforce that only the buyer and the assigned courier are participants in a `BUYER_COURIER` Conversation.

---

### Requirement 4: Real-Time Message Delivery

**User Story:** As a user, I want messages I send to appear in the recipient's chat window immediately, so that conversations feel live and responsive.

#### Acceptance Criteria

1. WHEN a message is sent by a participant, THE Chat_System SHALL deliver the message to all online participants in the same Conversation via WebSocket within 500 milliseconds under normal load.
2. WHEN a participant is offline at the time a message is sent, THE Chat_System SHALL queue the message for delivery and deliver it when the participant reconnects.
3. THE Chat_System SHALL use Redis Pub/Sub to fan out messages from the Chat_Service to all WebSocket_Gateway instances serving participants of the same Conversation.
4. WHEN a WebSocket connection is established, THE Chat_System SHALL restore undelivered messages sent since the participant's last `lastReadAt` timestamp.
5. IF a WebSocket connection drops, THE Chat_System SHALL allow the client to reconnect and resume the session without data loss.

---

### Requirement 5: Message Types — Text and Images

**User Story:** As a user, I want to send text messages and images in a conversation, so that I can communicate clearly about products and orders.

#### Acceptance Criteria

1. WHEN a participant sends a `TEXT` message, THE Chat_System SHALL accept a `content` string of 1 to 4000 characters.
2. IF a `TEXT` message has a `content` field outside the range [1, 4000] characters, THEN THE Chat_System SHALL reject the request with HTTP 422 and a descriptive validation error.
3. WHEN a participant sends an `IMAGE` message, THE Chat_System SHALL accept image files in JPEG, PNG, or WebP format with a maximum file size of 10 MB.
4. IF an uploaded image exceeds 10 MB or is not in an accepted format, THEN THE Chat_System SHALL reject the upload with HTTP 422 and a descriptive validation error.
5. WHEN an image is uploaded, THE Chat_System SHALL store the file in the Media_Store and persist the resulting URL in the message's `metadata.mediaUrl` field.
6. THE Chat_System SHALL generate a thumbnail (max 300×300 px) for each uploaded image and store it alongside the original.

---

### Requirement 6: Message Types — Voice Notes

**User Story:** As a user, I want to record and send voice notes in a conversation, so that I can communicate quickly and comfortably in my preferred language without typing.

#### Acceptance Criteria

1. WHEN a participant sends a `VOICE_NOTE` message, THE Chat_System SHALL accept audio files in OGG/OPUS or M4A format with a maximum duration of 300 seconds and a maximum file size of 15 MB.
2. IF a voice note exceeds 300 seconds or 15 MB, or is not in an accepted format, THEN THE Chat_System SHALL reject the upload with HTTP 422 and a descriptive validation error.
3. WHEN a voice note is uploaded, THE Chat_System SHALL store the file in the Media_Store and persist the resulting URL in the message's `metadata.mediaUrl` field.
4. WHEN a voice note is stored, THE Chat_System SHALL persist the audio duration in seconds in the message's `metadata.durationSeconds` field.
5. THE Chat_System SHALL return the `metadata.mediaUrl` and `metadata.durationSeconds` fields in every voice note message response so that clients can render a playback UI without fetching additional data.

---

### Requirement 7: Message Types — Product Cards

**User Story:** As a seller, I want to send a product card inside a chat, so that the buyer can view product details and add the item to their cart without leaving the conversation.

#### Acceptance Criteria

1. WHEN a participant sends a `PRODUCT_CARD` message, THE Chat_System SHALL validate that the referenced `productId` exists in the catalog.
2. IF the referenced `productId` does not exist, THEN THE Chat_System SHALL reject the request with HTTP 422 and error code `CHAT_INVALID_PRODUCT_REFERENCE`.
3. WHEN a `PRODUCT_CARD` message is stored, THE Chat_System SHALL snapshot the product's `title`, `price`, `imageUrl`, `stockStatus`, and `productPageUrl` into the message's `metadata` at send time so that the card remains accurate even if the product is later updated.
4. THE Chat_System SHALL include a `metadata.addToCartUrl` field in every `PRODUCT_CARD` message that generates a direct cart-addition deep link for the referenced product and variant.

---

### Requirement 8: Message Types — Order References

**User Story:** As a buyer or seller, I want to reference an order inside a chat, so that both parties can see the order status and details in context.

#### Acceptance Criteria

1. WHEN a participant sends an `ORDER_REFERENCE` message, THE Chat_System SHALL validate that the referenced `orderId` exists and that the sender is a participant in that order (as buyer or seller).
2. IF the sender is not a participant in the referenced order, THEN THE Chat_System SHALL reject the request with HTTP 403 and error code `CHAT_ORDER_ACCESS_DENIED`.
3. WHEN an `ORDER_REFERENCE` message is stored, THE Chat_System SHALL snapshot the order's `status`, `totalAmount`, `currency`, and `orderPageUrl` into the message's `metadata` at send time.

---

### Requirement 9: Message Types — Location Pins

**User Story:** As a courier or buyer, I want to share a location pin in a chat, so that delivery handoff can be coordinated precisely.

#### Acceptance Criteria

1. WHEN a participant sends a `LOCATION_PIN` message, THE Chat_System SHALL accept a `metadata.latitude` value in the range [-90, 90] and a `metadata.longitude` value in the range [-180, 180].
2. IF `metadata.latitude` or `metadata.longitude` is outside the valid range, THEN THE Chat_System SHALL reject the request with HTTP 422 and a descriptive validation error.
3. WHEN a `LOCATION_PIN` message is stored, THE Chat_System SHALL persist the optional `metadata.label` string of up to 200 characters alongside the coordinates.

---

### Requirement 10: Message Types — Quick Actions

**User Story:** As a seller, I want to send quick-action buttons inside a chat, so that buyers can confirm availability, request a quote, or track an order with a single tap.

#### Acceptance Criteria

1. WHEN a participant sends a `QUICK_ACTION` message, THE Chat_System SHALL accept an `actionType` value from the set: `CONFIRM_AVAILABILITY`, `REQUEST_QUOTE`, `TRACK_ORDER`, `ACCEPT_OFFER`, `DECLINE_OFFER`.
2. IF the `actionType` is not in the accepted set, THEN THE Chat_System SHALL reject the request with HTTP 422 and a descriptive validation error.
3. WHEN a recipient taps a `QUICK_ACTION` button, THE Chat_System SHALL record the action response as a new `TEXT` message in the conversation thread with the response text and the `metadata.actionType` that was triggered.

---

### Requirement 11: Read Receipts and Presence

**User Story:** As a user, I want to see when my messages have been read and whether the other party is online, so that I know when to expect a reply.

#### Acceptance Criteria

1. WHEN a participant views messages in a Conversation, THE Chat_System SHALL update that participant's `lastReadAt` timestamp to the current UTC time.
2. WHEN a participant's `lastReadAt` is updated, THE Chat_System SHALL broadcast a read-receipt event to all other online participants in the same Conversation via WebSocket.
3. THE Chat_System SHALL store per-user online/offline Presence in Redis with a TTL of 60 seconds, refreshed by a heartbeat from the client every 30 seconds.
4. WHEN a participant's Presence changes (online → offline or offline → online), THE Chat_System SHALL broadcast a presence-change event to all Conversations that participant is a member of.
5. THE Chat_System SHALL return the `lastReadAt` timestamp for each participant in every Conversation detail response.

---

### Requirement 12: Conversation List and Search

**User Story:** As a user, I want to see a list of my conversations sorted by most recent activity, and search through them, so that I can quickly find the chat I need.

#### Acceptance Criteria

1. WHEN a user requests their conversation list, THE Chat_System SHALL return all Conversations where the user is a Participant, ordered by `lastMessageAt` descending.
2. WHEN returning a conversation list item, THE Chat_System SHALL include the Conversation `id`, `type`, `lastMessageAt`, the last message preview (truncated to 100 characters), the unread message count for the requesting user, and the other participant's display name.
3. WHEN a user submits a search query of 2 to 100 characters, THE Chat_System SHALL return Conversations whose last message content or participant display name matches the query using full-text search via Meilisearch.
4. IF a search query is fewer than 2 characters, THEN THE Chat_System SHALL reject the request with HTTP 422 and a descriptive validation error.
5. THE Chat_System SHALL paginate conversation list results with a default `limit` of 20 and a maximum `limit` of 50.

---

### Requirement 13: Trust and Safety — Rate Limiting

**User Story:** As a platform operator, I want to limit how many new conversations a user can start per hour, so that mass-messaging and spam campaigns are prevented.

#### Acceptance Criteria

1. THE Chat_System SHALL enforce a maximum of 20 new Conversations initiated per user per rolling 60-minute window.
2. IF a user attempts to initiate a Conversation that would exceed the rate limit, THEN THE Chat_System SHALL reject the request with HTTP 429 and error code `CHAT_RATE_LIMIT_EXCEEDED`.
3. THE Chat_System SHALL store rate-limit counters in Redis with a TTL aligned to the rolling window.
4. THE Chat_System SHALL enforce a maximum of 200 messages sent per user per rolling 60-minute window across all Conversations.
5. IF a user attempts to send a message that would exceed the per-user message rate limit, THEN THE Chat_System SHALL reject the request with HTTP 429 and error code `CHAT_MESSAGE_RATE_LIMIT_EXCEEDED`.

---

### Requirement 14: Trust and Safety — Spam Scoring

**User Story:** As a platform operator, I want the system to automatically score messages for spam risk, so that suspicious content is flagged before it reaches recipients.

#### Acceptance Criteria

1. WHEN a `TEXT` message is sent, THE Risk_Engine SHALL compute a Spam_Score in the range [0, 100] based on signals including: repeated external URLs, known suspicious phrases, message frequency from the sender, and mass-messaging patterns.
2. WHEN a message receives a Spam_Score of 70 or above, THE Chat_System SHALL set the message's `Moderation_Status` to `FLAGGED` and deliver it to the recipient with a `flagged: true` indicator.
3. WHEN a message receives a Spam_Score of 90 or above, THE Chat_System SHALL set the message's `Moderation_Status` to `BLOCKED` and not deliver it to the recipient.
4. THE Chat_System SHALL log every Spam_Score computation with the `messageId`, `score`, `signals`, and `computedAt` timestamp for audit purposes.
5. WHEN a message is `BLOCKED` by the Risk_Engine, THE Chat_System SHALL notify the sender that their message could not be delivered due to a policy violation, without revealing the specific score or signals.

---

### Requirement 15: Trust and Safety — Phone Number Masking

**User Story:** As a platform operator, I want to prevent sellers' and buyers' raw phone numbers from being exposed in chat, so that off-platform leakage is reduced.

#### Acceptance Criteria

1. THE Chat_System SHALL never include a participant's raw `phoneNumber` field in any message payload, conversation detail response, or participant profile returned via the chat API.
2. WHEN a participant's contact information is needed for delivery coordination, THE Chat_System SHALL provide a masked identifier (e.g., the first 4 digits followed by `****`) in place of the full phone number.
3. WHERE a platform operator has granted a specific Conversation a `PHONE_REVEAL` permission, THE Chat_System SHALL allow the full phone number to be retrieved by authorised participants only.

---

### Requirement 16: Trust and Safety — Moderation Tools

**User Story:** As a user, I want to report, block, or mute another participant, so that I can protect myself from harassment or unwanted contact.

#### Acceptance Criteria

1. WHEN a user reports a message, THE Chat_System SHALL create a moderation report record containing the `reporterId`, `messageId`, `conversationId`, `reason`, and `reportedAt` timestamp.
2. WHEN a user blocks another user, THE Chat_System SHALL prevent the blocked user from initiating new Conversations with the blocking user and prevent messages from the blocked user from being delivered to the blocking user.
3. WHEN a user mutes a Conversation, THE Chat_System SHALL suppress push notifications for that Conversation for the muting user while still delivering messages to the conversation thread.
4. WHEN a user unmutes a Conversation, THE Chat_System SHALL resume push notifications for that Conversation for that user.
5. IF a user attempts to send a message to a Conversation where the recipient has blocked them, THEN THE Chat_System SHALL reject the request with HTTP 403 and error code `CHAT_RECIPIENT_BLOCKED`.

---

### Requirement 17: Trust and Safety — Risk Engine

**User Story:** As a platform operator, I want the system to detect scam behaviour and unusual outreach patterns, so that fraudulent actors are identified before they cause harm.

#### Acceptance Criteria

1. WHEN a user initiates more than 10 new Conversations within a 10-minute window, THE Risk_Engine SHALL flag the user's account for review and notify the platform operations team.
2. WHEN a user sends the same message content to more than 5 different Conversations within a 5-minute window, THE Risk_Engine SHALL classify the behaviour as mass-messaging and apply a Spam_Score of 85 to all subsequent messages from that user for the next 60 minutes.
3. WHEN a Conversation contains a message with an external URL that matches a known phishing or scam domain list, THE Risk_Engine SHALL set the message's `Moderation_Status` to `BLOCKED` and flag the sending user's account.
4. THE Risk_Engine SHALL maintain a configurable scam domain blocklist that platform operators can update without a code deployment.

---

### Requirement 18: Notifications

**User Story:** As a user, I want to receive a notification when I get a new message, so that I can respond promptly even when I am not actively using the app.

#### Acceptance Criteria

1. WHEN a message is delivered to a participant who is offline, THE Chat_System SHALL trigger a push notification via the Notification_Service within 5 seconds of message persistence.
2. WHEN a push notification cannot be delivered after 3 attempts, THE Chat_System SHALL fall back to an SMS notification for messages of type `TEXT` or `VOICE_NOTE`.
3. WHEN a push notification cannot be delivered and no phone number is available, THE Chat_System SHALL fall back to an email notification.
4. THE Chat_System SHALL not send a notification for a message in a Conversation that the recipient has muted.
5. THE Chat_System SHALL not send a notification to a participant who is currently online (Presence is active) in the same Conversation.
6. WHEN a notification is sent, THE Chat_System SHALL include the sender's display name, a truncated message preview (max 80 characters), and a deep link to the Conversation.

---

### Requirement 19: Message Retention and Dispute Evidence

**User Story:** As a platform operator, I want messages to be retained for a defined period and preserved when linked to a dispute, so that evidence is available for resolution.

#### Acceptance Criteria

1. THE Chat_System SHALL retain all messages for a minimum of 365 days from the date of creation.
2. WHEN a Conversation is linked to an active `Order_CODDispute` or a support ticket, THE Chat_System SHALL mark all messages in that Conversation as `DISPUTE_EVIDENCE` and exempt them from routine deletion.
3. WHEN a dispute is resolved and the resolution period of 90 days has elapsed, THE Chat_System SHALL remove the `DISPUTE_EVIDENCE` flag and allow the messages to follow the standard retention policy.
4. WHEN a user deletes a message, THE Chat_System SHALL soft-delete the message by replacing the `content` with a tombstone string `"[message deleted]"` and setting a `deletedAt` timestamp, while retaining the message record for retention and dispute purposes.
5. THE Chat_System SHALL retain moderation logs (reports, blocks, spam scores) for a minimum of 730 days.

---

### Requirement 20: Commerce-Native Features — Negotiation Mode

**User Story:** As a seller, I want to offer a discount or bundle deal inside a chat, so that I can close a sale without the buyer leaving the conversation.

#### Acceptance Criteria

1. WHEN a seller sends a `QUICK_ACTION` message with `actionType` of `ACCEPT_OFFER` or `DECLINE_OFFER`, THE Chat_System SHALL record the negotiation outcome in the Conversation's `metadata.negotiationState` field.
2. WHEN a seller creates a discount offer inside a chat, THE Chat_System SHALL generate a unique, single-use checkout URL and include it in the message's `metadata.checkoutUrl` field.
3. WHEN a buyer taps the checkout URL from a chat-generated offer, THE Chat_System SHALL record the `conversationId` as the attribution source on the resulting order.
4. THE Chat_System SHALL enforce that a chat-generated checkout URL expires after 24 hours.

---

### Requirement 21: Marketplace Intelligence

**User Story:** As a platform operator, I want aggregated, anonymised signals from chat activity to feed into demand forecasting and fraud detection, so that the marketplace can make data-driven decisions.

#### Acceptance Criteria

1. WHEN more than 10 unique buyers ask about the same unavailable product within a 24-hour window, THE Chat_System SHALL emit a `DEMAND_SIGNAL` event to the analytics pipeline containing the `productId`, `count`, and `windowStart` timestamp.
2. WHEN a supplier is mentioned in more than 3 complaints (messages containing flagged complaint phrases) within a 7-day window, THE Chat_System SHALL emit a `SUPPLIER_RISK_SIGNAL` event to the analytics pipeline containing the `supplierId` and `count`.
3. THE Chat_System SHALL never include personally identifiable information (participant names, phone numbers, or message content) in any Marketplace_Intelligence event payload.
4. THE Chat_System SHALL aggregate intelligence signals at the platform level and not expose raw conversation data to any analytics consumer.

---

### Requirement 22: Anti-Off-Platform Leakage — Commerce Retention Features

**User Story:** As a platform operator, I want the chat experience to be so commerce-rich that users have no reason to move conversations off-platform, so that transactions stay within Maysar.

#### Acceptance Criteria

1. WHEN a seller sends a product link inside a chat, THE Chat_System SHALL automatically render it as a `PRODUCT_CARD` message with inline price, stock status, and an add-to-cart button.
2. WHEN a buyer asks about delivery status inside a chat, THE Chat_System SHALL allow the seller to attach an `ORDER_REFERENCE` message that includes a live delivery tracking link.
3. THE Chat_System SHALL provide a "Send Quote" action that allows a seller to generate a shareable cart bundle (multiple Product_Cards with quantities and a combined checkout URL) inside the conversation.
4. WHEN a quote bundle is created, THE Chat_System SHALL persist the bundle as a single `QUICK_ACTION` message with `actionType` `REQUEST_QUOTE` and include the `metadata.checkoutUrl` for the pre-filled cart.

---

### Requirement 23: Property-Based Correctness Properties

**User Story:** As a developer, I want the chat system to satisfy formal correctness properties, so that edge cases and invariants are continuously verified.

#### Acceptance Criteria

1. FOR ALL messages sent to a Conversation, THE Chat_System SHALL return those messages in `createdAt` ascending order when the conversation history is fetched, regardless of the order in which they were persisted (ordering invariant).
2. FOR ALL Conversations where a participant's `lastReadAt` is updated, THE Chat_System SHALL return an unread count of 0 for that participant when the conversation list is fetched immediately after the update (read-receipt idempotence).
3. FOR ALL `(userId, conversationId)` pairs where the user is not a Participant, THE Chat_System SHALL reject every message send, read, and list operation with HTTP 403 (access control invariant).
4. FOR ALL voice note uploads where the file is valid (correct format, within size and duration limits), THE Chat_System SHALL return a `metadata.mediaUrl` that resolves to the stored file (round-trip media storage property).
5. FOR ALL `PRODUCT_CARD` messages, THE Chat_System SHALL return the snapshotted product metadata at send time even after the underlying product record has been updated (snapshot immutability invariant).
6. FOR ALL rate-limit windows, the total number of Conversations a user can initiate SHALL not exceed 20 per rolling 60-minute window regardless of concurrent requests (rate-limit atomicity property).
