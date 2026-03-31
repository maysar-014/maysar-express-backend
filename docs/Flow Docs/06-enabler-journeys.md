# Enabler Journeys

This doc covers the enabler lifecycle: onboarding, training, assisted sales, collaboration with sellers, and commission settlement.

## Concerned Actors

| Actor | Concern |
|------|---------|
| Enabler | Can I join the network, get trained, and earn commissions from assisted sales? |
| Seller | Can I collaborate with an enabler and track the assisted sale outcome? |
| `enabler-service` | Enabler profile, collaboration, listings, orders, and earnings |
| `training-service` | Onboarding training and certification |
| `commission-service` | Commission computation and settlement |
| `wallet-service` | Wallet credits for commission payouts |
| `catalog-service` | Listing and referral products |
| `order-service` | Order attribution and completion tracking |
| `support-service` | Enabler support tickets and escalations |
| `notification-service` | Onboarding, approval, commission, and support notifications |

## Use Case Matrix

| ID | Use case | Happy path | Unhappy path |
|----|----------|------------|--------------|
| ENA-01 | Register, approve, and profile | The enabler is registered, approved, and can maintain profile data and status. | Missing documents, failed approval, or inactive status keeps the enabler in review. |
| ENA-02 | Listing products and facilitating orders | The enabler receives shareable links, facilitates sales, and tracks order attribution. | Invalid eligibility, missing product listing, or attribution loss blocks commission credit. |
| ENA-03 | Training management progress | Training is assigned, progress is saved, completion is certified, and eligibility is unlocked. | Incomplete progress, expired certification, or failed assessment keeps the enabler unqualified. |
| ENA-04 | Support case handling | The enabler opens a ticket and receives structured resolution updates. | SLA breach or missing assignment escalates the case to a higher queue. |

## Flow Notes

- Training completion is a business gate, not a nice-to-have.
- Enabler commissions should only be paid when attribution and completion are both confirmed.
- Seller collaboration should expose who owns the lead, who owns the sale, and who gets paid.

## Sequence Diagram: Enabler Onboarding And Training

```mermaid
sequenceDiagram
    actor Enabler
    participant UI as Enabler Console
    participant EnablerSvc as Enabler Service
    participant Training as Training Service
    participant Users as User Service
    participant Notif as Notification Service
    participant Bus as EventBus

    Enabler->>UI: Register as an enabler
    UI->>EnablerSvc: POST /api/enablers
    EnablerSvc->>Users: Create or link user identity
    EnablerSvc->>Training: Enroll in onboarding modules
    alt Training eligible
        Training->>Bus: Publish TrainingStarted
        EnablerSvc->>Bus: Publish EnablerRegistered
        Notif->>Bus: Send welcome and next-step notice
        EnablerSvc-->>UI: 201 Registered
    else Not eligible
        EnablerSvc-->>UI: 422 Registration blocked
    end

    Enabler->>UI: Complete training
    UI->>Training: POST /api/training/complete/:id
    alt Assessment passed
        Training->>Bus: Publish CertificationAwarded
        EnablerSvc->>Bus: Publish EnablerApproved
        Training-->>UI: 200 Certified
    else Assessment failed
        Training->>Notif: Remind to retry
        Training-->>UI: 422 Training incomplete
    end
```

## Sequence Diagram: Assisted Sale And Commission Settlement

```mermaid
sequenceDiagram
    actor Enabler
    participant UI as Enabler Console
    participant Catalog as Catalog Service
    participant Order as Order Service
    participant Comm as Commission Service
    participant Wallet as Wallet Service
    participant Notif as Notification Service
    participant Analytics as Analytics Service
    participant Bus as EventBus

    Enabler->>UI: Share product link
    UI->>Catalog: Resolve product and referral code
    Catalog->>Bus: Publish ReferralTracked

    Note over Order,Comm: Order completes in the platform
    Order->>Bus: Publish OrderCompleted
    Comm->>Order: Read attribution details
    Comm->>Comm: Calculate commission
    alt Attribution valid
        Comm->>Wallet: Credit commission amount
        Comm->>Bus: Publish CommissionSettled
        Notif->>Bus: Notify enabler of payout
        Analytics->>Bus: Record enabler productivity
    else Attribution missing or invalid
        Comm->>Bus: Publish CommissionRejected
    end
```

## Sequence Diagram: Enabler Support Ticket

```mermaid
sequenceDiagram
    actor Enabler
    participant UI as Enabler Console
    participant Support as Support Service
    participant Notif as Notification Service
    participant Bus as EventBus

    Enabler->>UI: Open support ticket
    UI->>Support: POST /api/support/tickets
    Support->>Bus: Publish TicketCreated
    Support->>Notif: Send ticket acknowledgement

    alt Agent available
        Support->>Bus: Publish TicketAssigned
        Support->>Bus: Publish TicketResolved
    else SLA breach
        Support->>Bus: Publish TicketEscalated
    end
```

## What Good Looks Like

- The enabler can see exactly when they are eligible to earn.
- Assisted sales must preserve attribution through the full order lifecycle.
- Training and support are visible business gates, not background paperwork.
