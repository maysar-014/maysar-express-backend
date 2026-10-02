# Maysar Platform — Documentation Master Index

> **Last updated:** September 2026
> **Coverage:** All 21 service modules + shared libraries + frontend integration guides

This index is the single entry point for all Maysar platform documentation. Every service has two documents: a system reference (as-built implementation detail) and a frontend integration guide.

---

## Service Documentation

| Service | System Reference | Frontend Guide | Mount Path |
|---|---|---|---|
| Auth | [AUTH_SERVICE_SYSTEM.md](auth/AUTH_SERVICE_SYSTEM.md) | [AUTH_SERVICE_FRONTEND_GUIDE.md](auth/AUTH_SERVICE_FRONTEND_GUIDE.md) | `/api/auth` |
| User | [USER_SERVICE_SYSTEM.md](user/USER_SERVICE_SYSTEM.md) | [USER_SERVICE_FRONTEND_GUIDE.md](user/USER_SERVICE_FRONTEND_GUIDE.md) | `/api/user` |
| Wallet | [WALLET_SERVICE_SYSTEM.md](wallet/WALLET_SERVICE_SYSTEM.md) | [WALLET_SERVICE_FRONTEND_GUIDE.md](wallet/WALLET_SERVICE_FRONTEND_GUIDE.md) | `/api/wallet` |
| Order | [ORDER_SERVICE_SYSTEM.md](order/ORDER_SERVICE_SYSTEM.md) | [ORDER_SERVICE_FRONTEND_GUIDE.md](order/ORDER_SERVICE_FRONTEND_GUIDE.md) | `/api/order` |
| Payment | [PAYMENT_SERVICE_SYSTEM.md](payment/PAYMENT_SERVICE_SYSTEM.md) · [PAYMENT_SERVICE_ADMIN_GUIDE.md](payment/PAYMENT_SERVICE_ADMIN_GUIDE.md) · [PAYMENT_SERVICE_FRONTEND_GUIDE.md](payment/PAYMENT_SERVICE_FRONTEND_GUIDE.md) | `/api/payment` |
| Checkout | [CHECKOUT_SERVICE_SYSTEM.md](checkout/CHECKOUT_SERVICE_SYSTEM.md) | [CHECKOUT_SERVICE_FRONTEND_GUIDE.md](checkout/CHECKOUT_SERVICE_FRONTEND_GUIDE.md) | `/api/checkout` |
| Catalog | [CATALOG_SERVICE_SYSTEM.md](catalog/CATALOG_SERVICE_SYSTEM.md) | [CATALOG_SERVICE_FRONTEND_GUIDE.md](catalog/CATALOG_SERVICE_FRONTEND_GUIDE.md) | `/api/catalog` |
| Inventory | [INVENTORY_SERVICE_SYSTEM.md](inventory/INVENTORY_SERVICE_SYSTEM.md) | [INVENTORY_SERVICE_FRONTEND_GUIDE.md](inventory/INVENTORY_SERVICE_FRONTEND_GUIDE.md) | `/api/inventory` |
| Logistics | [LOGISTICS_IMPLEMENTATION.md](logistics/LOGISTICS_IMPLEMENTATION.md) | [LOGISTICS_SERVICE_FRONTEND_GUIDE.md](logistics/LOGISTICS_SERVICE_FRONTEND_GUIDE.md) | `/api/logistics` |
| Request | [REQUEST_SERVICE_SYSTEM.md](requests/REQUEST_SERVICE_SYSTEM.md) | [REQUEST_SERVICE_FRONTEND_GUIDE.md](requests/REQUEST_SERVICE_FRONTEND_GUIDE.md) | `/api/request` |
| Chat | [CHAT_SYSTEM.md](chat-system/CHAT_SYSTEM.md) | [CHAT_SERVICE_FRONTEND_GUIDE.md](chat/CHAT_SERVICE_FRONTEND_GUIDE.md) | `/api/chat/v1` |
| Notification | [NOTIFICATION_SERVICE_SYSTEM.md](notification/NOTIFICATION_SERVICE_SYSTEM.md) | [NOTIFICATION_SERVICE_FRONTEND_GUIDE.md](notification/NOTIFICATION_SERVICE_FRONTEND_GUIDE.md) | `/api/notification` |
| Enabler | [ENABLER_SERVICE_SYSTEM.md](enabler/ENABLER_SERVICE_SYSTEM.md) | [ENABLER_SERVICE_FRONTEND_GUIDE.md](enabler/ENABLER_SERVICE_FRONTEND_GUIDE.md) | `/api/enabler` |
| Commission | [COMMISSION_SERVICE_SYSTEM.md](commission/COMMISSION_SERVICE_SYSTEM.md) | [COMMISSION_SERVICE_FRONTEND_GUIDE.md](commission/COMMISSION_SERVICE_FRONTEND_GUIDE.md) | `/api/commission` |
| Payout | [PAYOUT_SERVICE_SYSTEM.md](payout/PAYOUT_SERVICE_SYSTEM.md) | [PAYOUT_SERVICE_FRONTEND_GUIDE.md](payout/PAYOUT_SERVICE_FRONTEND_GUIDE.md) | `/api/payout` |
| Analytics | [ANALYTICS_SERVICE_SYSTEM.md](analytics/ANALYTICS_SERVICE_SYSTEM.md) | [ANALYTICS_SERVICE_FRONTEND_GUIDE.md](analytics/ANALYTICS_SERVICE_FRONTEND_GUIDE.md) | `/api/analytics` |
| Support | [SUPPORT_SERVICE_SYSTEM.md](support/SUPPORT_SERVICE_SYSTEM.md) | [SUPPORT_SERVICE_FRONTEND_GUIDE.md](support/SUPPORT_SERVICE_FRONTEND_GUIDE.md) | `/api/support-service` |
| Training | [TRAINING_SERVICE_SYSTEM.md](training/TRAINING_SERVICE_SYSTEM.md) | [TRAINING_SERVICE_FRONTEND_GUIDE.md](training/TRAINING_SERVICE_FRONTEND_GUIDE.md) | `/api/training-service` |
| Production | [PRODUCTION_SERVICE_SYSTEM.md](production/PRODUCTION_SERVICE_SYSTEM.md) | [PRODUCTION_SERVICE_FRONTEND_GUIDE.md](production/PRODUCTION_SERVICE_FRONTEND_GUIDE.md) | `/api/production` |
| Community | [COMMUNITY_SERVICE_SYSTEM.md](community/COMMUNITY_SERVICE_SYSTEM.md) | [COMMUNITY_SERVICE_FRONTEND_GUIDE.md](community/COMMUNITY_SERVICE_FRONTEND_GUIDE.md) | `/api/community` |
| Business Registry | — | [BUSINESS_REGISTRY_SERVICE_FRONTEND_GUIDE.md](business-registry/BUSINESS_REGISTRY_SERVICE_FRONTEND_GUIDE.md) | `/api/business-registry-service` |
| Maps | — | [MAPS_SERVICE_FRONTEND_GUIDE.md](maps/MAPS_SERVICE_FRONTEND_GUIDE.md) | `/api/maps-service` |

---

## Existing Deep-Dive Documentation

These documents were created with full code-level depth and serve as the reference standard for all new service docs:

| Document | Description |
|---|---|
| [logistics/LOGISTICS_IMPLEMENTATION.md](logistics/LOGISTICS_IMPLEMENTATION.md) | Full logistics engine: 3-engine pricing, shipment/job state machines, fairness, pool optimization |
| [logistics/LOGISTICS_ENGINE_BACKLOG.md](logistics/LOGISTICS_ENGINE_BACKLOG.md) | 72-task engineering backlog (all completed) |
| [logistics/PER_SELLER_QUOTE_FLOW.md](logistics/PER_SELLER_QUOTE_FLOW.md) | Per-seller quote API sequence and failure modes |
| [requests/REQUEST_SERVICE_SYSTEM.md](requests/REQUEST_SERVICE_SYSTEM.md) | Request service: procurement-by-request, sourcing, access links |
| [requests/REQUEST_SERVICE_FRONTEND_GUIDE.md](requests/REQUEST_SERVICE_FRONTEND_GUIDE.md) | Request service frontend integration |
| [frontend/LOGISTICS_FRONTEND_INTEGRATION_GUIDE.md](frontend/LOGISTICS_FRONTEND_INTEGRATION_GUIDE.md) | Logistics frontend integration |
| [frontend/LOGISTICS_FRONTEND_UI_SPECIFICATIONS.md](frontend/LOGISTICS_FRONTEND_UI_SPECIFICATIONS.md) | Logistics UI specifications |
| [chat-system/CHAT_SYSTEM.md](chat-system/CHAT_SYSTEM.md) | Full chat system: WebSocket, message types, risk engine, media upload |

---

## Architecture & Cross-Cutting Concerns

| Document | Description |
|---|---|
| [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) | Architecture, local setup, adding modules |
| [architecture/system-architecture.md](architecture/system-architecture.md) | System architecture diagrams |
| [architecture/service-dependency-map.md](architecture/service-dependency-map.md) | Service dependency graph |
| [saga/SAGA_ORCHESTRATION_SYSTEM.md](saga/SAGA_ORCHESTRATION_SYSTEM.md) | Saga framework and orchestration |
| [event-bus/EVENT_BUS_ARCHITECTURE_DIAGRAM.md](event-bus/EVENT_BUS_ARCHITECTURE_DIAGRAM.md) | Event bus architecture |
| [security/README.md](security/README.md) | Security: CSRF, auth, rate limiting, secrets |
| [testing/E2E_TEST_CATALOG.md](testing/E2E_TEST_CATALOG.md) | E2E test catalog |
| [SYSTEM_ATLAS.md](SYSTEM_ATLAS.md) | Platform system atlas |

---

## Flow Documentation (Persona-Oriented)

| Document | Description |
|---|---|
| [Flow Docs/01-auth-and-access.md](Flow%20Docs/01-auth-and-access.md) | Auth and access flows |
| [Flow Docs/02-customer-journeys.md](Flow%20Docs/02-customer-journeys.md) | Buyer journey maps |
| [Flow Docs/03-seller-journeys.md](Flow%20Docs/03-seller-journeys.md) | Seller journey maps |
| [Flow Docs/04-supplier-journeys.md](Flow%20Docs/04-supplier-journeys.md) | Supplier journey maps |
| [Flow Docs/05-courier-journeys.md](Flow%20Docs/05-courier-journeys.md) | Courier journey maps |
| [Flow Docs/06-enabler-journeys.md](Flow%20Docs/06-enabler-journeys.md) | Enabler journey maps |
| [Flow Docs/07-admin-support-compliance.md](Flow%20Docs/07-admin-support-compliance.md) | Admin, support, compliance flows |
| [Flow Docs/08-platform-operations.md](Flow%20Docs/08-platform-operations.md) | Platform operations flows |

---

## Developer Training

| Document | Description |
|---|---|
| [developer-training/01-platform-orientation.md](developer-training/01-platform-orientation.md) | Platform orientation |
| [developer-training/02-local-setup.md](developer-training/02-local-setup.md) | Local development setup |
| [developer-training/03-module-architecture.md](developer-training/03-module-architecture.md) | Module architecture patterns |
| [developer-training/04-domain-application-infrastructure.md](developer-training/04-domain-application-infrastructure.md) | DDD layers |
| [developer-training/05-prisma-and-data-models.md](developer-training/05-prisma-and-data-models.md) | Prisma and data modeling |
| [developer-training/06-events-outbox-and-sagas.md](developer-training/06-events-outbox-and-sagas.md) | Events, outbox, sagas |
| [developer-training/07-security-auth-and-kyc.md](developer-training/07-security-auth-and-kyc.md) | Security, auth, KYC |
| [developer-training/08-testing-debugging.md](developer-training/08-testing-debugging.md) | Testing and debugging |

---

## Governance Documents

| Document | Description |
|---|---|
| [../architecture_constitution.md](../architecture_constitution.md) | Architectural governance rules |
| [../testing-constitution.md](../testing-constitution.md) | Testing standards |
| [../api-documentation-constitution.md](../api-documentation-constitution.md) | API documentation standards |
| [../performance_constitution.md](../performance_constitution.md) | Performance budgets and latency rules |
| [../integration_constitution.md](../integration_constitution.md) | Integration standards |

---

## Quick Reference: Common Integration Patterns

### Authentication pattern (all services)
```
Authorization: Bearer <accessToken>
```
Get token from `POST /api/auth/login`. Refresh via `POST /api/auth/refresh` on 401.

### Idempotency pattern (wallet, payment)
```
X-Idempotency-Key: <uuid-v4>
```
Generate once per user action. Retry with same key on network failure.

### Pagination pattern (all list endpoints)
```
GET /api/{service}/resource?limit=20&cursor=<opaque-cursor>
```
Use `nextCursor` from response for next page. Never use page numbers.

### Error envelope (all services)
```jsonc
{ "success": false, "error": { "code": "ERROR_CODE", "message": "Human readable" }, "timestamp": "ISO-8601" }
```

### Success envelope (all services)
```jsonc
{ "success": true, "data": { ... }, "timestamp": "ISO-8601" }
```

### COD trust tier limits (order service)
| Tier | Exposure limit | Concurrent orders |
|---|---|---|
| NEW_BUYER | TZS 30,000 | 1 |
| TRUSTED_BEGINNER | TZS 150,000 | 2 |
| TRUSTED_BUYER | TZS 500,000 | 3 |
| GOLD_BUYER | TZS 2,000,000 | 5 |
| PLATINUM_BUYER | TZS 10,000,000 | unlimited |
