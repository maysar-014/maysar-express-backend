# Maysar UI Full-Flow Coverage Blueprint (Cypress)

## 1. Purpose
This document is the single source of truth for end-to-end UI coverage across Maysar services/modules.

Use it to:
- design Cypress specs by user persona and journey,
- validate cross-service behavior (happy path, failure path, compensation path),
- confirm UI states, API calls, and side effects for full regression coverage.

## 2. Scope And Sources
This blueprint consolidates:
- UI saga diagrams in `docs/modeling/ui-sagas/*`,
- cross-service sagas in `docs/modeling/cross-service/*`,
- live route surfaces in service route files under `services/*/src/api/routes/*`,
- key integration behavior in payment/logistics/auth providers/controllers.

## 3. Environment Strategy (Critical)
Current codebase supports multiple runtime styles:
- Modular monolith mount pattern in root `src/app.ts`: `/api/{moduleNameWithoutService}`.
- Standalone service apps with their own prefixes (for example `/api/v1/auth`, `/api/payments`, `/api/v1`, `/api/checkout`).

For Cypress, define one environment profile and keep it fixed:
- `PROFILE=monolith`
- `PROFILE=standalone`

Required Cypress env keys:
- `APP_BASE_URL`
- `AUTH_API_BASE`
- `USER_API_BASE`
- `CATALOG_API_BASE`
- `ORDER_API_BASE`
- `CHECKOUT_API_BASE`
- `PAYMENT_API_BASE`
- `PAYOUT_API_BASE`
- `WALLET_API_BASE`
- `LOGISTICS_API_BASE`
- `SUPPORT_API_BASE`
- `ANALYTICS_API_BASE`
- `COMPLIANCE_API_BASE`
- `BUSINESS_REGISTRY_API_BASE`
- `TRAINING_API_BASE`
- `INVENTORY_API_BASE`
- `NOTIFICATION_API_BASE`

## 4. Mandatory UI Testability Requirements
Every tested screen/flow must expose stable selectors:
- root page: `data-cy="page-{name}"`
- primary CTA: `data-cy="cta-{intent}"`
- forms: `data-cy="form-{name}"`, fields `data-cy="input-{field}"`
- result state: `data-cy="state-success|state-error|state-empty|state-loading"`
- list rows: `data-cy="row-{entity}-{id}"`
- modals: `data-cy="modal-{name}"`
- toast/banner: `data-cy="toast-{level}"`

Also required:
- deterministic clock control for time-sensitive screens,
- API error rendering contract (field errors + global errors),
- loading and retry states for all async calls,
- role-aware navigation guards (unauthorized routes must redirect/block).

## 5. Global Coverage Rules
For each flow below, create at least:
- 1 happy-path case,
- 1 validation/business-rule failure case,
- 1 dependency failure case (5xx/timeout),
- 1 authorization case (wrong role/expired auth),
- 1 idempotency/retry case (double click, refresh, retry).

## 6. Persona Flow Matrix

| ID | Persona | Core Flow | Services/Modules |
|---|---|---|---|
| AUTH-01 | All | Login, token issue, session verify | auth, user |
| AUTH-02 | All | Logout, refresh token, session invalidation | auth, session |
| AUTH-03 | All | Forgot/reset password | auth, user, notification |
| AUTH-04 | All | 2FA setup/verify/backup/disable | auth 2fa, user |
| AUTH-05 | Admin | Admin user/session/security ops | auth admin, user |
| BUY-01 | Buyer | Product search/discovery | catalog search, catalog product |
| BUY-02 | Buyer | Checkout initiate/confirm | checkout, order, inventory |
| BUY-03 | Buyer | Payment (mobile/card/bank/wallet/COD) | payment, wallet, order |
| BUY-04 | Buyer | Order tracking and status updates | order, logistics, notification |
| BUY-05 | Buyer | Cancellation/refund | order, payment, inventory, notification |
| SEL-01 | Seller | Seller settings update | business/user profile, analytics eventing |
| SEL-02 | Seller | Seller KYC submit + status tracking | compliance, user |
| SEL-03 | Seller | Product CRUD + publish | catalog, inventory, analytics, notification |
| SEL-04 | Seller | Pricing and rules | catalog pricing |
| SEL-05 | Seller | Campaign lifecycle | catalog campaign, analytics |
| SEL-06 | Seller | Storefront + share URL | catalog storefront |
| SEL-07 | Seller | Order fulfillment and pickup request | order, logistics |
| SEL-08 | Seller | Payments list + payout request | payment, payout, wallet |
| SEL-09 | Seller | Sales dashboard/action center | analytics |
| SEL-10 | Seller | Community engagement | community, notification |
| SEL-11 | Seller | Support ticket lifecycle | support, notification |
| SEL-12 | Seller | Enabler collaboration request | enabler, training |
| SUP-01 | Supplier | Production planning/status/capacity | production, inventory |
| SUP-02 | Supplier | Supplier pricing + receivables | pricing, payment |
| SUP-03 | Supplier | Bulk fulfillment tracking | order, logistics |
| COU-01 | Courier | Availability and assignment acceptance | logistics courier |
| COU-02 | Courier | Delivery lifecycle updates | logistics delivery, tracking, notification |
| COU-03 | Courier | COD OTP collection/verification | logistics COD, payment |
| COU-04 | Courier | Route optimization and alternatives | logistics routes, maps |
| COU-05 | Courier | Earnings/performance dashboard | logistics earnings, analytics, payout |
| ENA-01 | Enabler | Register/approve/profile | enabler |
| ENA-02 | Enabler | Listing products and facilitating orders | enabler, catalog, inventory, order |
| ENA-03 | Enabler | Training management progress | training |
| ENA-04 | Enabler | Support case handling | support |
| ADM-01 | Admin | User management actions | auth admin, user |
| ADM-02 | Admin | KYC review and decision | compliance, user |
| ADM-03 | Admin | Dispute resolution | order, payment, wallet |
| ADM-04 | Admin | Transaction monitoring and block action | payment, wallet, analytics |
| ADM-05 | Admin | Dashboard management | analytics |
| ADM-06 | Admin | System configuration operations | config/system module, audit logs |
| ADM-07 | Admin | Compliance audit review/export | compliance, auth admin |
| BIZ-01 | Seller/Admin | Business registration onboarding saga | business-registry, user, compliance, notification, analytics |
| NOTIF-01 | All | Notification center + status updates | notification |
| NOTIF-02 | All | Preferences and opt-out | notification preferences |
| WAL-01 | Buyer/Seller/Enabler | Wallet balance/top-up/hold/release/capture/payout | wallet, payment, payout |

## 7. Detailed Flow Requirements

### AUTH-01 Login, Token, Session Verify
- UI pages: login form, post-login landing.
- API hooks:
  - `POST /api/v1/auth/login`
  - `GET /api/v1/auth/verify`
- Assertions:
  - token storage + role-based redirect,
  - invalid credentials error,
  - lockout/rate-limit message after repeated failures.

### AUTH-02 Logout/Refresh/Session Invalidation
- API hooks:
  - `POST /api/v1/auth/logout`
  - `POST /api/v1/auth/refresh`
  - `GET /api/v1/sessions`
  - `DELETE /api/v1/sessions/:sessionId`
- Assertions:
  - revoked session cannot call protected routes,
  - refresh rotates token and keeps UI session seamless.

### AUTH-03 Forgot/Reset Password
- API hooks:
  - `POST /api/v1/auth/forgot-password`
  - `POST /api/v1/auth/reset-password`
- Assertions:
  - success confirmation UX for request,
  - weak/invalid reset payload blocked in UI and API.

### AUTH-04 Two-Factor
- API hooks:
  - `POST /api/v1/auth/2fa/setup`
  - `POST /api/v1/auth/2fa/verify-setup`
  - `POST /api/v1/auth/2fa/verify`
  - `POST /api/v1/auth/2fa/backup`
  - `POST /api/v1/auth/2fa/disable`
  - `POST /api/v1/auth/2fa/backup-codes/regenerate`
  - `GET /api/v1/auth/2fa/status`
- Assertions:
  - setup QR render, status transitions, backup-code fallback.

### BUY-01 Discovery
- API hooks:
  - `GET /api/v1/products/search`
  - `GET /api/v1/search/suggestions`
  - `GET /api/v1/search/popular`
  - `GET /api/v1/products/:id`
- Assertions:
  - filters/sort/pagination state reflected in URL and results.

### BUY-02 Checkout
- API hooks:
  - `POST /api/checkout/initiate`
  - `GET /api/checkout/:id`
  - `POST /api/checkout/:id/confirm`
  - order creation and inventory reservation calls
- Assertions:
  - confirm button idempotent,
  - stock conflict surfaces actionable message.

### BUY-03 Payment Processing
- API hooks:
  - `POST /api/payments`
  - `GET /api/payments/:id/status`
  - `POST /api/payments/webhooks/pesapal` (backend callback path)
- UI must support:
  - method selection (mobile money/card/bank/wallet/COD),
  - redirect/resume flow for Pesapal,
  - pending -> success/failure transition polling.
- Assertions:
  - correct state badge and receipt details after callback.

### BUY-04 Order Tracking
- API hooks:
  - order status read/update endpoints,
  - logistics tracking endpoints.
- Assertions:
  - timeline states are monotonic and time-stamped,
  - courier location/status refresh without full page reload.

### BUY-05 Cancellation And Refund
- API hooks:
  - `DELETE /orders/:id` or cancellation route,
  - `POST /api/payments/:id/refund`
- Assertions:
  - refund reason required,
  - order state, refund state, and notification state stay consistent.

### SEL-01 Seller Settings
- API hooks: business/user profile update endpoints.
- Assertions: persisted settings reflected after reload and in downstream screens.

### SEL-02 Seller KYC
- API hooks:
  - compliance submission endpoints (`/api/compliance/*`),
  - KYC status retrieval.
- Assertions: pending/under_review/approved/rejected states with required document prompts.

### SEL-03 Product Catalog
- API hooks:
  - `POST|GET|PUT|DELETE /api/v1/products*`
  - `POST /api/v1/products/:id/publish`
  - inventory sync side effects
- Assertions:
  - publish blocked on invalid data,
  - published products become discoverable.

### SEL-04 Pricing
- API hooks:
  - `POST /api/v1/pricing/calculate`
  - `PUT /api/v1/products/:productId/pricing`
  - `POST /api/v1/pricing/bulk-update`
  - `GET /api/v1/pricing/analytics`
- Assertions:
  - margin/fee breakdown visible before confirmation,
  - bulk update partial failures are itemized.

### SEL-05 Campaign Lifecycle
- API hooks:
  - `/campaigns` create/list/get/update
  - `/campaigns/:id/launch|pause|resume|cancel|complete`
- Assertions: campaign state machine and live stats rendering.

### SEL-06 Storefront
- API hooks:
  - `GET /sellers/:sellerId/storefront`
  - `POST /sellers/:sellerId/share-url`
- Assertions: generated link is valid and trackable.

### SEL-07 Seller Fulfillment
- API hooks:
  - order processing/status updates,
  - logistics pickup request and delivery assignment.
- Assertions:
  - shipment prep checklist gating,
  - pickup schedule + status chips synchronized.

### SEL-08 Payment Management/Payout
- API hooks:
  - payment listing by seller/order,
  - `POST /api/payouts`
  - `GET /api/payouts/:id`
  - `POST /api/payouts/:id/cancel`
- Assertions:
  - payout eligibility and balance validation in UI before submission.

### SEL-09 Sales Analytics
- API hooks:
  - seller dashboard/profitability/action-center endpoints.
- Assertions:
  - period filters propagate to all widgets,
  - action item resolve updates board without full reload.

### SEL-10 Customer Engagement
- API hooks:
  - community post/challenge/discussion routes,
  - notification send endpoints.
- Assertions:
  - engagement metrics cards update after actions.

### SEL-11 Seller Support
- API hooks:
  - `POST /tickets`
  - `GET /tickets/:id`
  - `POST /tickets/:id/messages`
  - `POST /tickets/:id/close`
- Assertions:
  - threaded updates and status badges remain consistent.

### SEL-12 Enabler Collaboration
- API hooks:
  - enabler matching/collaboration endpoints,
  - training coordination endpoints.
- Assertions:
  - session request, acceptance, and status transitions shown in UI.

### SUP-01 Production Management
- API hooks:
  - `POST /plans`
  - `PUT /plans/:id/status`
  - `GET /dashboard`
  - `GET /capacity`
  - `POST /quality/checkpoints`
- Assertions:
  - capacity constraints block invalid plans,
  - quality checkpoint failures are surfaced with remediation CTA.

### SUP-02 Supplier Pricing/Payment
- API hooks: pricing updates + receivable/payment status views.
- Assertions: receivable aging and expected settlement date visibility.

### SUP-03 Bulk Fulfillment
- API hooks: bulk order processing + logistics tracking endpoints.
- Assertions: partial batch failures and retry controls.

### COU-01 Courier Operations
- API hooks:
  - `PUT /couriers/:courierId/status`
  - assignment retrieval endpoints.
- Assertions: availability toggle affects assignment feed immediately.

### COU-02 Delivery Management
- API hooks:
  - `GET /deliveries`
  - `POST /deliveries/:deliveryId/status`
  - tracking location endpoints.
- Assertions:
  - status order enforced (`assigned -> picked_up -> in_transit -> arrived -> delivered`),
  - customer notify events reflected in UI.

### COU-03 COD OTP
- API hooks:
  - `POST /cod/:deliveryId/otp`
  - `POST /cod/:deliveryId/verify`
- Assertions: OTP expiry and retry counter behavior.

### COU-04 Route Optimization
- API hooks:
  - `POST /routes/optimize`
  - `GET /routes/courier/:courierId`
  - `POST /routes/:routeId/alternatives`
- Assertions: route summary and ETA deltas displayed.

### COU-05 Earnings Dashboard
- API hooks:
  - `GET /earnings*`
  - analytics performance endpoints
- Assertions: period switch updates earnings + KPIs atomically.

### ENA-01 Enabler Onboarding
- API hooks:
  - `POST /enablers/register`
  - `POST /enablers/:id/approve`
  - `GET /enablers/:id`
- Assertions: status transitions (pending -> approved/rejected).

### ENA-02 Listings And Orders
- API hooks:
  - `POST|GET /enablers/:enablerId/listings`
  - `POST|GET /enablers/:enablerId/orders`
- Assertions: listing eligibility and commission preview shown pre-submit.

### ENA-03 Training Management
- API hooks:
  - `POST /api/v1/training/start`
  - `POST /api/v1/training/:id/progress`
  - `POST /api/v1/training/:id/complete`
  - `GET /api/v1/training/progress/:learnerId`
  - `GET /api/v1/modules/*`
- Assertions: progress persistence and certificate eligibility messaging.

### ENA-04 Support Services
- API hooks: support ticket assign/resolve/close.
- Assertions: SLA timers, resolution states, agent notes visibility.

### ADM-01 User Management
- API hooks:
  - `/api/v1/admin/users/*`
  - `/api/v1/admin/users/search`
- Assertions: role/status updates reflected on reload and audit timeline.

### ADM-02 KYC Workflow
- API hooks:
  - compliance manual review endpoints,
  - user status update endpoints.
- Assertions:
  - approve/reject reasons are mandatory and recorded.

### ADM-03 Dispute Resolution
- API hooks:
  - order dispute resolution endpoint,
  - payment refund/reversal endpoints,
  - wallet block/unblock where relevant.
- Assertions: final decision atomically updates dispute, order, payment views.

### ADM-04 Transaction Monitoring
- API hooks:
  - payment list/status,
  - wallet freeze/unfreeze/block actions,
  - anomaly analytics endpoints.
- Assertions: anomaly action emits visible admin alert trail.

### ADM-05 Dashboard Management
- API hooks: analytics dashboard aggregates.
- Assertions: widget-level loading/error states, period comparison correctness.

### ADM-06 System Administration
- API hooks:
  - `/api/v1/admin/stats`
  - `/api/v1/admin/discovery/refresh`
  - `/api/v1/admin/health`
  - `/api/v1/admin/audit`
  - `/api/v1/admin/security-events`
- Assertions: configuration change confirmation and rollback UX.

### ADM-07 Compliance Audit
- API hooks:
  - compliance audit-log/report endpoints,
  - admin audit/security endpoints.
- Assertions:
  - filter/export behavior is deterministic,
  - audit trail entries are complete (actor, action, timestamp, entity).

### BIZ-01 Business Registration Saga
- API hooks:
  - `POST /api/businesses`
  - verification/suspend/reactivate routes
  - downstream user/compliance/notification checks
- Assertions:
  - onboarding steps trackable in UI timeline,
  - rejection compensation (disable seller capabilities) is visible.

### NOTIF-01 Notification Center
- API hooks:
  - `POST|GET /api/v1/notifications`
  - `PATCH /api/v1/notifications/:id/status`
  - `POST /api/v1/notifications/:id/retry`
  - `POST /api/v1/notifications/bulk`
- Assertions: unread/read/retry states and deduplication.

### NOTIF-02 Preferences
- API hooks:
  - `GET|PUT /api/v1/preferences/:userId`
  - `POST /api/v1/preferences/:userId/opt-out`
- Assertions: preference toggles affect downstream sends.

### WAL-01 Wallet Lifecycle
- API hooks:
  - `/api/wallets/:userId/balance`
  - credit/debit/hold/release/capture/reverse/topup/payout/statement routes
- Assertions:
  - ledger math and visible balance stay consistent after each action,
  - duplicate submit does not double-charge.

## 8. Known Gaps To Handle In UI Tests
Current code indicates some endpoints/features are placeholders or not fully implemented:
- Catalog:
  - unpublish, metrics, category update, media upload/read return `501` in current routes.
- Pricing:
  - `POST /api/v1/pricing/validate-rule` currently returns `501`.
- Enabler Hub:
  - `/hub/products` placeholder response.
- Runtime path differences:
  - some module index files initialize empty routers unless wired at runtime.

Cypress expectation for these:
- UI should hide unavailable actions, or
- surface `Not Implemented` as a controlled/known state (not generic crash).

## 9. Cypress Spec Organization
Recommended folders:
- `cypress/e2e/auth/*`
- `cypress/e2e/buyer/*`
- `cypress/e2e/seller/*`
- `cypress/e2e/supplier/*`
- `cypress/e2e/courier/*`
- `cypress/e2e/enabler/*`
- `cypress/e2e/admin/*`
- `cypress/e2e/cross-service/*`

Recommended tagging:
- `@smoke`
- `@critical-path`
- `@payments`
- `@logistics`
- `@compensation`
- `@rbac`
- `@mobile`
- `@accessibility`

## 10. Definition Of Done For "Full Perfect Coverage"
Coverage is complete only when:
- every flow in Section 6 has passing happy and failure tests,
- all critical compensation flows pass (payment failure, stock failure, KYC rejection, dispute refund),
- role-based access for every protected flow is enforced in UI and API,
- no flow has missing loading/error/empty state handling,
- all tests pass in both desktop and mobile viewports,
- flaky rate is under agreed threshold (target: <1% across 20 reruns).
