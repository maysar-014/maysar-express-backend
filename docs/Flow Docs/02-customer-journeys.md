# Customer Journeys

This doc covers the buyer journey from discovery to payment, tracking, cancellation, and refund.

## Concerned Actors

| Actor | Concern |
|------|---------|
| Buyer / customer | Can I find the right product, pay safely, and receive it on time? |
| `catalog-service` | Product discovery, buy-box, pricing, and availability |
| `checkout-service` | Cart handling and checkout session orchestration |
| `order-service` | Order creation, lifecycle, cancellation, and tracking |
| `inventory-service` | Stock reservation and release |
| `payment-service` | Card, mobile money, wallet, refund, and COD pre-auth |
| `wallet-service` | Wallet balances and COD commitment locks |
| `logistics-service` | Shipment creation, routing, courier assignment, tracking |
| `notification-service` | Order, payment, shipment, and refund notifications |
| `analytics-service` | Funnel, conversion, and revenue metrics |

## Use Case Matrix

| ID | Use case | Happy path | Unhappy path |
|----|----------|------------|--------------|
| BUY-01 | Discovery and product detail | The buyer searches, filters, opens a product, and sees the current buy-box winner and price. | No results, stale index, or unavailable buy-box shows an empty state with retry and fallback suggestions. |
| BUY-02 | Checkout initiate and confirm | The cart is validated, stock is reserved, checkout is confirmed, and an order is created. | Invalid address, missing items, stock conflict, or duplicate confirm is blocked before money moves. |
| BUY-03 | Payment processing | The buyer pays with mobile money, card, wallet, or COD pre-auth and receives a confirmed payment state. | Gateway timeout, fraud rejection, insufficient wallet balance, or COD lock failure produces a clear recovery path. |
| BUY-04 | Order tracking | The buyer can follow the shipment timeline, courier updates, and notifications until delivery completes. | Tracking number mismatch, logistics delay, or courier update failure falls back to support guidance and refreshed status. |
| BUY-05 | Cancellation and refund | A valid cancel request triggers refund processing, inventory release, and notification updates. | Cancel window expired, partial fulfillment, or already-settled payment changes the path to support or manual review. |

## Flow Notes

- Checkout should be idempotent; double-clicks must not create duplicate orders.
- Payment failures must not leave inventory reserved without compensation.
- COD flows must show the wallet lock or delivery verification state explicitly.
- Refunds should always show the source payment, destination, and expected timing.

## Sequence Diagram: Search To Order Confirmation

```mermaid
sequenceDiagram
    actor Buyer
    participant UI as Storefront
    participant Catalog as Catalog Service
    participant Checkout as Checkout Service
    participant Inventory as Inventory Service
    participant Order as Order Service
    participant Payment as Payment Service
    participant Wallet as Wallet Service
    participant Logistics as Logistics Service
    participant Notif as Notification Service
    participant Bus as EventBus

    Buyer->>UI: Search and open product
    UI->>Catalog: GET /api/catalog/products
    Catalog-->>UI: Product list and buy-box data

    Buyer->>UI: Add item and confirm checkout
    UI->>Checkout: POST /api/checkout/initiate
    Checkout->>Inventory: Reserve stock
    alt Stock available
        Checkout->>Order: Create order draft
        Order->>Bus: Publish OrderCreated
        Order->>Payment: Start payment processing
        alt Card or mobile money
            Payment->>Payment: Assess fraud and call gateway
            Payment->>Bus: Publish PaymentCompleted
        else Wallet payment
            Payment->>Wallet: Debit wallet
            Payment->>Bus: Publish PaymentCompleted
        else COD
            Payment->>Wallet: Lock COD commitment
            Payment->>Bus: Publish PaymentCODScheduled
        end
        Order->>Logistics: Create shipment
        Order->>Notif: Send confirmation
        Order->>Bus: Publish OrderConfirmed
        Checkout-->>UI: 200 Checkout complete
    else Stock unavailable
        Checkout->>Bus: Publish StockReservationFailed
        Checkout-->>UI: 409 Out of stock
    end
```

## Sequence Diagram: Tracking, Cancellation, And Refund

```mermaid
sequenceDiagram
    actor Buyer
    participant UI as Storefront
    participant Order as Order Service
    participant Payment as Payment Service
    participant Inventory as Inventory Service
    participant Logistics as Logistics Service
    participant Notif as Notification Service
    participant Bus as EventBus

    Buyer->>UI: Open order timeline
    UI->>Order: GET /api/order/orders/:id
    Order-->>UI: Current status and history

    alt Buyer requests cancellation
        UI->>Order: POST /api/order/orders/:id/cancel
        Order->>Payment: Refund if payment completed
        Payment->>Inventory: Release reservation or COD lock
        Payment->>Bus: Publish RefundProcessed or PaymentReversed
        Order->>Logistics: Stop or cancel shipment
        Order->>Notif: Notify buyer and seller
        Order->>Bus: Publish OrderCancelled
        Order-->>UI: 200 Cancellation accepted
    else Buyer only tracks
        Order->>Logistics: Read shipment updates
        Logistics-->>Order: Tracking history
        Order-->>UI: Timeline refreshed
    end
```

## What Good Looks Like

- The buyer always sees a single source of truth for order state.
- Any failure in payment, stock reservation, or logistics is visible as a recoverable state, not a dead end.
- Notifications and analytics should follow the core order outcome, not lead it.


---

## Chat: Buyer Initiates Chat from Product Page

```mermaid
sequenceDiagram
    actor Buyer
    participant UI as Storefront
    participant Chat as Chat Service
    participant WS as WebSocket
    participant Notif as Notification Service

    Buyer->>UI: Click "Message Seller" on product page
    UI->>Chat: POST /api/chat/v1/conversations
    Note over Chat: type=BUYER_SELLER, relatedProductId=prod_xyz
    Chat->>Chat: Dedup check (existing conversation?)
    Chat->>Chat: Rate limit check (20 conv/hr)
    Chat->>Chat: Block check
    Chat->>Chat: Create conversation + participants
    Chat->>Chat: Auto-send PRODUCT_CARD message (snapshot)
    Chat->>Chat: Auto-send TEXT "Hi, is this item still available?"
    Chat-->>UI: 201 { conversationId }

    UI->>WS: Connect ws://host/ws?userId=buyer_id
    WS-->>UI: Deliver unread messages

    Note over Chat,Notif: Seller is offline
    Chat->>Notif: Push notification to seller
    Notif-->>Seller: "New message from buyer"
```

## Chat: Buyer Coordinates Delivery with Courier

```mermaid
sequenceDiagram
    participant Order as Order Service
    participant Bus as EventBus
    participant Chat as Chat Service
    actor Buyer
    actor Courier

    Order->>Bus: OrderDelivered / OrderCancelled
    Bus->>Chat: ArchiveCourierConversationsJob
    Chat->>Chat: Set BUYER_COURIER conversation → ARCHIVED
    Note over Chat: No new messages can be sent after archiving

    Buyer->>Chat: POST /conversations/:id/messages
    Note over Chat: type=LOCATION_PIN, lat=-6.79, lng=39.20
    Chat-->>Courier: WebSocket fan-out (location pin)
```
