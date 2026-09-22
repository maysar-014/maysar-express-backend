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
| ENA-05 | Capability activation (terms + training gate) | The approved enabler accepts the mandated terms version, the training domain certifies the mandatory modules, and activation unlocks ACTIVE capabilities. | Terms not accepted or version mismatch, or training incomplete/expired, blocks activation with 409; the training gate fails closed on training-domain errors. |
| ENA-06 | Admin capability enforcement | Admin restricts, suspends, reactivates or deactivates an enabler capability; every action lands in the enforcement audit trail and emits a lifecycle event. | Invalid transition (e.g. reactivate a PENDING enabler) is refused with 409 even for admins; enforcement never touches the underlying user, wallet, orders or seller/courier duties. |

## Flow Notes

- Training completion is a business gate, not a nice-to-have.
- Activation is a separate, server-enforced gate after approval: accepted terms version + completed training are mandatory before ACTIVE.
- Capability is contextual, never role-based: the lifecycle status decides what the enabler may do, and a status change takes effect on the very next request.
- Enforcement touches capability state only — the underlying Maysar user remains intact.
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

## Sequence Diagram: Capability Activation And Enforcement

```mermaid
sequenceDiagram
    actor Enabler
    actor Admin
    participant UI as Enabler Console
    participant EnablerSvc as Enabler Service
    participant Training as Training Service
    participant Bus as EventBus

    Enabler->>UI: Review terms
    UI->>EnablerSvc: POST /enablers/:id/terms {termsVersion}
    EnablerSvc-->>UI: 200 accepted (idempotent)

    Enabler->>Training: Complete mandatory modules
    Training-->>UI: Certification recorded

    UI->>EnablerSvc: POST /enablers/:id/activation (empty body)
    EnablerSvc->>Training: Evaluate training gate (server-side, fails closed)
    alt Terms accepted AND training completed
        EnablerSvc->>Bus: Publish EnablerActivated
        EnablerSvc-->>UI: 200 ACTIVE — full capabilities
    else Requirements unmet
        EnablerSvc-->>UI: 409 which gate failed
    end

    Admin->>UI: Restrict/suspend enabler
    UI->>EnablerSvc: POST /enablers/:id/enforcement {action, reason}
    EnablerSvc->>Bus: Publish EnablerRestricted/Suspended/Deactivated/Reactivated
    EnablerSvc-->>UI: 200 {previousStatus, status}
    Note over EnablerSvc: Action recorded in immutable<br/>enforcement audit trail

    Admin->>UI: Reactivate
    UI->>EnablerSvc: POST /enablers/:id/enforcement {action: REACTIVATE}
    EnablerSvc-->>UI: 200 ACTIVE
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
- Activation is impossible without accepted terms + completed training, and the enabler's dashboard explains exactly which gate is missing.
- An enabler whose capability was restricted or suspended can still see why — but loses commercial capabilities on the very next request.
- Every admin enforcement action is auditable and emits a lifecycle event, without ever touching the underlying Maysar user.
