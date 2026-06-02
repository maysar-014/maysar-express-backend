# Maysar Express — Revenue & Payment Flow Diagrams

> **Evidence-based** — built from reading actual source files.
> Sources: `services/order-service/src/application/sagas/payment.saga.ts`, `services/payment-service/src/domain/entities/payment.entity.ts`, `services/wallet-service/src/domain/entities/wallet.entity.ts`, `services/commission-service/commissionService.ts`, `services/logistics-service/src/api/controllers/cod.controller.ts`

---

## 1. Payment Methods (Actual — from payment.entity.ts)

```mermaid
graph LR
    subgraph Methods["PaymentMethod enum (payment.entity.ts)"]
        MPESA["MPESA"]
        AIRTEL["AIRTEL_MONEY"]
        TIGO["TIGO_PESA"]
        HALO["HALOPESA"]
        WALLET["WALLET"]
        BANK["BANK_TRANSFER"]
        CARD["CARD"]
    end

    subgraph Providers["PaymentProvider enum"]
        PAYMENT_GATEWAY["PAYMENT_GATEWAY\n(Card, Mobile Money, Bank)"]
        INTERNAL["INTERNAL_WALLET\n(Wallet payments)"]
    end

    subgraph COD["COD (Cash on Delivery)"]
        COD_NOTE["Not a PaymentMethod enum value\nHandled as special case in PaymentSaga:\nFraud check skipped\nStatus set to COMPLETED immediately\nWallet commitment held during delivery"]
    end

    MPESA & AIRTEL & TIGO & HALO & CARD & BANK --> PAYMENT_GATEWAY
    WALLET --> INTERNAL

    style PAYMENT_GATEWAY fill:#4CAF50,color:#fff
    style INTERNAL fill:#2196F3,color:#fff
    style COD_NOTE fill:#FF9800,color:#fff
```

---

## 2. Payment Processing Flow (Actual — from payment.saga.ts)

```mermaid
flowchart TD
    ORDER_CREATED["Order Created\n(PaymentSaga triggered)"] --> FRAUD_CHECK{COD\nOrder?}

    FRAUD_CHECK -->|"Yes (COD)"| COD_SKIP["Skip Fraud Check\nSet status = COMPLETED\nReturn immediately"]
    FRAUD_CHECK -->|"No"| FRAUD["Fraud Check\n(amount > 1,000,000 TZS\n→ auto-reject)"]

    FRAUD --> FRAUD_RESULT{Fraud\nResult}
    FRAUD_RESULT -->|"Rejected"| FRAUD_FAIL["status = FAILED\nThrow error\nSaga compensates"]
    FRAUD_RESULT -->|"Approved"| METHOD{Payment\nMethod}

    METHOD -->|"CARD or\nMOBILE_MONEY"| PAYMENT_GATEWAY["PaymentGatewayAdapter\n.processPayment()\n(orderId, amount, currency\nbuyerId, phone, email)"]
    METHOD -->|"WALLET"| WALLET_DEBIT["WalletServiceClient\n.debitWallet(buyerId, amount\ncurrency, description)"]
    METHOD -->|"Other"| UNSUPPORTED["Throw: Unsupported\npayment method"]

    PAYMENT_GATEWAY --> PAY_RESULT{Result}
    WALLET_DEBIT --> PAY_RESULT

    PAY_RESULT -->|"success"| COMPLETE["status = COMPLETED\ntransactionId saved"]
    PAY_RESULT -->|"failure"| FAIL["status = FAILED\nThrow error"]

    FAIL --> COMPENSATE["Compensation:\npublishCommand('PaymentRefund.Command')\nif status was COMPLETED"]

    style COD_SKIP fill:#FF9800,color:#fff
    style COMPLETE fill:#4CAF50,color:#fff
    style FRAUD_FAIL fill:#F44336,color:#fff
    style FAIL fill:#F44336,color:#fff
```

---

## 3. Payment Status Transitions (Actual — from payment.entity.ts)

```mermaid
stateDiagram-v2
    [*] --> PENDING : Payment created
    PENDING --> PROCESSING : processPaymentGatewayPayment() called
    PENDING --> COMPLETED : COD order (immediate)
    PENDING --> COMPLETED : Wallet payment success
    PROCESSING --> COMPLETED : PaymentGateway success
    PROCESSING --> FAILED : PaymentGateway failure
    PENDING --> FAILED : Fraud check rejected
    COMPLETED --> REFUNDED : Full refund
    COMPLETED --> PARTIALLY_REFUNDED : Partial refund
    PENDING --> CANCELLED : Saga compensation
    FAILED --> [*]
    CANCELLED --> [*]
    REFUNDED --> [*]
    PARTIALLY_REFUNDED --> [*]
```

---

## 4. Wallet Entity Operations (Actual — from wallet.entity.ts)

```mermaid
graph TB
    subgraph WalletState["Wallet State"]
        BAL["balance\n(total funds)"]
        FROZEN["frozenAmount\n(COD commitments)"]
        AVAIL["availableBalance\n= balance − frozenAmount"]
        COD_LIMIT["codCommitmentLimit"]
        COD_USED["codCommitmentUsed"]
        COD_COUNT["codCommitmentCount"]
        VERSION["version\n(optimistic locking)"]
    end

    subgraph WalletStatus["WalletStatus enum"]
        ACTIVE["ACTIVE"]
        FROZEN_S["FROZEN"]
        SUSPENDED["SUSPENDED"]
        CLOSED["CLOSED"]
    end

    subgraph Operations["Business Methods"]
        CREDIT["credit(amount)\n→ balance += amount"]
        DEBIT["debit(amount)\n→ checks availableBalance\n→ balance -= amount"]
        FREEZE["freeze(amount)\n→ frozenAmount += amount"]
        UNFREEZE["unfreeze(amount)\n→ frozenAmount -= amount"]
        PLACE_HOLD["placeHold(Hold)\n→ creates time-limited hold\n→ frozenAmount += hold.amount"]
        RELEASE_HOLD["releaseHold(holdId)\n→ frozenAmount -= hold.amount"]
        CAPTURE_HOLD["captureHold(holdId)\n→ balance -= hold.amount\n→ frozenAmount -= hold.amount"]
        USE_COD["useCODCommitment(amount)\n→ codCommitmentUsed += amount\n→ codCommitmentCount++\n→ frozenAmount += amount"]
        RELEASE_COD["releaseCODCommitment(amount)\n→ codCommitmentUsed -= amount\n→ frozenAmount -= amount"]
    end

    WalletState --> Operations

    style AVAIL fill:#4CAF50,color:#fff
    style FROZEN fill:#FF9800,color:#fff
    style USE_COD fill:#9C27B0,color:#fff
```

---

## 5. COD Escrow Flow (Actual — from cod.controller.ts + logistics routes)

```mermaid
sequenceDiagram
    actor Buyer
    actor Courier
    participant LogisticsAPI as Logistics Service\n/api/v1/cod/:deliveryId
    participant CODUseCase as InitiateCODDeliveryUseCase\n+ VerifyCODDeliveryUseCase
    participant WalletSvc as Wallet Service
    participant Bus as EventBus

    Note over Buyer,Bus: COD Delivery Flow

    Courier->>LogisticsAPI: POST /cod/:deliveryId/otp
    LogisticsAPI->>CODUseCase: initiateCODDelivery({ deliveryId })
    CODUseCase->>Buyer: Send OTP via SMS
    LogisticsAPI-->>Courier: 200 { message: 'OTP generated and sent to buyer' }

    Courier->>Buyer: Arrive, collect cash
    Buyer->>Courier: Provide OTP

    Courier->>LogisticsAPI: POST /cod/:deliveryId/verify\n{ otp, location: { lat, lng } }
    LogisticsAPI->>CODUseCase: verifyCODDelivery({ deliveryId, otp, location })

    alt OTP valid + location valid
        CODUseCase->>WalletSvc: Release COD commitment\n(releaseCODCommitment)
        CODUseCase->>Bus: Publish CODVerified event
        CODUseCase->>CODUseCase: Update delivery status → delivered
        CODUseCase->>CODUseCase: Update COD reputation score
        LogisticsAPI-->>Courier: 200 Delivery verified
    else OTP invalid / missing location
        LogisticsAPI-->>Courier: 400 Missing required verification data
    end
```

---

## 6. Commission Service Event Handlers (Actual — from commissionService.ts)

```mermaid
flowchart TD
    subgraph CourierFlow["Courier Commission Flow"]
        CE["CourierEarningsUpdated\n(event)"] --> CC["CommissionCalculated\n(base: 50 × 0.8 = 40)"]
        CC --> BA["BonusAssessed\n(random 0-20 bonus)"]
        BA --> PS1["PayoutScheduled"]
    end

    subgraph EnablerFlow["Enabler Commission Flow"]
        TC["TaskCreated\n(event)"] --> EM["EnablerMatched\n(published back)"]
        TAA["TaskAssignmentAccepted\n(event)"] --> CR1["Commission record created\ntype: task_assignment\namount: 0"]
        TCC["TaskCommissionCalculated\n(event)"] --> CR2["Commission record created\ntype: task_completion\namount: commission + qualityBonus"]
        CR2 --> PS2["PayoutScheduled"]
    end

    subgraph SellerKYCFlow["Seller KYC Flow"]
        SKD["SellerKYCDocumentsSubmitted"] --> SKV["SellerKYCValidationInitiated"]
        SKV --> SKR["SellerKYCReviewCompleted"]
        SKR --> SKU["SellerKYCStatusUpdated"]
        SKU --> SKN["SellerKYCNotificationSent"]
    end

    style PS1 fill:#4CAF50,color:#fff
    style PS2 fill:#4CAF50,color:#fff
    style CR2 fill:#2196F3,color:#fff
```

---

## 7. Revenue Flow (Actual Event Catalog — events/CATALOG.md)

```mermaid
flowchart LR
    ORDER_COMPLETE["order.completed.v1\n(order-service publishes)"] --> COMMISSION_SVC["commission-service\n(subscribes)"]
    ORDER_COMPLETE --> ANALYTICS["analytics-service\n(subscribes)"]

    COMMISSION_SVC --> CALC["commission.calculated.v1\n{ recipientId, recipientType,\namount, currency, rate }"]
    CALC --> PAID["commission.paid.v1\n{ commissionId, recipientId,\namount, paidAt, paymentMethod }"]

    subgraph Recipients["Commission Recipients (events/types.ts)"]
        SELLER_R["seller"]
        ENABLER_R["enabler"]
        COURIER_R["courier"]
    end

    CALC --> Recipients

    style ORDER_COMPLETE fill:#2196F3,color:#fff
    style CALC fill:#FF9800,color:#fff
    style PAID fill:#4CAF50,color:#fff
```
