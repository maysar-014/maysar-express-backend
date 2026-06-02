# Maysar Express Frontend UI/UX Guide

**Purpose**
This document translates the backend API and service capabilities into a complete, implementable frontend UX specification for a web application. It covers Buyer, Seller, Supplier, and Admin roles, and maps backend endpoints to UI elements and workflows.

**Sources Reviewed**
Primary API contract: `api-contract.yaml`.
Service OpenAPI specs: `services/user-service/openapi.yaml`, `services/order-service/openapi.yaml`, `services/training-service/openapi.yaml`, `services/community-service/openapi.yaml`, `services/enabler-service/openapi.yaml`.
Operational flows: `operations.md`.
Support service routes: `services/support-service/src/api/routes/ticket.routes.ts`.
Wallet roles and rate limits: `services/wallet-service/src/api/routes/wallet.routes.ts`.

**Platform Roles (Frontend Scope)**
Buyer, Seller, Supplier, Admin.
Note: Backend also includes Courier, Enabler, Superuser, System, Agent roles. These appear in service policies and operations but are not part of the core product scope in this guide.

**Backend Analysis**

API access patterns:
- Base URL (dev): `http://localhost:3000` from `api-contract.yaml`.
- Base URL (prod): `https://api.maysar.co.tz` from `api-contract.yaml`.
- Authentication: Bearer JWT required on most endpoints; `POST /api/auth/register` and `POST /api/auth/login` are public entry points that do not require CSRF.
- Session bootstrap: stateful browser mutations may use `/csrf`, but public email auth flows do not need a pre-issued CSRF token.

System domains detected:
- Authentication: login, logout, refresh, session verify, 2FA enable/disable/verify, password reset.
- Users: profile, addresses, preferences, stats, role changes, admin user search.
- Products and Catalog: product CRUD, publish, seller storefront, categories, attributes, search, matching.
- Pricing: price calculation, rules, analytics.
- Orders: create, list, update status, COD validation, disputes, analytics.
- Checkout: initiate, view, confirm.
- Payments: initiate, get by id or order id, status checks, refunds, provider webhooks.
- Wallet: balances, credit, debit, holds, topups, statements, payouts.
- Inventory: managed through product variants and seller/supplier stock flows.
- Logistics: deliveries, tracking, routes, courier operations, COD OTP, analytics, earnings.
- Notifications: create, bulk send, status, retry, SMS delivery.
- Analytics: order analytics, pricing analytics, logistics analytics, production dashboard, user stats.
- Business: business registration and verification workflows.
- Commission: approval and adjustments (admin focused).
- Community: discovery, challenges, knowledge articles, reviews.
- Training: module availability, start, complete, progress, eligibility.
- Support: ticket creation, assignment, resolution, close, ticket messages.
- Compliance: KYC verification, status, manual review, risk assessment, reporting.
- Maps: health and readiness checks for routing services.
- Production: production plans, capacity, quality checkpoints.

Role gating and KYC:
- Seller and Supplier roles are KYC gated based on operations flows. The UI must enforce KYC submission and admin approval before enabling full role operations.
- Buyer can operate without KYC unless jurisdiction requires it for payments or wallet operations.

**Role Capability Matrix**
| Capability | Buyer | Seller | Supplier | Admin |
| --- | --- | --- | --- | --- |
| Register and login | Yes | Yes | Yes | Yes |
| 2FA setup and verification | Yes | Yes | Yes | Yes |
| View public catalog and search | Yes | Yes | Yes | Yes |
| Create and manage products | No | Yes | Yes | Yes |
| Publish products | No | Yes | Yes | Yes |
| Pricing rule management | No | Yes | Yes | Yes |
| Order creation | Yes | No | No | Yes |
| Order fulfillment management | No | Yes | Yes | Yes |
| COD validation | Yes | Yes | No | Yes |
| Payments initiation | Yes | Yes | No | Yes |
| Wallet topup | Yes | Yes | No | Yes |
| Wallet payout | No | No | No | No (Enabler role in backend) |
| Logistics tracking | Yes | Yes | Yes | Yes |
| Logistics configuration | No | Yes | Yes | Yes |
| Production planning | No | No | Yes | Yes |
| Support tickets | Yes | Yes | Yes | Yes |
| Support ticket assignment and resolution | No | No | No | Yes |
| Compliance manual review | No | No | No | Yes |
| User management and role changes | No | No | No | Yes |
| Platform analytics | Limited | Yes | Yes | Yes |

**API Endpoints**
The following endpoint catalog is the union of the primary API contract and service-level OpenAPI specs, plus operational endpoints found in `operations.md` not present in the OpenAPI contract. Endpoints are grouped by domain tag.
**Addresses**

Endpoint: DELETE /users/{userId}/addresses/{addressId}
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Delete user address
Request: Path params: userId*, addressId*
Response: 204 -> Not specified
Errors: 404
Rate Limits: Not specified

Endpoint: PUT /users/{userId}/addresses/{addressId}
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Update user address
Request: Path params: userId*, addressId* | Body { type, street, city, state, postalCode, country, isDefault }
Response: 200 -> { id, userId, type, street, city, state, postalCode, country, isDefault, createdAt, updatedAt }
Errors: 404
Rate Limits: Not specified

Endpoint: GET /users/{userId}/addresses
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Get user addresses
Request: Path params: userId*
Response: 200 -> { addresses }
Errors: 404
Rate Limits: Not specified

Endpoint: POST /users/{userId}/addresses
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Add user address
Request: Path params: userId* | Body { type, street*, city*, state, postalCode, country*, isDefault }
Response: 201 -> { id, userId, type, street, city, state, postalCode, country, isDefault, createdAt, updatedAt }
Errors: 400
Rate Limits: Not specified

**Administration**

Endpoint: GET /users/stats
Role Access: ADMIN
Purpose: Get user statistics
Request: None
Response: 200 -> { stats, total }
Errors: 403
Rate Limits: Not specified

**Analytics**

Endpoint: GET /analytics/orders
Role Access: ADMIN, SELLER, SUPPLIER
Purpose: Order analytics
Request: Query params: period, startDate, endDate, sellerId
Response: 200 -> { period*, startDate, endDate, metrics* }
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/analytics/analytics/dashboard/{sellerId}
Role Access: ADMIN, SELLER, SUPPLIER
Purpose: Get seller dashboard
Request: Path params: sellerId*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/analytics/analytics/sales/{sellerId}
Role Access: ADMIN, SELLER, SUPPLIER
Purpose: Get sales analytics
Request: Path params: sellerId*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/analytics/courier/analytics/{courierId}
Role Access: ADMIN, SELLER, SUPPLIER
Purpose: Get courier analytics
Request: Path params: courierId*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/analytics/supplier/analytics/{supplierId}
Role Access: ADMIN, SELLER, SUPPLIER
Purpose: Get supplier analytics
Request: Path params: supplierId*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/production/dashboard
Role Access: ADMIN, SELLER, SUPPLIER
Purpose: Production dashboard
Request: None
Response: 200 -> { summary }
Errors: 401, 403, 500
Rate Limits: Not specified

**Auth**

Endpoint: POST /api/auth/register
Role Access: Public
Purpose: Create a new account
Request: Body { email*, phoneNumber*, firstName*, lastName*, password*, role?, phone?, profile? }
Response: 201 -> Not specified
Errors: 400, 409
Rate Limits: Not specified

Endpoint: POST /api/auth/2fa/disable
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Disable 2FA
Request: Body { password* }
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/auth/2fa/enable
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Enable 2FA
Request: Body { password*, totpCode* }
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/auth/2fa/verify
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Verify 2FA setup
Request: Body { secret*, totpCode* }
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/auth/forgot-password
Role Access: Public
Purpose: Request password reset
Request: Body { email* }
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/auth/login
Role Access: Public
Purpose: User login and token issue
Request: Body { email*, password*, totpCode }
Response: 200 -> Not specified
Errors: 401
Rate Limits: Not specified

Endpoint: GET /api/auth/oauth/initiate
Role Access: Public
Purpose: Start OAuth sign-in flow
Request: Query params: role?
Response: 200 -> Not specified
Errors: 400
Rate Limits: Not specified

Endpoint: POST /api/auth/logout
Role Access: BUYER, COURIER, ENABLER, SELLER, SUPPLIER, SYSTEM
Purpose: User logout
Request: None
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/auth/refresh
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Refresh access token
Request: None
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/auth/reset-password
Role Access: Public
Purpose: Reset password with token
Request: Body { token*, newPassword*, confirmPassword* }
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/auth/verify
Role Access: BUYER, COURIER, ENABLER, SELLER, SUPPLIER, SYSTEM
Purpose: Verify session/token validity
Request: None
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

**Business**

Endpoint: POST /api/business-registry/{id}/reactivate
Role Access: ADMIN, SELLER, SUPPLIER
Purpose: Reactivate business
Request: Path params: id*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/business-registry/{id}/suspend
Role Access: ADMIN, SELLER, SUPPLIER
Purpose: Suspend business
Request: Path params: id*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/business-registry/{id}/verify
Role Access: ADMIN, SELLER, SUPPLIER
Purpose: Verify business
Request: Path params: id*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: DELETE /api/business-registry/{id}
Role Access: ADMIN, SELLER, SUPPLIER
Purpose: Delete business
Request: Path params: id*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/business-registry/{id}
Role Access: ADMIN, SELLER, SUPPLIER
Purpose: Get business by ID
Request: Path params: id*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: PUT /api/business-registry/{id}
Role Access: ADMIN, SELLER, SUPPLIER
Purpose: Update business
Request: Path params: id*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/business-registry/owner/{ownerId}
Role Access: ADMIN, SELLER, SUPPLIER
Purpose: Get businesses by owner
Request: Path params: ownerId*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/business-registry/search
Role Access: ADMIN, SELLER, SUPPLIER
Purpose: Search businesses
Request: Query params: q
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/business-registry
Role Access: ADMIN, SELLER, SUPPLIER
Purpose: Register business
Request: Body { name*, type*, ownerId* }
Response: 201 -> Not specified
Errors: None specified
Rate Limits: Not specified

**Checkout**

Endpoint: POST /api/checkout/{id}/confirm
Role Access: BUYER
Purpose: Confirm checkout
Request: Path params: id*
Response: 200 -> checkout session DTO plus MBV fields; 422 -> minimum basket value not met
Errors: 422 when basket total is below global MBV
Rate Limits: Not specified

Endpoint: GET /api/checkout/{id}
Role Access: BUYER
Purpose: Get checkout session
Request: Path params: id*
Response: 200 -> checkout session DTO with `deliveryEligible`, `minimumBasketValue`, `minimumBasketShortfall`, `minimumBasketMessage`
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/checkout/initiate
Role Access: BUYER
Purpose: Initiate checkout
Request: Body object
Response: 201 -> checkout session DTO with pricing and MBV guidance
Errors: None specified
Rate Limits: Not specified

**Commission**

Endpoint: PUT /api/commission/{id}/approve
Role Access: ADMIN
Purpose: Approve commission
Request: Path params: id*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/commission/{id}
Role Access: ADMIN
Purpose: Get commission by ID
Request: Path params: id*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/commission/calculate
Role Access: ADMIN
Purpose: Calculate commission
Request: Body object
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/commission/sellers/{sellerId}/summary
Role Access: ADMIN
Purpose: Get commission summary
Request: Path params: sellerId*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/commission/sellers/{sellerId}
Role Access: ADMIN
Purpose: Get seller commissions
Request: Path params: sellerId*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

**Community**

Endpoint: POST /api/community/challenges/{challengeId}/solutions
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Submit solution to challenge
Request: Path params: challengeId*
Response: 201 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/community/challenges
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: List business challenges
Request: None
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/community/challenges
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Propose business challenge
Request: Body object
Response: 201 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/community/discover
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Get personalized content recommendations
Request: None
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/community/knowledge/articles/{articleId}/reviews
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Submit peer review
Request: Path params: articleId*
Response: 201 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/community/knowledge/articles/{articleId}
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Get article
Request: Path params: articleId*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/community/knowledge/articles
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: List knowledge articles
Request: None
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/community/knowledge/articles
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Submit knowledge article
Request: Body object
Response: 201 -> Not specified
Errors: None specified
Rate Limits: Not specified

**Compliance**

Endpoint: POST /api/compliance/api/compliance/audit-log
Role Access: ADMIN
Purpose: Record compliance audit entry
Request: Body { ... }
Response: 200 -> { id }
Errors: 400, 422, 500
Rate Limits: Not specified

Endpoint: POST /api/compliance/api/compliance/generate-report
Role Access: ADMIN
Purpose: Generate compliance report
Request: Body { range*, ... }
Response: 200 -> { reportId }
Errors: 400, 422, 500
Rate Limits: Not specified

Endpoint: GET /api/compliance/api/compliance/kyc-status/{userId}
Role Access: BUYER, SELLER, SUPPLIER, ADMIN
Purpose: Get KYC status
Request: Path params: userId*
Response: 200 -> { status }
Errors: 400, 401, 403, 404, 422, 500
Rate Limits: Not specified

Endpoint: POST /api/compliance/api/compliance/manual-review
Role Access: ADMIN
Purpose: Admin manual review decision
Request: Body { userId*, decision*, notes }
Response: 200 -> { status }
Errors: 400, 404, 422, 500
Rate Limits: Not specified

Endpoint: POST /api/compliance/api/compliance/monitor
Role Access: ADMIN
Purpose: Monitor compliance events
Request: Body { ... }
Response: 200 -> { status }
Errors: 400, 422, 500
Rate Limits: Not specified

Endpoint: POST /api/compliance/api/compliance/risk-assessment
Role Access: ADMIN
Purpose: Run risk assessment
Request: Body { userId*, ... }
Response: 200 -> { score }
Errors: 400, 422, 500
Rate Limits: Not specified

Endpoint: POST /api/compliance/api/compliance/verify-document
Role Access: BUYER, SELLER, SUPPLIER, ADMIN
Purpose: Submit documents for KYC verification
Request: Body { ... }
Response: 200 -> { status }
Errors: 400, 401, 403, 422, 500
Rate Limits: Not specified

Endpoint: GET /api/compliance/metrics
Role Access: ADMIN
Purpose: Compliance metrics overview
Request: None
Response: 200 -> { metrics }
Errors: 500
Rate Limits: Not specified

**Enabler**

Endpoint: GET /api/enabler/{enablerId}/listings
Role Access: ADMIN, ENABLER
Purpose: Get enabler listings
Request: Path params: enablerId*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/enabler/{enablerId}/listings
Role Access: ADMIN, ENABLER
Purpose: List product as enabler
Request: Path params: enablerId*
Response: 201 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/enabler/{enablerId}/orders
Role Access: ADMIN, ENABLER
Purpose: Get enabler orders
Request: Path params: enablerId*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/enabler/{enablerId}/orders
Role Access: ADMIN, ENABLER
Purpose: Create enabler order
Request: Path params: enablerId*
Response: 201 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/enabler/{id}/approve
Role Access: ADMIN, ENABLER
Purpose: Approve enabler
Request: Path params: id*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/enabler/{id}
Role Access: ADMIN, ENABLER
Purpose: Get enabler profile
Request: Path params: id*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/enabler/enablers/register
Role Access: ENABLER, ADMIN
Purpose: Register enabler account
Request: Body { ... }
Response: 200 -> { id }
Errors: 400, 401, 403, 422, 500
Rate Limits: Not specified

Endpoint: GET /api/enabler/hub/products
Role Access: ENABLER, ADMIN
Purpose: Browse enabler hub products
Request: None
Response: 200 -> { items }
Errors: 401, 403, 500
Rate Limits: Not specified

Endpoint: POST /api/enabler/register
Role Access: ADMIN, ENABLER
Purpose: Register as enabler
Request: Body object
Response: 201 -> Not specified
Errors: None specified
Rate Limits: Not specified

**Enablers**

Endpoint: POST /enablers/register
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Register a new Enabler
Request: Body { userId*, businessName* }
Response: 201 -> Not specified
Errors: None specified
Rate Limits: Not specified

**Feed**

Endpoint: GET /users/{userId}/feed
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Get personalized user feed
Request: Path params: userId* | Query params: limit, includeFollowed, type
Response: 200 -> { feed, pagination }
Errors: 404
Rate Limits: Not specified

**Health**

Endpoint: GET /api/catalog/health
Role Access: Public
Purpose: Catalog module health check
Request: None
Response: 200 -> { status }
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/maps/health/live
Role Access: Public
Purpose: Maps liveness check
Request: None
Response: 200 -> { status }
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/maps/health/ready
Role Access: Public
Purpose: Maps readiness check
Request: None
Response: 200 -> { status }
Errors: 503
Rate Limits: Not specified

Endpoint: GET /api/maps/health
Role Access: Public
Purpose: Maps service health check
Request: None
Response: 200 -> { status }
Errors: 503
Rate Limits: Not specified

Endpoint: GET /api/notification/health
Role Access: Public
Purpose: Notification module health check
Request: None
Response: 200 -> { status }
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /health/detailed
Role Access: Public
Purpose: Detailed health check
Request: None
Response: 200 -> { service, status, timestamp, database, cache, messaging, checks }
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /health/live
Role Access: Public
Purpose: Liveness probe
Request: None
Response: 200 -> { status, timestamp }
Errors: 500
Rate Limits: Not specified

Endpoint: GET /health/ready
Role Access: Public
Purpose: Readiness probe
Request: None
Response: 200 -> { status, dependencies }
Errors: 503
Rate Limits: Not specified

Endpoint: GET /health
Role Access: BUYER, COURIER, ENABLER, SELLER, SUPPLIER, SYSTEM
Purpose: Health check
Request: None
Response: 200 -> { status, uptime, timestamp, memoryUsage }
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /ready
Role Access: Public
Purpose: Readiness check
Request: None
Response: 200 -> { status, checks }
Errors: 503
Rate Limits: Not specified

**Listings**

Endpoint: POST /enablers/{enablerId}/listings
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: List a product for sale
Request: Path params: enablerId*
Response: 201 -> Not specified
Errors: None specified
Rate Limits: Not specified

**Logistics**

Endpoint: GET /api/logistics/analytics/performance
Role Access: ADMIN, SELLER, SUPPLIER
Purpose: Get performance metrics
Request: None
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/logistics/analytics
Role Access: ADMIN, SELLER, SUPPLIER
Purpose: Get logistics analytics
Request: None
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/logistics/cod/{deliveryId}/otp
Role Access: ADMIN, SELLER, SUPPLIER
Purpose: Generate COD OTP
Request: Path params: deliveryId*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/logistics/cod/{deliveryId}/verify
Role Access: ADMIN, SELLER, SUPPLIER
Purpose: Verify COD delivery
Request: Path params: deliveryId*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: PUT /api/logistics/couriers/{courierId}/status
Role Access: ADMIN, SELLER, SUPPLIER
Purpose: Update courier status
Request: Path params: courierId*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/logistics/couriers/{courierId}
Role Access: ADMIN, SELLER, SUPPLIER
Purpose: Get courier by ID
Request: Path params: courierId*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/logistics/couriers
Role Access: ADMIN, SELLER, SUPPLIER
Purpose: Get couriers
Request: None
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/logistics/deliveries/{deliveryId}/history
Role Access: ADMIN, SELLER, SUPPLIER
Purpose: Get delivery history
Request: Path params: deliveryId*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/logistics/deliveries/{deliveryId}/status
Role Access: ADMIN, SELLER, SUPPLIER
Purpose: Update delivery status
Request: Path params: deliveryId*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/logistics/deliveries/{deliveryId}
Role Access: ADMIN, SELLER, SUPPLIER
Purpose: Get delivery by ID
Request: Path params: deliveryId*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/logistics/deliveries
Role Access: ADMIN, SELLER, SUPPLIER
Purpose: Get deliveries
Request: Query params: status, courierId
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/logistics/deliveries
Role Access: ADMIN, SELLER, SUPPLIER
Purpose: Create delivery
Request: Body object
Response: 201 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/logistics/earnings/courier/{courierId}
Role Access: ADMIN, SELLER, SUPPLIER
Purpose: Get courier earnings
Request: Path params: courierId*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/logistics/earnings
Role Access: ADMIN, SELLER, SUPPLIER
Purpose: Get earnings
Request: None
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/logistics/earnings
Role Access: ADMIN, SELLER, SUPPLIER
Purpose: Record earnings
Request: None
Response: 201 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: PUT /api/logistics/routes/{routeId}/progress
Role Access: ADMIN, SELLER, SUPPLIER
Purpose: Update route progress
Request: Path params: routeId*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/logistics/routes/{routeId}
Role Access: ADMIN, SELLER, SUPPLIER
Purpose: Get route by ID
Request: Path params: routeId*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/logistics/routes/courier/{courierId}
Role Access: ADMIN, SELLER, SUPPLIER
Purpose: Get courier routes
Request: Path params: courierId*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/logistics/api/v1/routes/optimize
Role Access: ADMIN, SELLER, SUPPLIER
Purpose: Optimize route
Request: Body object
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/logistics/routes
Role Access: ADMIN, SELLER, SUPPLIER
Purpose: Get routes
Request: None
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/logistics/tracking/{trackingNumber}
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Get tracking history
Request: Path params: trackingNumber*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/logistics/tracking/location
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Store location update
Request: Body object
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

**Monitoring**

Endpoint: GET /metrics
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: System metrics
Request: None
Response: 200 -> { posts, users, engagement, performance, moderation }
Errors: None specified
Rate Limits: Not specified

**Notifications**

Endpoint: POST /api/notification/{id}/retry
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Retry failed notification
Request: Path params: id*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: PATCH /api/notification/{id}/status
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Update notification status
Request: Path params: id*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: DELETE /api/notification/{id}
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Cancel scheduled notification
Request: Path params: id*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/notification/{id}
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Get notification
Request: Path params: id*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/notification/bulk
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Bulk send notifications
Request: None
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/notification/sms/send
Role Access: ADMIN, SELLER, SUPPLIER, BUYER
Purpose: Send SMS notification
Request: Body { to*, message* }
Response: 200 -> { message, status }
Errors: 400, 401, 403, 422, 500
Rate Limits: Not specified

Endpoint: GET /api/notification/sms/statistics
Role Access: ADMIN
Purpose: SMS delivery statistics
Request: None
Response: 200 -> { sent, delivered, failed }
Errors: 400, 401, 403, 500
Rate Limits: Not specified

Endpoint: GET /api/notification
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: List notifications
Request: None
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/notification
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Create notification
Request: Body object
Response: 201 -> Not specified
Errors: None specified
Rate Limits: Not specified

**Orders**

Endpoint: POST /api/order/orders/{id}/status
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Update order status
Request: Path params: id* | Body { status* }
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: DELETE /api/order/orders/{id}
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Cancel order
Request: Path params: id*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/order/orders/{id}
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Get order by ID
Request: Path params: id*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: PUT /api/order/orders/{id}
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Update order
Request: Path params: id*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/order/orders/analytics/stats
Role Access: BUYER, COURIER, ENABLER, SELLER, SUPPLIER, SYSTEM
Purpose: Get order analytics
Request: None
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/order/orders/cod/validate
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Validate COD eligibility
Request: Body object
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/order/orders/disputes/{id}/resolve
Role Access: ADMIN, SELLER
Purpose: Resolve COD dispute
Request: Path params: id*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/order/orders/search
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Search orders
Request: Query params: q
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/order/orders
Role Access: BUYER, COURIER, ENABLER, SELLER, SUPPLIER, SYSTEM
Purpose: Get all orders
Request: Query params: page, limit, status
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/order/orders
Role Access: BUYER, COURIER, ENABLER, SELLER, SUPPLIER, SYSTEM
Purpose: Place new order
Request: Body { items*, shippingAddress*, paymentMethod }
Response: 201 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: DELETE /orders/{orderId}
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Cancel order
Request: Path params: orderId* | Query params: reason, notes
Response: 200 -> { id*, buyerId*, sellerId*, status*, totalAmount*, totalWeight, items*, deliveryAddress*, paymentMethod*, createdAt*, updatedAt, estimatedDelivery }
Errors: 400, 404
Rate Limits: Not specified

Endpoint: GET /orders/{orderId}
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Get order details
Request: Path params: orderId*
Response: 200 -> { id*, buyerId*, sellerId*, status*, totalAmount*, totalWeight, items*, deliveryAddress*, paymentMethod*, createdAt*, updatedAt, estimatedDelivery, paymentStatus, tracking }
Errors: 401, 404
Rate Limits: Not specified

Endpoint: PUT /orders/{orderId}
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Update order
Request: Path params: orderId* | Body { deliveryAddress, notes }
Response: 200 -> { id*, buyerId*, sellerId*, status*, totalAmount*, totalWeight, items*, deliveryAddress*, paymentMethod*, createdAt*, updatedAt, estimatedDelivery }
Errors: 400, 403, 404
Rate Limits: Not specified

Endpoint: GET /orders
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: List orders
Request: Query params: page, limit, buyerId, sellerId, status, dateFrom, dateTo, sortBy, sortOrder
Response: 200 -> { orders*, pagination*, summary }
Errors: 400, 401
Rate Limits: Not specified

Endpoint: POST /orders
Role Access: BUYER
Purpose: Create a new order
Request: Body { buyerId*, sellerId*, items*, currency, deliveryAddress*, paymentMethod*, paymentToken, notes }
Response: 201 -> { id*, buyerId*, sellerId*, status*, totalAmount*, totalWeight, items*, deliveryAddress*, paymentMethod*, createdAt*, updatedAt, estimatedDelivery }
Errors: 400, 401, 429, 500
Rate Limits: 429 documented

**Payments**

Endpoint: POST /api/payment/{id}/refund
Role Access: ADMIN, BUYER, SELLER
Purpose: Refund payment
Request: Path params: id*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/payment/{id}/status
Role Access: ADMIN, BUYER, SELLER
Purpose: Check payment status
Request: Path params: id*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/payment/{id}
Role Access: ADMIN, BUYER, SELLER
Purpose: Get payment by ID
Request: Path params: id*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/payment/order/{orderId}
Role Access: ADMIN, BUYER, SELLER
Purpose: Get payment by order ID
Request: Path params: orderId*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/payment/webhooks/pesapal
Role Access: ADMIN, BUYER, SELLER
Purpose: Pesapal webhook
Request: Body object
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/payment
Role Access: ADMIN, BUYER, SELLER
Purpose: Create payment
Request: Body { orderId*, amount*, method* }
Response: 201 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /orders/{orderId}/payment
Role Access: ADMIN, BUYER, SELLER
Purpose: Get payment status
Request: Path params: orderId*
Response: 200 -> { orderId*, paymentStatus*, paymentMethod*, amount, transactions }
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /orders/{orderId}/payment
Role Access: ADMIN, BUYER, SELLER
Purpose: Process payment
Request: Path params: orderId* | Body { paymentMethod*, paymentToken*, amount*, metadata }
Response: 200 -> { paymentId*, orderId*, status*, amount*, paymentMethod*, gatewayReference, expiresAt, nextAction }
Errors: 400
Rate Limits: Not specified

**Posts**

Endpoint: GET /authors/{authorId}/posts
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Get posts by author
Request: Path params: authorId* | Query params: page, limit
Response: 200 -> { posts, pagination }
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /posts/{postId}/related
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Get related posts
Request: Path params: postId* | Query params: limit
Response: 200 -> { postId, relatedPosts, count }
Errors: 404
Rate Limits: Not specified

Endpoint: GET /posts/{postId}
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Get post details
Request: Path params: postId*
Response: 200 -> { post }
Errors: 404
Rate Limits: Not specified

Endpoint: PUT /posts/{postId}
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Update post
Request: Path params: postId* | Body { title, content, visibility, metadata }
Response: 200 -> { message }
Errors: 403, 404
Rate Limits: Not specified

Endpoint: GET /posts/search
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Search posts
Request: Query params: q*, type, limit
Response: 200 -> { query, posts, count }
Errors: 400, 429
Rate Limits: 429 documented

Endpoint: GET /posts/trending
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Get trending topics
Request: Query params: hours
Response: 200 -> { topics, timeWindowHours }
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /posts
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Get published posts (global feed)
Request: Query params: page, limit, authorId, type, tags
Response: 200 -> { posts, pagination }
Errors: 400
Rate Limits: Not specified

Endpoint: POST /posts
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Create a new post
Request: Body { authorId*, content*, type*, title, visibility, metadata }
Response: 201 -> { postId, status, requiresModeration, message }; 202 -> { postId, status, requiresModeration, message }
Errors: 400, 403, 429
Rate Limits: 429 documented

**Preferences**

Endpoint: GET /users/{userId}/preferences
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Get user preferences
Request: Path params: userId*
Response: 200 -> { language, timezone, notificationsEnabled }
Errors: 404
Rate Limits: Not specified

Endpoint: PUT /users/{userId}/preferences
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Update user preferences
Request: Path params: userId* | Body { language, timezone, notificationsEnabled }
Response: 200 -> { language, timezone, notificationsEnabled }
Errors: 404
Rate Limits: Not specified

**Pricing**

Endpoint: GET /api/catalog/api/v1/pricing/analytics
Role Access: Public
Purpose: Get pricing analytics
Request: None
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/catalog/api/v1/pricing/calculate
Role Access: ADMIN, SELLER, SUPPLIER
Purpose: Calculate product price
Request: Body object
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/catalog/api/v1/pricing/rules
Role Access: ADMIN, SELLER, SUPPLIER
Purpose: Get pricing rules
Request: None
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/catalog/api/v1/pricing/rules
Role Access: ADMIN, SELLER, SUPPLIER
Purpose: Create pricing rule
Request: None
Response: 201 -> Not specified
Errors: None specified
Rate Limits: Not specified

**Production**

Endpoint: GET /api/production/capacity
Role Access: SUPPLIER, ADMIN
Purpose: Calculate production capacity
Request: None
Response: 200 -> { capacity }
Errors: 500
Rate Limits: Not specified

Endpoint: PUT /api/production/plans/{id}/status
Role Access: SUPPLIER, ADMIN
Purpose: Update production plan status
Request: Path params: id* | Body { status* }
Response: 200 -> { status }
Errors: 400, 500
Rate Limits: Not specified

Endpoint: POST /api/production/plans
Role Access: SUPPLIER, ADMIN
Purpose: Create production plan
Request: Body { ... }
Response: 201 -> { id }
Errors: 400, 422, 500
Rate Limits: Not specified

Endpoint: POST /api/production/quality/checkpoints
Role Access: SUPPLIER, ADMIN
Purpose: Record quality checkpoint
Request: Body { ... }
Response: 201 -> { id }
Errors: 400, 500
Rate Limits: Not specified

**Products**

Endpoint: GET /api/catalog/api/v1/categories/{categoryId}/attributes
Role Access: Public
Purpose: Load category attributes
Request: Path params: categoryId*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/catalog/api/v1/products/{id}/analytics
Role Access: Public
Purpose: Get product analytics
Request: Path params: id*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/catalog/api/v1/products/{id}/publish
Role Access: ADMIN, SELLER, SUPPLIER
Purpose: Publish product
Request: Path params: id*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: DELETE /api/catalog/api/v1/products/{id}
Role Access: ADMIN, SELLER, SUPPLIER
Purpose: Delete product
Request: Path params: id*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/catalog/api/v1/products/{id}
Role Access: Public
Purpose: Get product by ID
Request: Path params: id*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: PUT /api/catalog/api/v1/products/{id}
Role Access: ADMIN, SELLER, SUPPLIER
Purpose: Update product
Request: Path params: id*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: DELETE /api/catalog/api/v1/products/bulk
Role Access: ADMIN, SELLER, SUPPLIER
Purpose: Bulk delete products
Request: None
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/catalog/api/v1/products/bulk
Role Access: ADMIN, SELLER, SUPPLIER
Purpose: Bulk create products
Request: Body { products }
Response: 201 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: PUT /api/catalog/api/v1/products/bulk
Role Access: ADMIN, SELLER, SUPPLIER
Purpose: Bulk update products
Request: None
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/catalog/api/v1/products
Role Access: ADMIN, SELLER, SUPPLIER
Purpose: Create product
Request: Body { name*, description, price*, categoryId*, attributes }
Response: 201 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/catalog/api/v1/sellers/{sellerId}/products
Role Access: Public
Purpose: Get products by seller
Request: Path params: sellerId* | Query params: page, limit
Response: 200 -> { seller, products, pagination }
Errors: None specified
Rate Limits: Not specified

**Search**

Endpoint: GET /api/catalog/api/v1/products/search
Role Access: Public
Purpose: Search products
Request: Query params: q, category, minPrice, maxPrice, page, limit
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/catalog/api/v1/search/popular
Role Access: Public
Purpose: Get popular searches
Request: None
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/catalog/api/v1/search/suggestions
Role Access: Public
Purpose: Get search suggestions
Request: Query params: q
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

**Support**

Endpoint: POST /api/support/ticket/{id}/assign
Role Access: ADMIN
Purpose: Assign ticket
Request: Path params: id*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/support/ticket/{id}/close
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Close ticket
Request: Path params: id*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/support/ticket/{id}/messages
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Add message to ticket
Request: Path params: id*
Response: 201 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/support/ticket/{id}/resolve
Role Access: ADMIN
Purpose: Resolve ticket
Request: Path params: id*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/support/ticket/{id}
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Get ticket
Request: Path params: id*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/support/ticket
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: List tickets
Request: None
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/support/ticket
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Create support ticket
Request: Body { subject*, description*, priority }
Response: 201 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/support/tickets
Role Access: ADMIN
Purpose: List support tickets
Request: Query params: status, assigneeId
Response: 200 -> array<ticket>
Errors: 401, 403, 500
Rate Limits: Not specified

Endpoint: POST /api/support/tickets
Role Access: BUYER, SELLER, SUPPLIER, ADMIN
Purpose: Create support ticket
Request: Body { subject*, message* }
Response: 201 -> { id }
Errors: 400, 401, 403, 422, 500
Rate Limits: Not specified

**Training**

Endpoint: POST /api/training/{id}/complete
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Complete training
Request: Path params: id*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/training/available
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Get available training modules
Request: None
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/training/eligibility/{learnerId}
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Check training eligibility
Request: Path params: learnerId*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/training/progress/{learnerId}
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Get training progress
Request: Path params: learnerId*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/training/start
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Start training
Request: Body object
Response: 201 -> Not specified
Errors: None specified
Rate Limits: Not specified

**Uncategorized**

Endpoint: GET /api/health
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Health check
Request: None
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/v1/modules
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: List all training modules
Request: None
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/v1/training/{id}/complete
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Complete a training module
Request: Path params: id* | Body { score }
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/v1/training/eligibility/{learnerId}
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Check delivery eligibility for a learner
Request: Path params: learnerId*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/v1/training/progress/{learnerId}
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Get training progress for a learner
Request: Path params: learnerId*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/v1/training/start
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Start a training module
Request: Body { learnerId, learnerRole, moduleId }
Response: 201 -> Not specified
Errors: None specified
Rate Limits: Not specified

**Users**

Endpoint: POST /api/user/{id}/password
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Change user password
Request: Path params: id*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/user/{id}/role
Role Access: ADMIN
Purpose: Change user role
Request: Path params: id*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/user/{id}/suspend
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Suspend user account
Request: Path params: id*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: DELETE /api/user/{id}
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Delete user account
Request: Path params: id*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/user/{id}
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Get user by ID
Request: Path params: id*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: PUT /api/user/{id}
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Update user
Request: Path params: id*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/user/{userId}/cod-reputation
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Get COD reputation
Request: Path params: userId*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/user/profile
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Get current user profile
Request: None
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: PUT /api/user/profile
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Update current user profile
Request: Body object
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/user/request-password-reset
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Request password reset
Request: Body { email* }
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/user/verify-email/{token}
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Verify email address
Request: Path params: token*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/user
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Create new user
Request: Body { email*, password*, name*, phone }
Response: 201 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: DELETE /users/{userId}
Role Access: ADMIN
Purpose: Delete user account
Request: Path params: userId*
Response: 204 -> Not specified
Errors: 403, 404
Rate Limits: Not specified

Endpoint: GET /users/{userId}
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Get user by ID
Request: Path params: userId*
Response: 200 -> { id, email, firstName, lastName, phoneNumber, dateOfBirth, avatar, role, status, isEmailVerified, isPhoneVerified, emailVerifiedAt, phoneVerifiedAt, language, timezone, notificationsEnabled, createdAt, updatedAt, lastLoginAt }
Errors: 404
Rate Limits: Not specified

Endpoint: PUT /users/{userId}
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Update user profile
Request: Path params: userId* | Body { firstName, lastName, phoneNumber, dateOfBirth, avatar }
Response: 200 -> { id, email, firstName, lastName, phoneNumber, dateOfBirth, avatar, role, status, isEmailVerified, isPhoneVerified, emailVerifiedAt, phoneVerifiedAt, language, timezone, notificationsEnabled, createdAt, updatedAt, lastLoginAt }
Errors: 403, 404
Rate Limits: Not specified

Endpoint: GET /users
Role Access: ADMIN
Purpose: Search users
Request: Query params: query, role, status, limit, offset
Response: 200 -> { users, total, limit, offset }
Errors: 403
Rate Limits: Not specified

Endpoint: POST /users
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Create a new user
Request: Body { email*, password*, firstName*, lastName*, phoneNumber, dateOfBirth, role }
Response: 201 -> { id, email, firstName, lastName, phoneNumber, dateOfBirth, avatar, role, status, isEmailVerified, isPhoneVerified, emailVerifiedAt, phoneVerifiedAt, language, timezone, notificationsEnabled, createdAt, updatedAt, lastLoginAt }
Errors: 400, 409
Rate Limits: Not specified

**Verification**

Endpoint: POST /users/{userId}/verify-email
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Verify user email
Request: Path params: userId*
Response: 200 -> { id, email, firstName, lastName, phoneNumber, dateOfBirth, avatar, role, status, isEmailVerified, isPhoneVerified, emailVerifiedAt, phoneVerifiedAt, language, timezone, notificationsEnabled, createdAt, updatedAt, lastLoginAt }
Errors: 404
Rate Limits: Not specified

Endpoint: POST /users/{userId}/verify-phone
Role Access: ADMIN, BUYER, SELLER, SUPPLIER
Purpose: Verify user phone
Request: Path params: userId*
Response: 200 -> { id, email, firstName, lastName, phoneNumber, dateOfBirth, avatar, role, status, isEmailVerified, isPhoneVerified, emailVerifiedAt, phoneVerifiedAt, language, timezone, notificationsEnabled, createdAt, updatedAt, lastLoginAt }
Errors: 404
Rate Limits: Not specified

**Wallet**

Endpoint: GET /api/wallet/{userId}/balance
Role Access: ADMIN, BUYER, SELLER
Purpose: Get wallet balance
Request: Path params: userId*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/wallet/{userId}/credit
Role Access: ADMIN, BUYER, SELLER
Purpose: Credit wallet
Request: Path params: userId* | Body { amount* }
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/wallet/{userId}/debit
Role Access: ADMIN, BUYER, SELLER
Purpose: Debit wallet
Request: Path params: userId* | Body { amount* }
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/wallet/{userId}/hold/{holdId}/capture
Role Access: ADMIN, BUYER, SELLER
Purpose: Capture hold
Request: Path params: userId*, holdId*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/wallet/{userId}/hold/{holdId}/release
Role Access: ADMIN, BUYER, SELLER
Purpose: Release hold
Request: Path params: userId*, holdId*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/wallet/{userId}/hold
Role Access: ADMIN, BUYER, SELLER
Purpose: Place hold on funds
Request: Path params: userId*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/wallet/{userId}/payout
Role Access: ADMIN, ENABLER
Purpose: Initiate payout
Request: Path params: userId*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/wallet/{userId}/statement
Role Access: ADMIN, BUYER, SELLER
Purpose: Get wallet statement
Request: Path params: userId*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: POST /api/wallet/{userId}/topup
Role Access: ADMIN, BUYER, SELLER
Purpose: Top up wallet
Request: Path params: userId*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

Endpoint: GET /api/wallet/{userId}
Role Access: ADMIN, BUYER, SELLER
Purpose: Get wallet
Request: Path params: userId*
Response: 200 -> Not specified
Errors: None specified
Rate Limits: Not specified

**Frontend Architecture**

Application layout system:
- Global app shell with persistent left navigation on desktop and bottom navigation on mobile.
- Top bar with search, notifications, quick actions, and role switcher for multi-role users.
- Contextual right panel for order details, pricing breakdowns, and support threads.

Navigation model:
- Role-based navigation with shared core routes and role-specific sections.
- Feature flags driven by backend permissions and KYC state.

Routing structure:
- `/auth/login`
- `/auth/register`
- `/auth/forgot-password`
- `/auth/reset-password`
- `/dashboard`
- `/catalog`
- `/catalog/:productId`
- `/catalog/search`
- `/pricing/estimate`
- `/orders`
- `/orders/:orderId`
- `/checkout/:checkoutId`
- `/payments/:paymentId`
- `/wallet`
- `/logistics/tracking/:trackingNumber`
- `/notifications`
- `/support/tickets`
- `/support/tickets/:ticketId`
- `/community`
- `/training`
- `/settings`
- `/admin`

Role dashboards:
- Buyer dashboard focuses on discovery, reorder, and order tracking.
- Seller dashboard focuses on sales performance, order queue, and product health.
- Supplier dashboard focuses on inventory supply, production capacity, and logistics.
- Admin dashboard focuses on platform health, approvals, and risk monitoring.

Navigation maps:
Buyer navigation:
- Dashboard, Catalog, Orders, Payments, Wallet, Notifications, Support, Settings.
Seller navigation:
- Dashboard, Products, Pricing, Orders, Inventory, Storefront, Analytics, Support, Settings.
Supplier navigation:
- Dashboard, Supply Catalog, Supply Orders, Production, Logistics, Inventory, Pricing, Analytics, Support, Settings.
Admin navigation:
- Dashboard, Users, Compliance, Orders, Payments, Products, Analytics, Notifications, System Settings, Support.

**Role-Based UX Systems**

**Buyer Experience**
Buyer goals:
- Discover products and compare pricing.
- Place and track orders.
- Manage payments and wallet.
- Resolve support issues quickly.

Buyer dashboard components:
- Recommended products based on purchase history.
- Recent orders with status timeline.
- Pricing insights and active promotions.
- Notifications and action-required alerts.
- Wallet balance and topup shortcut.

Buyer pages:
- Product discovery
- Product details
- Cart and checkout
- Orders list
- Order detail and tracking
- Payments
- Wallet
- Support tickets
- Profile and settings

Buyer page specifications:

Product discovery:
Layout: Search bar, filter panel, product grid, comparison drawer.
UI elements: Search input, category chips, price range, rating filter, seller filter.
User actions: Search, filter, compare, add to cart, save for later.
Interactions: Instant filter updates with debounced search.
Loading state: Product card skeletons with shimmer.
Empty state: Suggestions and category shortcuts.
Error state: Retry banner with last search preserved.

Product details:
Layout: Gallery left, product info right, pricing breakdown below.
UI elements: Variant selector, stock indicator, delivery estimate, seller info.
User actions: Add to cart, request quote, contact support.
Interactions: Variant change updates price and availability.
Loading state: Image placeholder and price skeleton.
Empty state: If product removed, show alternatives.
Error state: Inline banner and fallback to catalog.

Cart and checkout:
Layout: Cart list, totals sidebar, promo code, delivery options.
UI elements: Quantity steppers, remove item, save for later.
User actions: Update quantities, proceed to checkout, select payment method.
Interactions: Recalculate totals, MBV shortfall, and COD eligibility via pricing endpoint.
Loading state: Totals shimmer and disabled confirm button.
Empty state: Cart empty with recommended products.
Error state: Item availability errors inline; MBV failure should show "Add TZS X more to unlock delivery" and a pickup fallback.

Orders list:
Layout: Table or card list with status tabs.
UI elements: Status filters, order search, reorder action.
User actions: View order, reorder, contact support.
Interactions: Status change toasts and real-time updates.
Loading state: Table skeleton with row placeholders.
Empty state: No orders with CTA to browse catalog.
Error state: Retry and support link.

Order detail and tracking:
Layout: Order summary header, status timeline, item list, tracking map.
UI elements: COD status, OTP for COD where applicable, support link.
User actions: View tracking, raise dispute, download invoice.
Interactions: Auto-refresh tracking, step change animations.
Loading state: Timeline skeleton and map placeholder.
Empty state: Missing tracking data with refresh.
Error state: Tracking unavailable with fallback to support.

Payments and wallet:
Layout: Payment history, pending payments, wallet balance.
UI elements: Pay now button, topup modal, refund status.
User actions: Initiate payment, check status, topup wallet.
Interactions: Optimistic payment status updates.
Loading state: Transaction list skeleton.
Empty state: No transactions with guidance.
Error state: Payment failed with retry and support.

Support tickets:
Layout: Ticket list with status filters, details panel.
UI elements: New ticket form, message thread, attachments.
User actions: Create ticket, add message, close ticket.
Interactions: Real-time message append via polling.
Loading state: Thread skeleton.
Empty state: No tickets with CTA to create.
Error state: Submission errors inline.

**Seller Experience**
Seller tasks:
- Manage products, pricing, and storefront.
- Process orders and handle disputes.
- Manage inventory availability.
- Communicate with buyers and support.
- Analyze performance and revenue.

Seller dashboard components:
- Sales summary and revenue trends.
- Order queue with fulfillment SLA.
- Product health score and publish status.
- Pricing recommendations and margin alerts.
- Inventory warnings and reorder suggestions.

Seller pages:
- Seller dashboard
- Product management
- Pricing engine
- Order management
- Inventory and stock
- Analytics
- Storefront
- Support tickets
- Profile and settings

Seller page specifications:

Product management:
Layout: Product list with bulk actions, detail drawer.
UI elements: Status tabs, bulk publish, import/export, variant editor.
User actions: Create, edit, publish, archive, bulk update.
Interactions: Inline edits with autosave drafts.
Loading state: Table skeleton and drawer placeholder.
Empty state: No products with CTA to create.
Error state: Validation error summary pinned to top.

Pricing engine:
Layout: Pricing rules list, calculator panel, analytics summary.
UI elements: Rule builder, margin slider, price simulation.
User actions: Create rule, run calculation, apply rule.
Interactions: Live preview of price impact.
Loading state: Calculation spinner with progress.
Empty state: No rules with example templates.
Error state: Rule conflicts highlighted.

Order management:
Layout: Order list with filters, batch actions.
UI elements: Status filters, fulfillment actions, dispute flags.
User actions: Accept order, update status, print labels.
Interactions: Status transitions with confirmation.
Loading state: Order list skeleton.
Empty state: No orders with onboarding tips.
Error state: Failed status update with retry.

Inventory and stock:
Layout: SKU list with stock columns and alerts.
UI elements: Stock thresholds, bulk update, low-stock badges.
User actions: Adjust stock, set thresholds, pause listing.
Interactions: Immediate warning when stock below threshold.
Loading state: Table skeleton.
Empty state: No SKUs with CTA to add variants.
Error state: Stock update errors inline.

Storefront:
Layout: Preview + publish controls.
UI elements: Share URL, featured products, branding.
User actions: Update branding, share storefront.
Interactions: Preview updates on change.
Loading state: Preview skeleton.
Empty state: No products yet.
Error state: Share URL generation failure.

Analytics:
Layout: KPI cards, charts, downloadable reports.
UI elements: Time range selector, export CSV.
User actions: Filter, export, compare periods.
Interactions: Animated chart transitions.
Loading state: KPI skeletons.
Empty state: Not enough data notice.
Error state: Analytics fetch errors with retry.

**Supplier Experience**
Supplier tasks:
- Manage supply catalog and inventory.
- Accept supply requests and schedule production.
- Track shipments and delivery status.
- Manage pricing agreements.

Supplier dashboard components:
- Supply order pipeline.
- Production capacity and backlog.
- Inventory availability and alerts.
- Logistics status and tracking.
- Revenue and payout summary.

Supplier pages:
- Supplier dashboard
- Supply catalog
- Supply orders
- Production plans
- Logistics
- Inventory and stock
- Pricing agreements
- Analytics
- Support tickets
- Profile and settings

Supplier page specifications:

Supply catalog:
Layout: Supplier product list with availability and MOQ.
UI elements: MOQ editor, lead time, capacity status.
User actions: Update availability, adjust lead times.
Interactions: Capacity calculation preview.
Loading state: List skeleton.
Empty state: No supply items with CTA to add.
Error state: Save failure with inline errors.

Supply orders:
Layout: Order queue, acceptance panel.
UI elements: Accept or reject, ETA picker, logistics link.
User actions: Confirm supply, update status.
Interactions: Status changes reflected in tracking.
Loading state: Queue skeleton.
Empty state: No supply orders.
Error state: Status update failure.

Production plans:
Layout: Gantt-style plan list and status controls.
UI elements: Plan creation modal, status dropdowns, checkpoints.
User actions: Create plan, update status, add quality checkpoint.
Interactions: Status badges and notifications.
Loading state: Plan list skeleton.
Empty state: No plans with CTA.
Error state: Plan creation errors.

Logistics:
Layout: Delivery list, route summary, tracking panel.
UI elements: Route optimization trigger, delivery status.
User actions: Monitor deliveries, update handoff.
Interactions: Real-time tracking updates.
Loading state: Tracking map placeholder.
Empty state: No active deliveries.
Error state: Map failure with retry.

Analytics:
Layout: KPI cards for fulfillment time, capacity, and revenue.
UI elements: Time range, export.
User actions: Filter and export.
Interactions: Chart transitions.
Loading state: KPI skeletons.
Empty state: Insufficient data.
Error state: Retry with error banner.

**Admin Experience**
Admin tasks:
- Manage users and roles.
- Approve KYC and compliance decisions.
- Monitor platform analytics, fraud, and disputes.
- Oversee orders, payments, and system health.

Admin dashboard components:
- System health and module status.
- Pending approvals and risk alerts.
- Orders and payments monitoring.
- Compliance metrics and audit logs.
- User growth and role distribution.

Admin pages:
- Admin dashboard
- User management
- Role and permissions management
- Compliance and KYC review
- Orders monitoring
- Payment monitoring and refunds
- Product moderation
- Platform analytics
- Notification control center
- System settings
- Support ticket management

Admin page specifications:

User management:
Layout: User list with filters, profile drawer.
UI elements: Role change controls, status badges, audit trail.
User actions: Search, change role, suspend, verify.
Interactions: Confirmation dialogs for role changes.
Loading state: Table skeleton.
Empty state: No results.
Error state: Action failure with audit message.

Compliance and KYC review:
Layout: Queue of pending reviews, detail panel.
UI elements: Document viewer, decision buttons, risk score.
User actions: Approve, reject, request more info.
Interactions: Decision triggers notifications.
Loading state: Document preview placeholder.
Empty state: No pending reviews.
Error state: Decision submission failure.

Orders and disputes:
Layout: Global orders view with dispute queue.
UI elements: Dispute resolution panel, status override.
User actions: Resolve dispute, adjust status.
Interactions: Audit log updates.
Loading state: Table skeleton.
Empty state: No disputes.
Error state: Conflict or permission errors.

Notification control center:
Layout: Templates list and delivery metrics.
UI elements: SMS stats, broadcast composer.
User actions: Send broadcast, retry failed, view status.
Interactions: Delivery progress updates.
Loading state: Metrics skeleton.
Empty state: No notifications yet.
Error state: Provider failures with retry.

**User Journey Mapping**
Buyer purchasing flow:
1. Landing page
2. Browse catalog
3. Apply filters and search
4. View product details
5. Add to cart
6. Checkout initiation
7. Payment selection and confirmation
8. Order confirmation
9. Track delivery
10. Post-delivery review or support

Seller fulfillment flow:
1. Login and dashboard
2. Review order queue
3. Confirm availability
4. Update order status
5. Handover to logistics
6. Monitor delivery
7. Handle disputes if any

Supplier production flow:
1. Review supply order
2. Accept and set ETA
3. Create production plan
4. Record quality checkpoints
5. Dispatch goods
6. Track delivery completion

Admin approval flow:
1. View pending KYC or compliance queue
2. Inspect documents and risk score
3. Approve or reject
4. Trigger user notification
5. Audit log entry

**Interaction Design**
Loading states:
- Use skeleton loaders for lists, cards, and charts.
- Disable primary actions while server-side validation is in progress.

Success states:
- Provide confirmation banners and inline checkmarks for completed actions.
- Show next-step guidance after order creation or KYC submission.

Error states:
- Inline validation errors for forms.
- Global error banner for failed network calls with retry.
- Permission errors should suggest the correct role or request access.

Empty states:
- Show primary CTA and suggested content.
- Provide sample templates for pricing rules and products.

Real-time updates:
- Poll order status and logistics tracking every 30 to 60 seconds.
- Use incremental updates for notification status changes.

**UX Optimization**
Smart features:
- Global search with role-aware results.
- Predictive suggestions for reorder and price adjustments.
- Bulk editing with CSV import/export for products and inventory.
- Keyboard shortcuts for power actions in tables.
- Smart defaults for pricing and shipping based on history.

**Data Visualization**
Buyer analytics:
- Order spend over time and delivery SLA compliance.

Seller analytics:
- Revenue trends, top products, conversion rate, pricing margin impact.

Supplier analytics:
- Capacity utilization, on-time delivery rate, quality checkpoint pass rate.

Admin analytics:
- User growth by role, dispute rate, payment failure rate, compliance backlog.

**Notification System**
Unified notification channels:
- In-app notifications list and badge counter.
- Email triggers for critical events.
- SMS triggers for order status and COD OTP.

Notification triggers:
- Order created, shipped, delivered.
- Payment success, failure, refund.
- Low stock, pricing rule conflicts.
- Support ticket updates.
- Compliance approval or rejection.

**Messaging System**
Backend messaging exists as support ticket threads and messages. No dedicated buyer-seller chat endpoints are defined in the API contract.
Design:
- Support ticket thread UI with message status indicators and attachments.
- Escalation path to admin support for disputes.
- Use role-aware labels for participants.

**Permissions Handling in UI**
- Hide navigation items that are not permitted for the current role.
- Disable actions when KYC status is pending or rejected.
- Guard routes and show access denied pages for unauthorized access.
- Support multi-role users with a role switcher and clear context labels.

**Performance Strategy**
- Use pagination and cursor-based loading for lists.
- Cache catalog search results and invalidate on filters.
- Use optimistic updates for status changes and comments.
- Lazy load heavy charts and maps.

**Accessibility**
- Full keyboard navigation for tables and forms.
- ARIA labels for icons and status badges.
- Color contrast ratio at least 4.5:1.
- Focus states visible for all interactive elements.

**Responsive Design**
Desktop:
- Persistent left navigation and data-dense tables.

Tablet:
- Collapsible navigation and two-column layouts.

Mobile:
- Bottom navigation, stacked cards, and simplified filters.

**UI Design System**
Typography:
- Headings: Space Grotesk, 32/24/20 sizes, 700 weight.
- Body: Source Sans 3, 16/14 sizes, 400 weight.

Color palette:
- Primary: #1B5E20
- Secondary: #0D47A1
- Success: #2E7D32
- Warning: #F57C00
- Danger: #C62828
- Surface: #FFFFFF
- Background: #F3F5F7
- Text primary: #1A1A1A
- Text secondary: #5A5F66

Core components:
- Buttons: primary, secondary, outline, destructive.
- Cards: summary, detail, alert.
- Tables: sortable, filterable, bulk select.
- Modals: confirm, form, preview.
- Forms: text, select, date, file upload with validation.
- Dropdowns: searchable, multi-select.
- Notifications: toast and in-page alert blocks.

**Edge Cases**
- Failed payments: keep order in pending and allow retry.
- Cancelled orders: reflect status and stop fulfillment actions.
- Network loss: offline banner and retry queue.
- Partial data: show placeholders and explain missing fields.
- Unauthorized actions: show role requirement and request access CTA.
- Expired sessions: redirect to login with recovery of unsaved work.

**Deliverables**
This guide provides:
- Full UX architecture and routing.
- Role-based UI structures and page inventory.
- Navigation maps and journeys.
- Interaction states and component system.
- Error handling and performance guidelines.
