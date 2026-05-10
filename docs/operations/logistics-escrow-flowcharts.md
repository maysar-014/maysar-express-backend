# Maysar Express — Logistics & Escrow Flowcharts

> Covers: delivery lifecycle, COD escrow, route optimization, courier assignment, and dispute resolution.

---

## 1. Logistics End-to-End Flow

```mermaid
flowchart TD
    ORDER_CONFIRMED["Order Confirmed\n(Payment Received / COD Locked)"] --> CREATE_SHIPMENT["Create Shipment\n(Logistics Service)"]

    CREATE_SHIPMENT --> ROUTE_OPT["Route Optimization\n(Maps Service + ETA calc)"]
    ROUTE_OPT --> COURIER_MATCH["Courier Matching\n(Availability · Vehicle · Zone)"]

    COURIER_MATCH --> COURIER_FOUND{Courier\nAvailable?}
    COURIER_FOUND -->|No| RETRY_ASSIGN["Retry Assignment\n(Expand radius)"]
    RETRY_ASSIGN --> COURIER_MATCH
    COURIER_FOUND -->|Yes| ASSIGN["Assign to Courier\n(Push notification)"]

    ASSIGN --> COURIER_ACCEPT{Courier\nAccepts?}
    COURIER_ACCEPT -->|Declined| REASSIGN["Reassign to\nNext Courier"]
    REASSIGN --> COURIER_MATCH
    COURIER_ACCEPT -->|Accepted| PICKUP_ROUTE["Courier Navigates\nto Pickup"]

    PICKUP_ROUTE --> PICKUP_CONFIRM["Pickup Confirmed\n(Status: In Transit)"]
    PICKUP_CONFIRM --> DELIVERY_ROUTE["Courier Navigates\nto Delivery Address"]

    DELIVERY_ROUTE --> COD_ORDER{COD\nOrder?}
    COD_ORDER -->|No| DELIVER["Deliver Package\n(Photo Proof)"]
    COD_ORDER -->|Yes| COLLECT_CASH["Collect Cash\nfrom Buyer"]
    COLLECT_CASH --> OTP_VERIFY["Verify OTP\n(Buyer provides code)"]
    OTP_VERIFY --> OTP_VALID{OTP\nValid?}
    OTP_VALID -->|No| OTP_FAIL["OTP Failed\n(Max 3 attempts)"]
    OTP_FAIL --> ESCALATE["Escalate to Support\n(Delivery held)"]
    OTP_VALID -->|Yes| DELIVER

    DELIVER --> DELIVERY_COMPLETE["Delivery Complete ✅\n(GPS + Timestamp logged)"]
    DELIVERY_COMPLETE --> SETTLE["Trigger Settlement\n(Release escrow / COD funds)"]
    SETTLE --> NOTIFY_ALL["Notify Buyer · Seller · Courier"]

    style ORDER_CONFIRMED fill:#2196F3,color:#fff
    style DELIVERY_COMPLETE fill:#4CAF50,color:#fff
    style ESCALATE fill:#F44336,color:#fff
    style SETTLE fill:#9C27B0,color:#fff
```

---

## 2. COD Escrow State Machine

```mermaid
stateDiagram-v2
    [*] --> COD_INITIATED : Buyer selects COD

    COD_INITIATED --> COMMITMENT_LOCKED : Wallet commitment created\n(Buyer's wallet hold)
    COMMITMENT_LOCKED --> ORDER_DISPATCHED : Order confirmed & shipped

    ORDER_DISPATCHED --> COURIER_ARRIVED : Courier at delivery address
    COURIER_ARRIVED --> CASH_COLLECTED : Buyer pays cash
    CASH_COLLECTED --> OTP_SUBMITTED : Courier enters OTP

    OTP_SUBMITTED --> OTP_VERIFIED : OTP matches
    OTP_SUBMITTED --> OTP_FAILED : OTP invalid

    OTP_FAILED --> OTP_RETRY : Retry (attempt 2/3)
    OTP_RETRY --> OTP_SUBMITTED
    OTP_FAILED --> ESCALATED : Max retries exceeded

    OTP_VERIFIED --> FUNDS_RELEASED : Escrow released
    FUNDS_RELEASED --> SELLER_CREDITED : Seller wallet credited
    FUNDS_RELEASED --> COURIER_CREDITED : Courier earnings credited
    SELLER_CREDITED --> [*]
    COURIER_CREDITED --> [*]

    ESCALATED --> SUPPORT_REVIEW : Support investigates
    SUPPORT_REVIEW --> MANUAL_RELEASE : Admin approves
    SUPPORT_REVIEW --> REFUND_BUYER : Delivery failed
    MANUAL_RELEASE --> SELLER_CREDITED
    REFUND_BUYER --> [*]
```

---

## 3. Courier Assignment Algorithm

```mermaid
flowchart TD
    SHIPMENT["New Shipment Created\n(Pickup + Delivery coords)"] --> ZONE["Determine Delivery Zone\n(Maps Service)"]

    ZONE --> QUERY["Query Available Couriers\n(Status: online · Zone match)"]
    QUERY --> SCORE["Score Each Courier"]

    subgraph Scoring["Courier Scoring Factors"]
        DIST["📍 Distance to Pickup\n(Weighted: 40%)"]
        RATING["⭐ Customer Rating\n(Weighted: 25%)"]
        ONTIME["⏱️ On-time Rate\n(Weighted: 20%)"]
        CAPACITY["📦 Vehicle Capacity\n(Weighted: 15%)"]
    end

    Scoring --> SCORE
    SCORE --> RANK["Rank Couriers\n(Top 3 candidates)"]
    RANK --> OFFER["Send Assignment Offer\n(Push notification)"]

    OFFER --> RESPONSE{Response\nwithin 60s?}
    RESPONSE -->|Accepted| ASSIGNED["Courier Assigned ✅"]
    RESPONSE -->|Declined| NEXT["Offer to Next\nCandidate"]
    RESPONSE -->|Timeout| NEXT
    NEXT --> OFFER

    NEXT --> EXHAUSTED{All Candidates\nExhausted?}
    EXHAUSTED -->|Yes| EXPAND["Expand Search Radius\n(+5km)"]
    EXPAND --> QUERY
    EXHAUSTED -->|No| OFFER

    style ASSIGNED fill:#4CAF50,color:#fff
    style EXPAND fill:#FF9800,color:#fff
```

---

## 4. Delivery Status Tracking Flow

```mermaid
sequenceDiagram
    actor Buyer
    participant App as Buyer App
    participant Logistics as Logistics Service
    participant Courier as Courier App
    participant Maps as Maps Service
    participant Notif as Notification Service

    Note over Buyer,Notif: Real-time Delivery Tracking

    Courier->>Logistics: Update location (every 30s)
    Logistics->>Maps: Calculate ETA from current position
    Maps-->>Logistics: Updated ETA

    Logistics->>App: Push location update
    App->>Buyer: Show courier on map

    Courier->>Logistics: Status: Arrived at pickup
    Logistics->>Notif: Notify seller: courier arrived
    Notif->>Seller: SMS/Push notification

    Courier->>Logistics: Status: Picked up
    Logistics->>Notif: Notify buyer: order picked up
    Notif->>Buyer: SMS: "Your order is on the way"

    Courier->>Logistics: Status: Arrived at delivery
    Logistics->>Notif: Notify buyer: courier nearby
    Notif->>Buyer: SMS: "Courier is at your door"

    Courier->>Logistics: Status: Delivered + proof
    Logistics->>Notif: Notify buyer: delivered
    Notif->>Buyer: SMS/Push: "Order delivered ✅"
    Logistics->>Notif: Notify seller: delivery complete
```

---

## 5. Escrow Release Decision Tree

```mermaid
flowchart TD
    DELIVERY_EVENT["Delivery Event Received"] --> TYPE{Order\nType?}

    TYPE -->|"Prepaid\n(Card/Wallet/Mobile)"| PREPAID_CHECK["Verify Delivery\nConfirmation"]
    TYPE -->|"COD"| COD_CHECK["Verify OTP\n+ Cash Collection"]

    PREPAID_CHECK --> PREPAID_CONFIRMED{Delivery\nConfirmed?}
    PREPAID_CONFIRMED -->|Yes| RELEASE_PREPAID["Release Seller Funds\n(Immediate)"]
    PREPAID_CONFIRMED -->|No| DISPUTE_WINDOW["Open Dispute Window\n(48 hours)"]

    COD_CHECK --> COD_VERIFIED{OTP\nVerified?}
    COD_VERIFIED -->|Yes| RELEASE_COD["Release COD Escrow\n+ Credit Courier"]
    COD_VERIFIED -->|No| COD_ESCALATE["Escalate to Support\n(Hold funds)"]

    RELEASE_PREPAID --> COMMISSION_DEDUCT["Deduct Platform\nCommission (8%)"]
    RELEASE_COD --> COMMISSION_DEDUCT

    COMMISSION_DEDUCT --> ENABLER_CHECK{Enabler\nAttribution?}
    ENABLER_CHECK -->|Yes| ENABLER_CREDIT["Credit Enabler\nCommission (15-20%)"]
    ENABLER_CHECK -->|No| SELLER_CREDIT["Credit Seller\nFull Net Amount"]
    ENABLER_CREDIT --> SELLER_CREDIT

    SELLER_CREDIT --> AVAILABLE["Funds Available\nfor Payout Request"]

    DISPUTE_WINDOW --> DISPUTE_RAISED{Dispute\nRaised?}
    DISPUTE_RAISED -->|No| RELEASE_PREPAID
    DISPUTE_RAISED -->|Yes| ADMIN_REVIEW["Admin Reviews\nDispute"]
    ADMIN_REVIEW --> ADMIN_DECISION{Decision}
    ADMIN_DECISION -->|Refund Buyer| REFUND["Process Refund"]
    ADMIN_DECISION -->|Release to Seller| RELEASE_PREPAID

    style RELEASE_PREPAID fill:#4CAF50,color:#fff
    style RELEASE_COD fill:#4CAF50,color:#fff
    style COD_ESCALATE fill:#F44336,color:#fff
    style AVAILABLE fill:#2196F3,color:#fff
```
