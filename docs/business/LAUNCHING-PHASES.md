# Maysar Express — Platform Launching Phases

> **Purpose**: This document defines the five launch phases for Maysar Express, from initial go-live through full platform maturity. Phase 1 covers everything that is currently built and working. Phases 2–5 define the roadmap for features that are designed, in-progress, or planned.

---

## Phase Overview

| Phase | Name | Focus | Status |
|-------|------|--------|--------|
| [Phase 1](#phase-1-foundation-launch) | Foundation Launch | Core marketplace — buy, sell, pay, deliver | **Ready to Launch** |
| [Phase 2](#phase-2-trust--intelligence-layer) | Trust & Intelligence Layer | COD trust scoring, buy-box ranking, phone OTP | **Ready to Launch** |
| [Phase 3](#phase-3-commerce-communication) | Commerce Communication | Chat system, product reviews, negotiation | **Designed** |
| [Phase 4](#phase-4-ecosystem-expansion) | Ecosystem Expansion | Enabler network, supplier B2B, production pipeline | **Planned** |
| [Phase 5](#phase-5-platform-maturity) | Platform Maturity | Analytics premium, compliance, community, ML scoring | **Planned** |

---

## Phase 1 — Foundation Launch

> **Milestone**: First real order placed, paid, and delivered on the platform.

This phase covers all systems that are currently implemented and working. The platform can onboard sellers, list products, accept buyer orders, process payments (wallet, COD, card), manage inventory, coordinate delivery, and handle post-order operations.

### What's Live

#### Authentication & User Management
- User registration and login (email + password)
- JWT session management with refresh tokens
- Password reset via email token
- Two-factor authentication (TOTP)
- Role-based access control (buyer, seller, courier, supplier, enabler, admin)
- User profile sync between auth-service and user-service
- Audit logging for all auth events

#### Product Catalog
- Multi-category product hierarchy with SEO metadata
- Product variants (SKU, price, weight, dimensions, attributes)
- Product status management (draft → active → archived)
- Media references (images with display ordering)
- Product fingerprinting for duplicate detection
- Seller-scoped product management
- Product search and discovery
- Category attributes and structured product data

#### Inventory Management
- Warehouse and stock item management
- Stock reservations (hold on order placement, release on cancellation)
- Inventory movements and audit trail
- Low-stock and out-of-stock status tracking
- Inventory counts and reconciliation

#### Checkout & Cart
- Persistent shopping cart (7-day expiry)
- Cart item management (add, update, remove)
- Checkout session creation
- Applied discounts and pricing rules
- Inventory reservation at checkout

#### Order Management
- Full order lifecycle (pending → confirmed → dispatched → delivered → completed)
- Order items with variant-level detail
- Saga-based orchestration (stock reservation → payment → delivery assignment)
- Saga compensation (rollback on failure at any step)
- COD dispute management
- Order outbox for reliable event publishing

#### Payments
- Wallet payment (debit from buyer wallet balance)
- Cash on Delivery (COD) with commitment fee logic
- Card / mobile payment via PaymentGateway integration
- Payment fraud assessment
- Webhook event handling for payment gateway callbacks
- Refund processing

#### Wallet Service
- Buyer and seller wallet accounts
- Debit and credit transactions with idempotency
- Wallet holds (escrow for COD commitment fees)
- Full transaction audit log
- Outbox-based reliable event publishing

#### Logistics & Delivery
- Courier profile management
- Delivery assignment and tracking
- Location history for couriers
- Courier earnings calculation
- Delivery status updates (assigned → picked up → in transit → delivered)

#### Notifications
- Push notification delivery
- Email notification fallback
- SMS notification fallback (Africa's Talking)
- Notification templates
- Device token management
- Delivery logs and retry tracking
- Per-user notification preferences

#### Business Registry
- Business registration and verification
- Business address management
- Document upload and verification workflow
- Compliance records (KYC, AML, internal compliance records)
- Outbox-based event publishing

#### Commission Service
- Commission calculation per order
- Commission payout scheduling
- Referral tracking and rewards
- Commission event store

#### Payout Service
- Seller and courier payout processing
- Payout outbox for reliable processing

#### Analytics (Seller Dashboard)
- Seller metrics (today's sales, monthly revenue, growth)
- Daily sales history
- Product performance tracking
- Inventory health monitoring
- Action items and alerts
- Supplier and courier analytics

#### Admin Operations
- User management and role assignment
- Business verification workflows
- System health and readiness endpoints
- Audit log access

### Phase 1 Milestone Criteria

- [ ] A buyer can register, browse products, add to cart, and place an order
- [ ] A seller can list a product with variants and manage inventory
- [ ] A COD order can be placed, dispatched, and delivered end-to-end
- [ ] A wallet payment order can be placed and the balance correctly debited
- [ ] A courier can be assigned, update delivery status, and receive earnings
- [ ] Notifications are delivered on order events (placed, dispatched, delivered)
- [ ] Admin can verify a business and manage users

---

## Phase 2 — Trust & Intelligence Layer

> **Milestone**: COD conversion rate improves by 20% through dynamic trust scoring. Buy-box competition drives seller quality up.

This phase activates the intelligence systems that are now implemented, audited, and ready to launch. These systems make the marketplace smarter — rewarding good sellers, protecting against fraud, and reducing COD risk.

### What's Being Activated

#### Progressive COD Trust System
- Dynamic COD Eligibility Score (0–100) per buyer replacing the fixed "3 orders" gate
- Three trust tiers: New Buyer (0–20), Trusted Beginner (21–40), Trusted Buyer (41–100)
- Tier-based COD limits: TZS 30K / TZS 150K / unlimited
- Trust signal ingestion: successful delivery, phone verification, post-dispatch cancellation, delivery refusal, dispute outcomes, account age milestones, high-value completions
- Temporary COD restrictions for suspicious behaviour
- Score event sourcing — full audit trail of every score change
- `CODScoreUpdated` domain events for downstream consumers
- Interface-compatible drop-in replacement for the existing `CODEligibilityEngine`

#### Buy-Box Ranking System
- Multi-signal composite scoring replacing the naive price-weighted model
- Signals: price competitiveness, seller trust, fulfillment reliability, delivery speed, stock reliability, dispute rate, cancellation rate, return rate, customer retention
- Category-level weight strategies (Groceries, Electronics, Fashion, Medicines, Furniture)
- Recency-weighted 90-day rolling averages with exponential decay
- Fraud and manipulation detection with anomaly flagging
- Controlled seller rotation (10% exploration budget) to prevent monopolisation
- Geographic optimisation for Tanzania delivery zones
- COD failure risk signal integration
- Platform margin contribution scoring
- Score snapshots for full audit and replay
- Operator overrides and configuration interface
- Scheduled recomputation every 6 hours

#### Firebase Phone OTP Verification
- Backend verification of Firebase ID tokens from the frontend OTP flow
- Phone number registration and re-verification
- `isPhoneVerified` flag enforcement for COD orders
- `requirePhoneVerified` middleware for downstream route protection
- Rate limiting on OTP endpoints
- Audit logging for all verification events

#### Bug Fixes Shipping with Phase 2
- Auth-user sync on registration (user-service now creates profile on `UserRegistered.v1` event)
- Out-of-stock status bug (inventory status correctly reflects actual stock levels)
- Wallet payment silent failure (WALLET payment method correctly debits balance)
- Seeded product data fix (currency shows TZS, product images load correctly)

### Phase 2 Milestone Criteria

- [ ] New buyers can place COD orders up to TZS 30,000 immediately on registration
- [ ] Buyers accumulate trust score through successful deliveries and phone verification
- [ ] Buy-box winner changes when a seller's performance improves or degrades
- [ ] Phone OTP verification is required before a buyer's first COD order
- [ ] Fraud anomaly flags are applied and logged when manipulation patterns are detected
- [ ] All Phase 1 bug fixes are verified in production

---

## Phase 3 — Commerce Communication

> **Milestone**: 30% of orders originate from or are influenced by in-platform chat. Review system drives product discovery.

This phase adds the communication and social proof layers that keep buyers and sellers on the platform and reduce off-platform leakage.

### What's Being Built

#### Maysar Chat System
- Four conversation types: Buyer↔Seller, Seller↔Supplier, Buyer↔Courier, Seller Team
- Real-time message delivery via WebSocket + Redis Pub/Sub (< 500ms)
- Message types: text, images, voice notes (critical for East African commerce), product cards, order references, location pins, quick-action buttons
- Product-linked conversation initiation from product pages
- Order-linked conversation context for post-purchase support
- Buyer↔Courier conversations scoped to a single order, auto-archived on delivery
- Read receipts and online presence indicators
- Conversation list with full-text search via Meilisearch
- Voice note recording and playback (OGG/OPUS, M4A, up to 300s)
- Product card snapshots (price, stock, add-to-cart link captured at send time)
- Order reference messages with live tracking links
- Location pin sharing for delivery coordination
- Quick-action buttons (confirm availability, request quote, track order, accept/decline offer)
- Negotiation mode with single-use checkout URLs
- Quote bundles (multi-product cart links inside chat)
- Phone number masking (raw numbers never exposed in chat)
- Spam scoring and automated message blocking
- Rate limiting (20 conversations/hour, 200 messages/hour per user)
- User blocking and muting
- Moderation tools for admins
- Push/email/SMS notifications for new messages
- Message retention (365 days minimum, dispute evidence preserved)
- Marketplace intelligence signals (demand signals, supplier risk signals)

#### Product Review & Rating System
- Purchase-verified reviews (only buyers with `DELIVERED` orders can review)
- One review per buyer per product (database-enforced uniqueness)
- Seller self-review prevention
- Star ratings (1–5) with optional comments (up to 2000 characters)
- Aggregate `averageRating` and `reviewCount` on all product responses
- Rating distribution breakdown (1★ through 5★ counts)
- Paginated public review listing with sort by date or rating
- Admin moderation (visible / flagged / hidden) with audit log
- Reviewer display name (first + last name, or masked email prefix)
- Moderation status changes take effect immediately on aggregate calculations

### Phase 3 Milestone Criteria

- [ ] A buyer can open a chat from a product page and receive a reply from the seller
- [ ] Voice notes can be recorded, sent, and played back in a conversation
- [ ] A Buyer↔Courier conversation is automatically created on delivery assignment
- [ ] A buyer who received a delivered order can submit a star rating and comment
- [ ] Product listings show average rating and review count
- [ ] Admin can hide a review and the aggregate updates immediately
- [ ] Spam scoring blocks messages with score ≥ 90 before delivery

---

## Phase 4 — Ecosystem Expansion

> **Milestone**: Enabler network drives 25% of new seller onboarding. Supplier B2B pipeline processes first bulk order.

This phase expands the platform beyond direct buyer-seller commerce into the full ecosystem: field agents (enablers), supplier procurement, and production capacity planning.

### What's Being Built

#### Enabler Network (Full Activation)
- Enabler profile management and certification tracking
- Seller onboarding assistance with attribution tracking
- Enabler-assisted sale commission flow (15–20% of assisted sale value)
- Training module completion and badge system
- Leaderboard and performance scoring
- Enabler analytics dashboard (trainings scheduled, certificates issued, sellers onboarded, earnings)
- Enabler task management
- Policy management for commission rules

#### Seller↔Supplier B2B Pipeline
- Supplier discovery and industry browsing
- Seller↔Supplier chat (Phase 3 prerequisite)
- Bulk order request and quoting workflow
- Production capacity snapshots
- Supplier performance analytics
- Supplier contract and restocking coordination

#### Production Service
- Bulk order request management
- Production capacity planning and snapshots
- Bulk order quoting with lead times

#### KYC Service (Full Flow)
- Identity document verification
- KYC status integration with COD trust scoring
- AML screening
- Internal compliance records
- Compliance audit log

#### Maps & Geolocation
- Route optimisation for courier dispatch
- Geographic zone management for buy-box and COD constraints
- Delivery area coverage mapping

### Phase 4 Milestone Criteria

- [ ] An enabler can onboard a new seller and receive commission attribution
- [ ] A seller can initiate a restocking request to a supplier via chat
- [ ] A bulk order quote can be created and accepted
- [ ] KYC verification unlocks higher COD limits for verified buyers
- [ ] Geographic zone data feeds into buy-box geographic optimisation

---

## Phase 5 — Platform Maturity

> **Milestone**: Platform reaches 10,000 orders/month. Analytics premium tier launched. Community drives organic growth.

This phase completes the platform with advanced analytics, community features, compliance infrastructure, and the transition toward ML-based scoring.

### What's Being Built

#### Analytics Premium (Seller Intelligence)
- Advanced seller dashboard with cohort analysis
- Demand forecasting from chat signals and search trends
- Competitor pricing intelligence
- Inventory optimisation recommendations
- Customer lifetime value and retention analytics
- Profitability scoring per product and category

#### Community Service
- Seller and buyer community posts and discussions
- Product-linked community threads
- Knowledge base articles
- Business challenges and solutions
- Peer endorsements
- Hashtag-based discovery
- Community moderation tools
- Engagement quotas and contribution history

#### Support Service (Full Activation)
- Structured support ticket system
- Ticket routing to support agents
- Ticket message threads with attachments
- Status history and SLA tracking
- Support agent management

#### Compliance & Regulatory
- Full KYC/AML pipeline with automated screening
- Internal compliance reporting
- Internal compliance monitoring
- Subject rights requests (GDPR-equivalent)
- Data retention policies and automated deletion
- Data processing records and privacy impact assessments
- Compliance audit log

#### ML-Based Buy-Box Scoring (Evolution)
- Transition from rule-based weights to ML-derived signal weights
- Contextual scoring based on buyer segment and session signals
- A/B testing framework for weight strategies
- Automated anomaly detection replacing rule-based fraud flags

#### Campaign & Pricing Engine (Full Activation)
- Campaign management with start/end scheduling
- Pricing rules (percentage discount, fixed discount, BOGO)
- Category and product-level campaign targeting
- Campaign performance metrics
- Automated campaign expiry

#### Training Service (Full Activation)
- Training module library for sellers, couriers, and enablers
- Certification requirements and badge issuance
- Leaderboard and gamification
- Training record tracking

### Phase 5 Milestone Criteria

- [ ] 10,000 orders/month processed without infrastructure scaling issues
- [ ] Analytics premium tier has at least 50 paying seller subscribers
- [ ] Community has 1,000 active monthly contributors
- [ ] Full compliance audit passes for internal compliance requirements
- [ ] ML buy-box scoring is live in shadow mode alongside rule-based scoring
- [ ] Support ticket SLA (< 24h first response) is met for 95% of tickets

---

## Infrastructure Scaling by Phase

| Phase | Orders/Month | Infrastructure Cost | Key Scaling Actions |
|-------|-------------|--------------------|--------------------|
| Phase 1 | 0 – 500 | ~$500/month | Single-node PostgreSQL, Redis, monolith |
| Phase 2 | 500 – 2,000 | ~$700/month | Read replicas, Redis cluster, job workers |
| Phase 3 | 2,000 – 5,000 | ~$900/month | CDN for media (chat images/voice), Meilisearch |
| Phase 4 | 5,000 – 10,000 | ~$1,200/month | Horizontal scaling, separate job queues |
| Phase 5 | 10,000+ | ~$2,000+/month | Service extraction candidates, ML infra |

---

## Revenue Milestones by Phase

| Phase | GMV Target | Primary Revenue Driver |
|-------|-----------|----------------------|
| Phase 1 | TZS 5M/month | Seller commission (8% GMV) |
| Phase 2 | TZS 20M/month | COD conversion improvement + buy-box quality |
| Phase 3 | TZS 60M/month | Chat-driven orders + review-driven discovery |
| Phase 4 | TZS 150M/month | Enabler-assisted sales + B2B supplier pipeline |
| Phase 5 | TZS 400M/month | Analytics premium + community-driven organic growth |

---

## Dependency Map

```
Phase 1 (Foundation)
    └── Phase 2 (Trust & Intelligence)
            ├── COD Trust Score → required for Phase 3 chat COD enforcement
            ├── Phone OTP → required for Phase 3 chat identity
            └── Buy-Box → required for Phase 5 ML evolution
    └── Phase 3 (Commerce Communication)
            ├── Chat → required for Phase 4 Seller↔Supplier B2B
            └── Reviews → required for Phase 5 community
    └── Phase 4 (Ecosystem Expansion)
            ├── Enabler Network → required for Phase 5 training
            ├── KYC → required for Phase 5 compliance
            └── Supplier Pipeline → required for Phase 5 analytics
    └── Phase 5 (Platform Maturity)
            └── All prior phases complete
```

---

*Last updated: May 2026*
