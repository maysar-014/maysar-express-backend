# Maysar Express — Revenue & Payment Flow Diagrams

> Covers: payment processing, COD escrow, wallet mechanics, commission distribution, and payout flows.

---

## 1. Revenue Flow Overview

```mermaid
flowchart TD
    BUYER["🛒 Buyer Pays\n(Order Total)"] --> PLATFORM["Maysar Platform\n(Collects Full Amount)"]

    PLATFORM --> SPLIT["Revenue Split Engine\n(Commission Service)"]

    SPLIT --> SELLER_SHARE["🏪 Seller Share\n(Order Total − 8% commission)"]
    SPLIT --> PLATFORM_FEE["💰 Platform Fee\n(8% of order value)"]
    SPLIT --> ENABLER_SHARE["🤝 Enabler Commission\n(15-20% if attributed)"]
    SPLIT --> LOGISTICS_FEE["🚚 Logistics Fee\n(Delivery charge)"]

    PLATFORM_FEE --> PLATFORM_WALLET["Platform Revenue\nWallet"]
    SELLER_SHARE --> SELLER_WALLET["Seller Wallet\n(Held until delivery)"]
    ENABLER_SHARE --> ENABLER_WALLET["Enabler Wallet\n(Credited on completion)"]
    LOGISTICS_FEE --> COURIER_WALLET["Courier Earnings\n(Per delivery)"]

    SELLER_WALLET --> SELLER_PAYOUT["Seller Payout\n(Bank / Mobile Money)"]
    ENABLER_WALLET --> ENABLER_PAYOUT["Enabler Payout\n(Bank / Mobile Money)"]
    COURIER_WALLET --> COURIER_PAYOUT["Courier Payout\n(Weekly settlement)"]

    style BUYER fill:#2196F3,color:#fff
    style PLATFORM fill:#FF6B6B,color:#fff
    style PLATFORM_FEE fill:#9C27B0,color:#fff
    style SELLER_SHARE fill:#4CAF50,color:#fff
    style ENABLER_SHARE fill:#FF9800,color:#fff
    style LOGISTICS_FEE fill:#009688,color:#fff
```

---

## 2. Payment Processing Flow (All Methods)

```mermaid
flowchart TD
    ORDER["Order Confirmed\n(Stock Reserved)"] --> PAYMENT_INIT["Payment Service\nInitiates Payment"]

    PAYMENT_INIT --> FRAUD["Fraud Check\n(Score · History · Limits)"]
    FRAUD --> FRAUD_RESULT{Fraud\nCheck}
    FRAUD_RESULT -->|Rejected| FRAUD_FAIL["Payment Rejected ❌\nOrder Cancelled\nStock Released"]
    FRAUD_RESULT -->|Passed| METHOD{Payment\nMethod}

    METHOD -->|"Mobile Money\n(M-Pesa / Airtel)"| PESAPAL["Pesapal Gateway\nSTK Push / USSD"]
    METHOD -->|"Card"| PESAPAL
    METHOD -->|"Wallet"| WALLET_CHECK["Check Wallet Balance"]
    METHOD -->|"COD"| COD_FLOW["COD Pre-Auth\nWallet Commitment Lock"]

    PESAPAL --> GATEWAY_RESULT{Gateway\nResponse}
    GATEWAY_RESULT -->|Success| PAYMENT_COMPLETE["Payment Completed ✅"]
    GATEWAY_RESULT -->|Timeout| RETRY["Retry (3x)\nExponential Backoff"]
    GATEWAY_RESULT -->|Failed| PAYMENT_FAIL["Payment Failed ❌\nStock Released"]
    RETRY --> GATEWAY_RESULT

    WALLET_CHECK --> BALANCE{Sufficient\nBalance?}
    BALANCE -->|No| PAYMENT_FAIL
    BALANCE -->|Yes| WALLET_DEBIT["Debit Wallet\n(Optimistic Lock)"]
    WALLET_DEBIT --> PAYMENT_COMPLETE

    COD_FLOW --> COD_LOCK["Lock COD Commitment\n(Wallet Hold)"]
    COD_LOCK --> COD_SCHEDULED["COD Scheduled ✅\nDelivery Proceeds"]

    PAYMENT_COMPLETE --> NOTIFY["Notify Buyer & Seller\n(SMS + Push)"]
    PAYMENT_COMPLETE --> ORDER_CONFIRM["Order Confirmed\nLogistics Triggered"]

    style PAYMENT_COMPLETE fill:#4CAF50,color:#fff
    style PAYMENT_FAIL fill:#F44336,color:#fff
    style FRAUD_FAIL fill:#F44336,color:#fff
    style COD_SCHEDULED fill:#FF9800,color:#fff
```

---

## 3. COD (Cash on Delivery) Escrow Flow

```mermaid
sequenceDiagram
    actor Buyer
    actor Courier
    participant Platform as Maysar Platform
    participant Wallet as Wallet Service
    participant Payment as Payment Service
    participant Logistics as Logistics Service

    Note over Buyer,Logistics: COD Order Lifecycle

    Buyer->>Platform: Place COD Order
    Platform->>Wallet: Lock COD Commitment\n(Buyer's wallet hold)
    Wallet-->>Platform: Commitment ID created
    Platform-->>Buyer: Order confirmed\n(COD scheduled)

    Note over Courier,Logistics: Delivery Phase

    Logistics->>Courier: Assign delivery
    Courier->>Logistics: Confirm pickup
    Courier->>Buyer: Arrive at delivery address

    Note over Buyer,Courier: OTP Verification

    Platform->>Buyer: Send OTP via SMS
    Buyer->>Courier: Show OTP + Pay Cash
    Courier->>Platform: Submit OTP + GPS proof

    Platform->>Payment: Verify COD settlement
    Payment->>Wallet: Release commitment hold
    Wallet->>Wallet: Credit seller wallet\n(minus platform fee)
    Wallet->>Wallet: Credit courier earnings

    Payment-->>Platform: COD verified ✅
    Platform-->>Buyer: Delivery confirmed
    Platform-->>Courier: Earnings credited
    Platform-->>Seller: Payment notification

    Note over Buyer,Logistics: Failure Path

    alt OTP Invalid / Expired
        Courier->>Platform: OTP verification failed
        Platform->>Logistics: Mark delivery failed
        Platform->>Buyer: Resend OTP option
        Platform->>Wallet: Keep commitment locked\n(pending resolution)
    end
```

---

## 4. Wallet Architecture

```mermaid
graph TB
    subgraph WalletTypes["Wallet Types"]
        BUYER_W["🛒 Buyer Wallet\n(COD commitments\n+ refund credits)"]
        SELLER_W["🏪 Seller Wallet\n(Earnings held\nuntil delivery)"]
        ENABLER_W["🤝 Enabler Wallet\n(Commission credits)"]
        COURIER_W["🚴 Courier Wallet\n(Delivery earnings)"]
    end

    subgraph WalletOps["Wallet Operations"]
        CREDIT["Credit\n(Payment received)"]
        DEBIT["Debit\n(Payment made)"]
        HOLD["Hold\n(COD commitment)"]
        RELEASE["Release\n(Hold lifted)"]
        TRANSFER["Transfer\n(Internal move)"]
    end

    subgraph Safety["Safety Mechanisms"]
        OPT_LOCK["Optimistic Locking\n(version column)"]
        REDLOCK["Redlock\n(Distributed mutex)"]
        IDEMPOTENCY["Idempotency Keys\n(Duplicate prevention)"]
        AUDIT["Ledger Audit Trail\n(Every transaction logged)"]
    end

    subgraph Payout["Payout Channels"]
        BANK["Bank Transfer\n(TZS)"]
        MPESA["M-Pesa\n(Mobile Money)"]
        AIRTEL["Airtel Money"]
    end

    WalletTypes --> WalletOps
    WalletOps --> Safety
    SELLER_W & ENABLER_W & COURIER_W --> Payout

    style OPT_LOCK fill:#FF9800,color:#fff
    style REDLOCK fill:#F44336,color:#fff
    style IDEMPOTENCY fill:#9C27B0,color:#fff
```

---

## 5. Commission Distribution Flow

```mermaid
flowchart LR
    ORDER_COMPLETE["Order Completed\n(Delivery Confirmed)"] --> COMMISSION_SVC["Commission Service\nCalculates Distribution"]

    COMMISSION_SVC --> CHECK_ENABLER{Enabler\nAttribution?}

    CHECK_ENABLER -->|Yes| ENABLER_CALC["Enabler Commission\n15-20% of order value\n(Quality bonus up to +18%)"]
    CHECK_ENABLER -->|No| NO_ENABLER["No Enabler\nCommission"]

    COMMISSION_SVC --> SELLER_CALC["Seller Net\n= Order Total\n− Platform Fee (8%)\n− Enabler Commission\n− Logistics Fee"]

    COMMISSION_SVC --> PLATFORM_CALC["Platform Revenue\n= 8% of order value"]

    ENABLER_CALC --> ENABLER_WALLET["Credit Enabler Wallet"]
    SELLER_CALC --> SELLER_WALLET["Credit Seller Wallet\n(Held until delivery)"]
    PLATFORM_CALC --> PLATFORM_REVENUE["Platform Revenue\nAccount"]

    SELLER_WALLET --> DELIVERY_CONFIRM{Delivery\nConfirmed?}
    DELIVERY_CONFIRM -->|Yes| SELLER_RELEASE["Release to Seller\n(Available for payout)"]
    DELIVERY_CONFIRM -->|No| HOLD["Keep on Hold\n(Dispute window)"]

    style ORDER_COMPLETE fill:#4CAF50,color:#fff
    style PLATFORM_REVENUE fill:#9C27B0,color:#fff
    style SELLER_RELEASE fill:#2196F3,color:#fff
```

---

## 6. Payout Settlement Flow

```mermaid
sequenceDiagram
    participant Seller
    participant Platform as Payout Service
    participant Wallet as Wallet Service
    participant Bank as Bank / Mobile Money

    Seller->>Platform: Request Payout\n(Amount + destination)
    Platform->>Wallet: Check available balance\n(not held/committed)
    Wallet-->>Platform: Balance confirmed

    Platform->>Platform: Validate payout request\n(KYC status · limits · schedule)

    alt Payout Approved
        Platform->>Wallet: Debit seller wallet
        Platform->>Bank: Initiate transfer\n(Pesapal / direct bank)
        Bank-->>Platform: Transfer confirmed
        Platform->>Seller: Payout notification ✅
        Platform->>Platform: Record payout audit log
    else Payout Rejected
        Platform->>Seller: Rejection reason\n(KYC · limits · schedule)
    end
```
