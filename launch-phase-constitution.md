# Maysar Express — Launch Phase Constitution

> **Purpose**: This document is the binding law governing how Maysar Express advances from one launch phase to the next. No phase may begin until the previous phase has passed every gate defined here. This constitution protects users, sellers, couriers, and the platform from the consequences of launching on a broken foundation.
>
> **Authority**: This constitution supersedes any schedule pressure, feature urgency, or business deadline. A phase that has not passed its gates is not ready. Shipping a broken phase is worse than shipping late.

---

## 1. The Core Principle

> **A new phase must never inherit unresolved problems from the previous phase.**

Every gate in this constitution exists to enforce that principle. The platform grows by building on solid ground — not by piling new features on top of known failures.

---

## 2. The Phase Advancement Model

Phase advancement follows a strict sequential model. Phases cannot be skipped. Partial advancement is not permitted — a phase is either complete or it is not.

```
Phase N: COMPLETE
    ↓  (all gates passed)
Phase N+1: ACTIVE
    ↓  (all gates passed)
Phase N+2: ACTIVE
```

**Forbidden patterns:**
- Running Phase 3 features while Phase 2 gates are open
- Declaring a phase "complete" with known P1 or P2 bugs deferred to the next phase
- Bypassing a gate because a feature is "low risk"
- Treating infrastructure gates as optional

---

## 3. Gate Categories

Every phase has gates in five categories. All five must pass before advancement.

| Category | What It Protects |
|----------|-----------------|
| **Functional Gates** | Core user journeys work end-to-end |
| **Data Integrity Gates** | No silent data corruption or loss |
| **Financial Gates** | Money moves correctly — no phantom debits, no missing credits |
| **Operational Gates** | The team can observe, diagnose, and recover from failures |
| **Regression Gates** | Nothing that worked before has been broken |

---

## 4. Severity Classification

Issues discovered during gate evaluation are classified as follows:

| Severity | Definition | Effect on Advancement |
|----------|-----------|----------------------|
| **P0 — Blocker** | Data loss, money movement error, security breach, complete feature failure | Phase is locked. No advancement until resolved and re-verified. |
| **P1 — Critical** | Core user journey broken for a subset of users, incorrect business logic | Phase is locked. Must be resolved before advancement. |
| **P2 — Major** | Degraded experience, missing non-critical feature, performance below threshold | Must have a documented resolution plan with a date. Advancement allowed only with explicit sign-off. |
| **P3 — Minor** | UI inconsistency, non-critical edge case, cosmetic issue | Logged. Does not block advancement. |

**Rule**: No P0 or P1 issue may exist in a phase at the time of advancement. P2 issues require documented resolution plans. P3 issues are tracked but do not block.

---

## 5. Phase 1 → Phase 2 Advancement Gates

> Phase 2 introduces trust scoring and buy-box intelligence. These systems depend on Phase 1 data being correct. If Phase 1 data is wrong, Phase 2 scores will be wrong.

### 5.1 Functional Gates

| Gate | Verification Method | Pass Condition |
|------|--------------------|----|
| **F1.1 — Registration Flow** | End-to-end test: register → verify email → login | User record exists in both `auth_users` and `users` tables with matching `id`, `email`, `publicCode` |
| **F1.2 — Product Listing** | Create product with variants → search → fetch by ID | Product appears in search with correct currency (TZS), correct images, correct stock status |
| **F1.3 — COD Order Lifecycle** | Place COD order → dispatch → deliver → confirm | Order status transitions correctly; COD commitment fee held and released; courier earnings recorded |
| **F1.4 — Wallet Payment** | Top up wallet → place WALLET order → verify balance | Wallet balance debited by exact order amount; transaction record exists; no phantom success |
| **F1.5 — Card Payment** | Place CARD order via PaymentGateway → receive webhook → verify | Order marked paid only after webhook confirmation; no pre-emptive success |
| **F1.6 — Inventory Accuracy** | Create stock → place order → verify reservation → cancel → verify release | Stock quantities match expected values at every step |
| **F1.7 — Notification Delivery** | Trigger order events → verify notification receipt | Push/email/SMS delivered within 30 seconds for order placed, dispatched, delivered |
| **F1.8 — Saga Compensation** | Simulate payment failure after stock reservation | Stock reservation released; order not persisted as paid; buyer not charged |

### 5.2 Data Integrity Gates

| Gate | Verification Method | Pass Condition |
|------|--------------------|----|
| **D1.1 — User Sync Integrity** | Register 10 users via API → query both tables | Every `auth_users` record has a corresponding `users` record with identical `id` and `email` |
| **D1.2 — Currency Correctness** | Fetch all seeded products via search API | Zero products return `"currency": "USD"`; all return `"currency": "TZS"` |
| **D1.3 — Image Availability** | Fetch products with known MediaRef rows | `thumbnailUrl` is populated; `mediaUrls` is non-empty for all products with MediaRef records |
| **D1.4 — Outbox Reliability** | Simulate DB write + outbox publish → kill process → restart | Outbox events are replayed; no duplicate events; no lost events |

### 5.3 Financial Gates

| Gate | Verification Method | Pass Condition |
|------|--------------------|----|
| **FIN1.1 — Wallet Debit Accuracy** | Place 5 WALLET orders of varying amounts | Sum of debits equals sum of order totals; no order succeeds without a corresponding debit transaction |
| **FIN1.2 — COD Commitment Fee** | Place COD order → verify hold → deliver → verify release | Hold amount matches commitment fee; released on delivery; not double-charged |
| **FIN1.3 — Commission Calculation** | Complete 3 orders → verify commission records | Commission amount = order total × seller commission rate; no missing commission records |
| **FIN1.4 — Refund Integrity** | Cancel paid order → verify refund | Refund amount equals original charge; wallet balance restored; refund record exists |

### 5.4 Operational Gates

| Gate | Verification Method | Pass Condition |
|------|--------------------|----|
| **OPS1.1 — Health Endpoints** | Call `/health` and `/ready` | Both return 200 with correct dependency status |
| **OPS1.2 — Error Observability** | Trigger known error conditions | Errors are logged with `userId`, `action`, `timestamp`, and structured context; no raw stack traces in HTTP responses |
| **OPS1.3 — Audit Log Coverage** | Perform auth actions (login, logout, password reset) | Every action has a corresponding `auth_audit_logs` record |
| **OPS1.4 — Database Backup** | Verify backup configuration | Automated daily backup is configured and last backup is < 24 hours old |

### 5.5 Regression Gates

| Gate | Pass Condition |
|------|---------------|
| **R1.1 — Contract Tests** | All Dredd contract tests pass against the running API |
| **R1.2 — Domain Unit Tests** | All domain-layer unit tests pass with zero failures |
| **R1.3 — Saga Tests** | All saga orchestration and compensation tests pass |
| **R1.4 — No Open P0/P1 Bugs** | Zero open P0 or P1 issues in the bug tracker for Phase 1 scope |

---

## 6. Phase 2 → Phase 3 Advancement Gates

> Phase 3 introduces chat and reviews. Chat depends on user identity being stable. Reviews depend on order data being trustworthy. Both depend on Phase 2 trust scores being accurate.

### 6.1 Functional Gates

| Gate | Verification Method | Pass Condition |
|------|--------------------|----|
| **F2.1 — COD Trust Score Initialisation** | Register new buyer → check COD eligibility | Score initialised to 0; buyer classified as New_Buyer; COD allowed up to TZS 30,000 |
| **F2.2 — Trust Signal Ingestion** | Complete a COD delivery → check score | Score increases by `SUCCESSFUL_DELIVERY` delta; Score_Event record persisted |
| **F2.3 — Phone OTP Enforcement** | Attempt COD order without phone verification | Request rejected with HTTP 403 and `PHONE_VERIFICATION_REQUIRED` |
| **F2.4 — Phone OTP Verification** | Complete Firebase OTP flow → verify flag | `isPhoneVerified` set to `true`; COD order now allowed; trust score updated |
| **F2.5 — Buy-Box Assignment** | Create product with 2 sellers → trigger recomputation | Buy-box assigned to seller with higher composite score; Score_Snapshot persisted |
| **F2.6 — Buy-Box Fraud Detection** | Simulate abnormal stock spike | Anomaly flag created; flagged signal substituted with rolling average in next computation |
| **F2.7 — COD Tier Limits** | Place COD order exceeding New_Buyer limit (> TZS 30,000) | Request rejected with correct tier limit reason |
| **F2.8 — Temporary Restriction** | Apply temporary restriction to buyer → attempt COD | COD rejected regardless of score; restriction lifted automatically after end time |

### 6.2 Data Integrity Gates

| Gate | Verification Method | Pass Condition |
|------|--------------------|----|
| **D2.1 — Score Event Sourcing** | Replay Score_Event log for 5 buyers | Replayed score matches current persisted score for every buyer |
| **D2.2 — Buy-Box Snapshot Integrity** | Recompute score from stored snapshot | Recomputed composite score matches stored score within ±0.01 |
| **D2.3 — Rolling Average Accuracy** | Verify rolling average computation for seller with 30 days of data | Computed average matches manual calculation with exponential decay applied |
| **D2.4 — Phase 1 Data Integrity Maintained** | Re-run all Phase 1 data integrity gates | All Phase 1 gates still pass after Phase 2 changes |

### 6.3 Financial Gates

| Gate | Verification Method | Pass Condition |
|------|--------------------|----|
| **FIN2.1 — COD Commitment Fee Unchanged** | Place COD orders at all trust tiers | Commitment fee logic unchanged from Phase 1; no regression |
| **FIN2.2 — Phase 1 Financial Gates Maintained** | Re-run all Phase 1 financial gates | All Phase 1 financial gates still pass |

### 6.4 Operational Gates

| Gate | Verification Method | Pass Condition |
|------|--------------------|----|
| **OPS2.1 — Buy-Box Job Monitoring** | Verify scheduled recomputation job | Job runs every 6 hours; failures are logged and alerted; last successful run < 7 hours ago |
| **OPS2.2 — Rolling Average Job Monitoring** | Verify rolling average job | Job runs every 24 hours; failures are logged and alerted |
| **OPS2.3 — Score Update Latency** | Trigger trust signal → measure score update time | Score updated within 5 seconds of event persistence |
| **OPS2.4 — Phase 1 Operational Gates Maintained** | Re-run all Phase 1 operational gates | All Phase 1 operational gates still pass |

### 6.5 Regression Gates

| Gate | Pass Condition |
|------|---------------|
| **R2.1 — Phase 1 Regression Gates** | All Phase 1 regression gates still pass |
| **R2.2 — COD Engine Interface Compatibility** | `PlaceOrderUseCase` functions correctly with new `CODEligibilityEngine` injected |
| **R2.3 — Buy-Box Property Tests** | All property-based tests pass: score bounds [0,100], weight sum invariant, monotonicity, rotation, idempotence |
| **R2.4 — COD Trust Property Tests** | All property-based tests pass: score clamping, tier classification coverage, round-trip event sourcing |
| **R2.5 — No Open P0/P1 Bugs** | Zero open P0 or P1 issues for Phase 2 scope |

---

## 7. Phase 3 → Phase 4 Advancement Gates

> Phase 4 introduces the Enabler network and Supplier B2B pipeline. These depend on chat being reliable (Seller↔Supplier conversations) and reviews being trustworthy (Enabler-assisted product quality signals).

### 7.1 Functional Gates

| Gate | Verification Method | Pass Condition |
|------|--------------------|----|
| **F3.1 — Buyer↔Seller Chat** | Buyer initiates chat from product page → seller replies | Conversation created; messages delivered in < 500ms; product card attached |
| **F3.2 — Voice Note Delivery** | Send voice note → recipient plays back | Audio stored in Media_Store; `mediaUrl` resolves; `durationSeconds` correct |
| **F3.3 — Buyer↔Courier Chat Lifecycle** | Assign courier → verify conversation created → deliver order → verify archived | Conversation auto-created on assignment; auto-archived on delivery; no new messages accepted after archive |
| **F3.4 — Spam Blocking** | Send message with spam score ≥ 90 | Message not delivered to recipient; sender notified of policy violation |
| **F3.5 — Rate Limiting** | Exceed 20 conversations/hour | 21st conversation rejected with HTTP 429 |
| **F3.6 — Phone Masking** | Fetch conversation participant details | Raw phone number never present in any chat API response |
| **F3.7 — Review Submission** | Buyer with DELIVERED order submits review | Review persisted with VISIBLE status; `averageRating` and `reviewCount` updated on product |
| **F3.8 — Review Purchase Verification** | Buyer without DELIVERED order attempts review | Request rejected with HTTP 403 and `REVIEW_PURCHASE_REQUIRED` |
| **F3.9 — Review Moderation** | Admin hides a review | Review excluded from public listing and aggregate calculations immediately |
| **F3.10 — Seller Self-Review Prevention** | Seller attempts to review own product | Request rejected with HTTP 403 and `REVIEW_SELLER_PROHIBITED` |

### 7.2 Data Integrity Gates

| Gate | Verification Method | Pass Condition |
|------|--------------------|----|
| **D3.1 — Message Ordering** | Send 20 messages in rapid succession → fetch history | Messages returned in `createdAt` ascending order with no gaps |
| **D3.2 — Product Card Snapshot Immutability** | Send product card → update product price → fetch message | Message still shows price at send time, not updated price |
| **D3.3 — Review Uniqueness** | Same buyer submits review for same product twice | Second submission rejected with HTTP 409; exactly one review record in database |
| **D3.4 — Rating Distribution Integrity** | Submit 10 reviews with known ratings → fetch product | `ratingDistribution` values sum to `reviewCount`; `averageRating` matches manual calculation |
| **D3.5 — Dispute Evidence Preservation** | Link conversation to active dispute → trigger retention job | Messages marked `DISPUTE_EVIDENCE`; not deleted by retention policy |
| **D3.6 — Phase 1 & 2 Data Integrity Maintained** | Re-run all prior data integrity gates | All prior gates still pass |

### 7.3 Financial Gates

| Gate | Verification Method | Pass Condition |
|------|--------------------|----|
| **FIN3.1 — Chat Checkout URL** | Generate checkout URL from chat → complete purchase | Order attributed to `conversationId`; checkout URL expires after 24 hours |
| **FIN3.2 — Prior Financial Gates Maintained** | Re-run all Phase 1 and Phase 2 financial gates | All prior financial gates still pass |

### 7.4 Operational Gates

| Gate | Verification Method | Pass Condition |
|------|--------------------|----|
| **OPS3.1 — WebSocket Stability** | Maintain 100 concurrent WebSocket connections for 10 minutes | No connection drops; message delivery rate ≥ 99% |
| **OPS3.2 — Media Store Availability** | Upload image and voice note → verify retrieval | Both files retrievable via returned URL; CDN serving correctly |
| **OPS3.3 — Meilisearch Sync** | Create conversation → search by participant name | Conversation appears in search results within 5 seconds |
| **OPS3.4 — Spam Score Audit Log** | Send 10 messages → verify spam log | Every message has a corresponding `Chat_SpamScoreLog` record |
| **OPS3.5 — Prior Operational Gates Maintained** | Re-run all Phase 1 and Phase 2 operational gates | All prior gates still pass |

### 7.5 Regression Gates

| Gate | Pass Condition |
|------|---------------|
| **R3.1 — Prior Regression Gates** | All Phase 1 and Phase 2 regression gates still pass |
| **R3.2 — Chat Property Tests** | All property-based tests pass: message ordering, read-receipt idempotence, access control, media round-trip, product card snapshot immutability, rate-limit atomicity |
| **R3.3 — Review Property Tests** | All property-based tests pass: average rating invariant, distribution sum invariant, pagination completeness, uniqueness idempotence, rating boundary invariant, empty state invariant |
| **R3.4 — No Open P0/P1 Bugs** | Zero open P0 or P1 issues for Phase 3 scope |

---

## 8. Phase 4 → Phase 5 Advancement Gates

> Phase 5 introduces ML scoring, compliance infrastructure, and community. These require Phase 4's KYC data, geographic data, and Enabler attribution to be accurate and complete.

### 8.1 Functional Gates

| Gate | Verification Method | Pass Condition |
|------|--------------------|----|
| **F4.1 — Enabler Attribution** | Enabler assists a sale → verify commission | Commission record created with correct `enablerId` and amount (15–20% of sale value) |
| **F4.2 — Enabler Onboarding Flow** | Enabler onboards a new seller | Seller account created with `enablerId` attribution; enabler analytics updated |
| **F4.3 — Seller↔Supplier Chat** | Seller initiates restocking chat with supplier | Conversation of type `SELLER_SUPPLIER` created; only SELLER can initiate; only SUPPLIER can receive |
| **F4.4 — Bulk Order Quoting** | Seller creates bulk order request → supplier responds with quote | Quote record persisted; seller can accept or decline |
| **F4.5 — KYC Verification Flow** | Submit KYC documents → admin verifies → check COD limit | KYC status updates; COD trust score receives KYC bonus signal |
| **F4.6 — Geographic Zone Assignment** | Assign delivery to zone → verify buy-box uses zone data | Buy-box computation uses zone-specific courier performance scores |

### 8.2 Data Integrity Gates

| Gate | Verification Method | Pass Condition |
|------|--------------------|----|
| **D4.1 — Enabler Commission Accuracy** | Complete 10 enabler-assisted orders | Sum of enabler commissions matches expected rate × order totals; no missing records |
| **D4.2 — KYC Data Integrity** | Submit KYC → verify → query compliance records | KYC record, AML record, and compliance audit log all consistent |
| **D4.3 — Geographic Zone Performance Data** | Record 5 deliveries per zone → query zone performance | Zone performance metrics match delivery outcomes |
| **D4.4 — Prior Data Integrity Gates Maintained** | Re-run all prior data integrity gates | All prior gates still pass |

### 8.3 Financial Gates

| Gate | Verification Method | Pass Condition |
|------|--------------------|----|
| **FIN4.1 — Enabler Commission Payout** | Schedule enabler payout → verify disbursement | Payout amount correct; payout record exists; enabler wallet credited |
| **FIN4.2 — Prior Financial Gates Maintained** | Re-run all prior financial gates | All prior financial gates still pass |

### 8.4 Operational Gates

| Gate | Verification Method | Pass Condition |
|------|--------------------|----|
| **OPS4.1 — KYC Document Storage** | Upload KYC document → verify secure storage | Document stored in secure bucket; not publicly accessible; URL requires auth |
| **OPS4.2 — Compliance Audit Log** | Perform KYC verification → query audit log | Every compliance action has a corresponding `Compliance_ComplianceAuditLog` record |
| **OPS4.3 — Prior Operational Gates Maintained** | Re-run all prior operational gates | All prior gates still pass |

### 8.5 Regression Gates

| Gate | Pass Condition |
|------|---------------|
| **R4.1 — Prior Regression Gates** | All Phase 1, 2, and 3 regression gates still pass |
| **R4.2 — Enabler Attribution Tests** | Commission attribution is correct for all order types (direct, enabler-assisted, referral) |
| **R4.3 — No Open P0/P1 Bugs** | Zero open P0 or P1 issues for Phase 4 scope |

---

## 9. Phase 5 Advancement Gates (Ongoing Operations)

> Phase 5 is the maturity phase. Advancement here means the platform is operating at scale. Gates are evaluated on a rolling 30-day basis.

### 9.1 Scale Gates

| Gate | Pass Condition |
|------|---------------|
| **S5.1 — Order Volume** | Platform processes ≥ 10,000 orders in a rolling 30-day window without P0 incidents |
| **S5.2 — API Latency** | p95 API response time < 500ms for all core endpoints (product search, order placement, payment) |
| **S5.3 — Uptime** | Platform uptime ≥ 99.5% over rolling 30 days |
| **S5.4 — Error Rate** | HTTP 5xx error rate < 0.5% of all requests over rolling 30 days |

### 9.2 Compliance Gates

| Gate | Pass Condition |
|------|---------------|
| **C5.1 — TRA Reporting** | Monthly TRA report generated and submitted on time |
| **C5.2 — Data Retention** | Automated retention policies running; no data retained beyond policy limits |
| **C5.3 — Subject Rights** | All subject rights requests resolved within 30 days |
| **C5.4 — Audit Trail Completeness** | Compliance audit log covers 100% of KYC, AML, and financial actions |

### 9.3 ML Scoring Gates (Before Full Activation)

| Gate | Pass Condition |
|------|---------------|
| **ML5.1 — Shadow Mode Validation** | ML buy-box scores run in shadow mode for ≥ 30 days; agreement rate with rule-based scores ≥ 85% |
| **ML5.2 — A/B Test Results** | A/B test shows ML scoring produces equal or better order completion rate vs rule-based |
| **ML5.3 — Rollback Capability** | ML scoring can be disabled and rule-based scoring restored within 5 minutes |

---

## 10. The Phase Advancement Checklist

Before any phase advancement is declared, the following checklist must be completed and signed off:

```
PHASE [N] → PHASE [N+1] ADVANCEMENT CHECKLIST

Date: _______________
Advancing from Phase: _______________
Advancing to Phase: _______________

GATE EVALUATION
[ ] All Functional Gates: PASS
[ ] All Data Integrity Gates: PASS
[ ] All Financial Gates: PASS
[ ] All Operational Gates: PASS
[ ] All Regression Gates: PASS

ISSUE REVIEW
[ ] Zero open P0 issues
[ ] Zero open P1 issues
[ ] All P2 issues have documented resolution plans with dates
[ ] P3 issues logged in tracker

SIGN-OFF
[ ] Engineering Lead sign-off
[ ] Product Lead sign-off
[ ] Operations Lead sign-off (for Phase 3+ advancements)

ROLLBACK PLAN
[ ] Rollback procedure documented for new phase features
[ ] Database migration rollback scripts tested
[ ] Feature flags configured for new phase features (where applicable)

MONITORING
[ ] Alerts configured for new phase services
[ ] Dashboards updated to include new phase metrics
[ ] On-call runbook updated

Advancement approved: YES / NO
Notes: _______________
```

---

## 11. Rollback Law

If a P0 or P1 issue is discovered after a phase has been declared active, the following law applies:

1. **Immediate triage** — the issue is classified within 1 hour of discovery.
2. **P0 issues** — the affected feature is disabled via feature flag or the phase is rolled back within 4 hours. No exceptions.
3. **P1 issues** — a fix is deployed within 24 hours, or the affected feature is disabled until fixed.
4. **No forward progress** — no new phase advancement may occur while a P0 or P1 issue from any prior phase is open.
5. **Post-mortem required** — every P0 issue requires a written post-mortem within 5 business days, including root cause, timeline, and prevention measures.

---

## 12. The Final Law

> **The platform's credibility is built one phase at a time. A phase that ships broken destroys more trust than a phase that ships late.**

This constitution is binding for all phase advancement decisions. No exception may be made without written documentation of the risk accepted and explicit sign-off from all three leads.

---

*Last updated: May 2026*
