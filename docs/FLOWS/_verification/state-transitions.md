# State Transitions Reference

> **Generated:** September 2026
> **Scope:** Core Domain State Machines across Maysar Monolith Services

This document consolidates and specifies all verified entity state machines across the Maysar backend monolith. Every status transition in user flows and frontend guides adheres to the rules defined below.

---

## 1. Authentication & User Account Lifecycle

**Owner:** `auth-service` / `user-service`

```mermaid
stateDiagram-v2
    [*] --> PENDING_VERIFICATION: Registration (OTP sent)
    PENDING_VERIFICATION --> ACTIVE: Phone OTP Verified
    ACTIVE --> LOCKED: 5 Consecutive Failed Logins
    LOCKED --> ACTIVE: 15-min Lockout Elapses / Admin Unlock
    ACTIVE --> SUSPENDED: Admin / Risk Enforcement
    SUSPENDED --> ACTIVE: Admin Reinstatement
    ACTIVE --> DEACTIVATED: User Account Closure
```

### Valid Transitions
| From Status | To Status | Trigger / Action | Authorization |
|---|---|---|---|
| `[*]` | `PENDING_VERIFICATION` | `POST /api/auth/register` | Public |
| `PENDING_VERIFICATION` | `ACTIVE` | `POST /api/auth/phone/verify-otp` or Admin Bypass | User / Admin |
| `ACTIVE` | `LOCKED` | 5 Failed Logins within lockout window | System |
| `LOCKED` | `ACTIVE` | Lockout timer expires (15m) or `PATCH /api/auth/admin/users/:id/unlock` | System / Admin |
| `ACTIVE` | `SUSPENDED` | `PATCH /api/auth/admin/users/:id/suspend` | Admin |
| `SUSPENDED` | `ACTIVE` | Admin reinstatement | Admin |
| `ACTIVE` | `DEACTIVATED` | User initiates account deletion | User / Admin |

---

## 2. Order Lifecycle & Fulfillment

**Owner:** `order-service` / `logistics-service`

```mermaid
stateDiagram-v2
    [*] --> PENDING_PAYMENT: Checkout Completed
    PENDING_PAYMENT --> PAYMENT_FAILED: Payment Processing Erred
    PAYMENT_FAILED --> CANCELLED: Auto-cancelled after timeout
    PENDING_PAYMENT --> PROCESSING: Payment Confirmed (Webhook / Mobile Money)
    PROCESSING --> SHIPPED: Courier Dispatched & Package Picked Up
    SHIPPED --> OUT_FOR_DELIVERY: Courier En Route to Buyer
    OUT_FOR_DELIVERY --> DELIVERED: Buyer Confirmation / OTP Validated
    DELIVERED --> COMPLETED: Escrow Settled / Return Window Closed
    PROCESSING --> CANCELLED: Buyer / Seller / Admin Cancel
    OUT_FOR_DELIVERY --> FAILED_DELIVERY: Recipient Unavailable
    FAILED_DELIVERY --> OUT_FOR_DELIVERY: Re-attempt Scheduled
    FAILED_DELIVERY --> RETURNED: Max Attempts Exceeded
```

### Valid Transitions
| From Status | To Status | Trigger / Action | Authorization |
|---|---|---|---|
| `PENDING_PAYMENT` | `PROCESSING` | `payment.completed` event / Payment Gateway Webhook | System / Webhook |
| `PENDING_PAYMENT` | `PAYMENT_FAILED` | Payment Gateway rejection | System |
| `PROCESSING` | `SHIPPED` | Seller marks packaged & courier accepts job | Seller / Courier |
| `SHIPPED` | `OUT_FOR_DELIVERY` | Courier starts final delivery leg | Courier |
| `OUT_FOR_DELIVERY` | `DELIVERED` | `POST /api/logistics/api/v1/cod/:id/verify` (OTP match) | Courier |
| `DELIVERED` | `COMPLETED` | Return window expiration or buyer acceptance | System |
| `OUT_FOR_DELIVERY` | `FAILED_DELIVERY` | Delivery attempt failed | Courier |
| `FAILED_DELIVERY` | `RETURNED` | Package returned to seller / hub | Courier / Logistics |

---

## 3. Cash on Delivery (COD) Delivery & Settlement

**Owner:** `logistics-service` / `wallet-service`

```mermaid
stateDiagram-v2
    [*] --> ASSIGNED: Delivery Job Created
    ASSIGNED --> ACCEPTED: Courier Accepts Delivery
    ACCEPTED --> PICKED_UP: Courier Collects Parcel from Seller
    PICKED_UP --> IN_TRANSIT: In Transit to Delivery Hub / Buyer
    IN_TRANSIT --> AT_BUYER: Arrived at Delivery Location
    AT_BUYER --> OTP_PENDING: Courier Requests Delivery OTP
    OTP_PENDING --> VERIFIED_COLLECTED: Buyer Provides OTP + Cash Collected
    VERIFIED_COLLECTED --> SETTLED: Courier Remits Cash to Platform Hub / Escrow
    AT_BUYER --> DISPUTED: Cash Mismatch / Damaged Item
    DISPUTED --> INVESTIGATING: Escalated to Support
```

---

## 4. Production Plan Lifecycle

**Owner:** `production-service`

```mermaid
stateDiagram-v2
    [*] --> DRAFT: Supplier Creates Plan
    DRAFT --> SCHEDULED: Dates & Capacity Allocated
    SCHEDULED --> IN_PRODUCTION: Production Commenced
    IN_PRODUCTION --> QUALITY_CHECK: Checkpoints Reached
    QUALITY_CHECK --> IN_PRODUCTION: Remediation Required
    QUALITY_CHECK --> READY: All Standards Passed
    QUALITY_CHECK --> REJECTED: Unrecoverable Defects
    READY --> [*]: Transferred to Inventory
```

### Valid Transitions
| From Status | To Status | Trigger / Action | Authorization |
|---|---|---|---|
| `DRAFT` | `SCHEDULED` | `PUT /api/production/plans/:id/status` (`status: SCHEDULED`) | Supplier |
| `SCHEDULED` | `IN_PRODUCTION` | `PUT /api/production/plans/:id/status` (`status: IN_PRODUCTION`) | Supplier |
| `IN_PRODUCTION` | `QUALITY_CHECK` | `POST /api/production/quality/checkpoints` | Supplier / Inspector |
| `QUALITY_CHECK` | `READY` | Final inspection approved | Quality Inspector |
| `QUALITY_CHECK` | `REJECTED` | Inspection failed standard thresholds | Quality Inspector |

---

## 5. Support Ticket & Dispute Resolution Lifecycle

**Owner:** `support-service`

```mermaid
stateDiagram-v2
    [*] --> OPEN: Buyer / Seller / Courier Submits Ticket
    OPEN --> ASSIGNED: Support Agent Assigned
    ASSIGNED --> IN_PROGRESS: Agent Working on Ticket
    IN_PROGRESS --> WAITING_FOR_USER: Agent Requested Customer Clarification
    WAITING_FOR_USER --> IN_PROGRESS: Customer Replied
    IN_PROGRESS --> RESOLVED: Resolution Provided to Customer
    RESOLVED --> CLOSED: Resolution Accepted / 7 Days Inactive
    IN_PROGRESS --> ESCALATED: Escalated to Compliance / Tier-2
    ESCALATED --> RESOLVED: Tier-2 Resolution Provided
```

### Valid Transitions
| From Status | To Status | Trigger / Action | Authorization |
|---|---|---|---|
| `OPEN` | `ASSIGNED` | `PATCH /api/support/tickets/:id/assign` | Admin / Agent |
| `ASSIGNED` | `IN_PROGRESS` | Agent sends response message | Support Agent |
| `IN_PROGRESS` | `WAITING_FOR_USER` | Agent requests info from user | Support Agent |
| `WAITING_FOR_USER` | `IN_PROGRESS` | User submits message | User |
| `IN_PROGRESS` | `RESOLVED` | `POST /api/support/tickets/:id/resolve` | Support Agent |
| `RESOLVED` | `CLOSED` | `POST /api/support/tickets/:id/close` | Support Agent / System |
| `IN_PROGRESS` | `ESCALATED` | `POST /api/support/tickets/:id/escalate` | Support Agent |

---

## 6. Payout Lifecycle

**Owner:** `payout-service`

```mermaid
stateDiagram-v2
    [*] --> REQUESTED: User Initiates Withdrawal
    REQUESTED --> PENDING_APPROVAL: Payout Threshold Check
    PENDING_APPROVAL --> APPROVED: Admin / System Approves
    PENDING_APPROVAL --> REJECTED: KYC / Policy Failure
    APPROVED --> PROCESSING: Gateway Transfer Dispatched
    PROCESSING --> COMPLETED: Mobile Money / Bank Transfer Confirmed
    PROCESSING --> FAILED: Destination Account Rejected
    FAILED --> REVERSED: Funds Returned to User Wallet
```
