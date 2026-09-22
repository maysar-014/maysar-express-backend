# Verified Endpoint Sweep — Analysis Report

Evidence source: `docs/FLOWS/_verification/raw/*.json` (563 OpenAPI operations, live server).

## Status distribution

| Status | Count |
| --- | --- |
| VERIFIED_READ | 203 |
| VERIFIED_VALIDATION | 143 |
| RESOURCE_ABSENT | 101 |
| PERMISSION_BOUNDARY | 42 |
| AUTH_BLOCKED | 33 |
| VERIFIED_WRITE | 27 |
| FAILING_5XX | 6 |
| METHOD_NOT_ALLOWED | 6 |
| REDIRECT | 2 |

## FAILING — 5xx server errors (6)

| Method | Path | Role | Anon | Authed | Response body |
| --- | --- | --- | --- | --- | --- |
| PATCH | `/api/analytics/action-items/{actionId}/resolve` | buyer | 401 | 500 | {"error":"Failed to resolve action item"} |
| DELETE | `/api/catalog/v1/admin/buy-box/anomaly-flags/{flagId}` | admin | 401 | 500 | {"success":false,"error":{"code":"INTERNAL_ERROR","message":"An internal error occurred."}} |
| GET | `/api/enabler/enablers/{id}` | enabler | 401 | 500 | {"error":"\nInvalid `prisma.enabler_Profile.findUnique()` invocation in\nC:\\Users\\abdal\\Desktop\\maysar-express-backend\\services\\enabler-service\ |
| GET | `/api/payment/payments/{id}` | buyer | 401 | 500 | {"success":false,"error":"Internal server error","message":"\nInvalid `this.paymentDelegate.findUnique()` invocation in\nC:\\Users\\abdal\\Desktop\\ma |
| GET | `/api/payment/payments/{id}/status` | buyer | 401 | 500 | {"success":false,"error":"Internal server error"} |
| GET | `/api/payment/payments/order/{orderId}` | buyer | 401 | 500 | {"success":false,"error":"Internal server error","message":"\nInvalid `this.paymentDelegate.findFirst()` invocation in\nC:\\Users\\abdal\\Desktop\\may |

## UNREACHABLE — connection failures (0)

_None._

## AUTH BLOCKED — token accepted by login but rejected (33)

| Method | Path | Role | Anon | Authed | Response body |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/auth/refresh` | buyer | 401 | 401 | {"success":false,"message":"Refresh token required"} |
| POST | `/api/auth/system/maintenance/cleanup/auth` | admin | 401 | 401 | {"success":false,"error":{"code":"MISSING_SERVICE_KEY","message":"Service key required"}} |
| POST | `/api/auth/system/maintenance/cleanup/auth/report` | admin | 401 | 401 | {"success":false,"error":{"code":"MISSING_SERVICE_KEY","message":"Service key required"}} |
| POST | `/api/auth/system/maintenance/cleanup/outbox` | admin | 401 | 401 | {"success":false,"error":{"code":"MISSING_SERVICE_KEY","message":"Service key required"}} |
| POST | `/api/auth/system/maintenance/cleanup/outbox/report` | admin | 401 | 401 | {"success":false,"error":{"code":"MISSING_SERVICE_KEY","message":"Service key required"}} |
| POST | `/api/business-registry/system/maintenance/cleanup/outbox/report` | admin | 401 | 401 | {"success":false,"error":"Service key required"} |
| POST | `/api/business-registry/system/maintenance/cleanup/outbox` | admin | 401 | 401 | {"success":false,"error":"Service key required"} |
| POST | `/api/checkout/system/maintenance/cleanup/checkout-sessions` | admin | 401 | 401 | {"success":false,"error":"Service key required"} |
| POST | `/api/checkout/system/maintenance/cleanup/checkout-sessions/report` | admin | 401 | 401 | {"success":false,"error":"Service key required"} |
| POST | `/api/community/system/maintenance/cleanup/outbox` | admin | 401 | 401 | {"success":false,"error":"Service key required"} |
| POST | `/api/community/system/maintenance/cleanup/outbox/report` | admin | 401 | 401 | {"success":false,"error":"Service key required"} |
| POST | `/api/enabler/system/maintenance/cleanup/outbox/report` | admin | 401 | 401 | {"success":false,"error":"Service key required"} |
| POST | `/api/enabler/system/maintenance/cleanup/outbox` | admin | 401 | 401 | {"success":false,"error":"Service key required"} |
| POST | `/api/inventory/system/maintenance/cleanup/outbox` | admin | 401 | 401 | {"success":false,"error":"Service key required"} |
| POST | `/api/inventory/system/maintenance/cleanup/outbox/report` | admin | 401 | 401 | {"success":false,"error":"Service key required"} |
| POST | `/api/logistics/system/maintenance/cleanup/outbox` | admin | 401 | 401 | {"success":false,"error":"Service key required"} |
| POST | `/api/logistics/system/maintenance/cleanup/outbox/report` | admin | 401 | 401 | {"success":false,"error":"Service key required"} |
| POST | `/api/notification/system/maintenance/cleanup/sms` | admin | 401 | 401 | {"success":false,"error":"Service key required"} |
| POST | `/api/notification/system/maintenance/cleanup/sms/report` | admin | 401 | 401 | {"success":false,"error":"Service key required"} |
| POST | `/api/order/system/maintenance/cleanup/outbox` | admin | 401 | 401 | {"success":false,"error":"Service key required"} |
| POST | `/api/order/system/maintenance/cleanup/outbox/report` | admin | 401 | 401 | {"success":false,"error":"Service key required"} |
| POST | `/api/payment/system/maintenance/cleanup/outbox` | admin | 401 | 401 | {"success":false,"error":"Service key required"} |
| POST | `/api/payment/system/maintenance/cleanup/outbox/report` | admin | 401 | 401 | {"success":false,"error":"Service key required"} |
| POST | `/api/payout/system/maintenance/cleanup/outbox` | admin | 401 | 401 | {"success":false,"error":"Service key required"} |
| POST | `/api/payout/system/maintenance/cleanup/outbox/report` | admin | 401 | 401 | {"success":false,"error":"Service key required"} |
| POST | `/api/support/system/maintenance/cleanup/outbox` | admin | 401 | 401 | {"success":false,"error":"Service key required"} |
| POST | `/api/support/system/maintenance/cleanup/outbox/report` | admin | 401 | 401 | {"success":false,"error":"Service key required"} |
| POST | `/api/user/system/maintenance/cleanup/outbox` | admin | 401 | 401 | {"success":false,"error":"Service key required"} |
| POST | `/api/user/system/maintenance/cleanup/outbox/report` | admin | 401 | 401 | {"success":false,"error":"Service key required"} |
| POST | `/api/wallet/system/maintenance/cleanup/idempotency` | admin | 401 | 401 | {"success":false,"error":"Service key required"} |
| POST | `/api/wallet/system/maintenance/cleanup/idempotency/report` | admin | 401 | 401 | {"success":false,"error":"Service key required"} |
| POST | `/api/wallet/system/maintenance/cleanup/outbox` | admin | 401 | 401 | {"success":false,"error":"Service key required"} |
| POST | `/api/wallet/system/maintenance/cleanup/outbox/report` | admin | 401 | 401 | {"success":false,"error":"Service key required"} |

## PERMISSION BOUNDARY — 403 for selected role (42)

| Method | Path | Role | Anon | Authed | Response body |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/auth/2fa/enable` | buyer | 403 | 403 | {"success":false,"message":"CSRF token missing"} |
| POST | `/api/auth/2fa/disable` | buyer | 403 | 403 | {"success":false,"message":"CSRF token missing"} |
| PUT | `/api/business-registry/businesses/{id}` | buyer | 401 | 403 | {"success":false,"error":{"code":"UNAUTHORIZED","message":"User ID (x-user-id header) is required for update"}} |
| PUT | `/api/business-registry/{id}` | buyer | 401 | 403 | {"success":false,"error":{"code":"UNAUTHORIZED","message":"User ID (x-user-id header) is required for update"}} |
| POST | `/api/catalog/campaigns` | buyer | 401 | 403 | {"success":false,"error":{"code":"FORBIDDEN","message":"Insufficient permissions"}} |
| PUT | `/api/catalog/campaigns/{id}` | buyer | 401 | 403 | {"success":false,"error":{"code":"FORBIDDEN","message":"Insufficient permissions"}} |
| POST | `/api/catalog/campaigns/{id}/complete` | buyer | 401 | 403 | {"success":false,"error":{"code":"FORBIDDEN","message":"Insufficient permissions"}} |
| POST | `/api/catalog/campaigns/{id}/launch` | buyer | 401 | 403 | {"success":false,"error":{"code":"FORBIDDEN","message":"Insufficient permissions"}} |
| POST | `/api/catalog/campaigns/{id}/pause` | buyer | 401 | 403 | {"success":false,"error":{"code":"FORBIDDEN","message":"Insufficient permissions"}} |
| POST | `/api/catalog/campaigns/{id}/resume` | buyer | 401 | 403 | {"success":false,"error":{"code":"FORBIDDEN","message":"Insufficient permissions"}} |
| POST | `/api/catalog/campaigns/{id}/cancel` | buyer | 401 | 403 | {"success":false,"error":{"code":"FORBIDDEN","message":"Insufficient permissions"}} |
| POST | `/api/catalog/v1/categories` | buyer | 401 | 403 | {"success":false,"error":{"code":"FORBIDDEN","message":"Insufficient permissions"}} |
| PUT | `/api/catalog/v1/categories/{id}` | buyer | 401 | 403 | {"success":false,"error":{"code":"FORBIDDEN","message":"Insufficient permissions"}} |
| DELETE | `/api/catalog/v1/categories/{id}` | buyer | 401 | 403 | {"success":false,"error":{"code":"FORBIDDEN","message":"Insufficient permissions"}} |
| POST | `/api/catalog/v1/pricing/bulk-update` | buyer | 401 | 403 | {"success":false,"error":{"code":"FORBIDDEN","message":"Insufficient permissions"}} |
| POST | `/api/catalog/v1/pricing/rules` | buyer | 401 | 403 | {"success":false,"error":{"code":"FORBIDDEN","message":"Insufficient permissions"}} |
| POST | `/api/catalog/v1/products` | buyer | 401 | 403 | {"success":false,"error":{"code":"FORBIDDEN","message":"Insufficient permissions"}} |
| PUT | `/api/catalog/v1/products/{id}` | buyer | 401 | 403 | {"success":false,"error":{"code":"FORBIDDEN","message":"Insufficient permissions"}} |
| DELETE | `/api/catalog/v1/products/{id}` | buyer | 401 | 403 | {"success":false,"error":{"code":"FORBIDDEN","message":"Insufficient permissions"}} |
| PUT | `/api/catalog/v1/products/{id}/category` | buyer | 401 | 403 | {"success":false,"error":{"code":"FORBIDDEN","message":"Insufficient permissions"}} |
| POST | `/api/catalog/v1/products/{id}/media` | buyer | 401 | 403 | {"success":false,"error":{"code":"FORBIDDEN","message":"Insufficient permissions"}} |
| POST | `/api/catalog/v1/products/{id}/publish` | buyer | 401 | 403 | {"success":false,"error":{"code":"FORBIDDEN","message":"Insufficient permissions"}} |
| PUT | `/api/catalog/v1/products/{productId}/pricing` | buyer | 401 | 403 | {"success":false,"error":{"code":"FORBIDDEN","message":"Insufficient permissions"}} |
| POST | `/api/catalog/v1/products/bulk` | buyer | 401 | 403 | {"success":false,"error":{"code":"FORBIDDEN","message":"Insufficient permissions"}} |
| PUT | `/api/catalog/v1/products/bulk` | buyer | 401 | 403 | {"success":false,"error":{"code":"FORBIDDEN","message":"Insufficient permissions"}} |
| DELETE | `/api/catalog/v1/products/bulk` | buyer | 401 | 403 | {"success":false,"error":{"code":"FORBIDDEN","message":"Insufficient permissions"}} |
| POST | `/api/catalog/v1/products/{id}/unpublish` | buyer | 401 | 403 | {"success":false,"error":{"code":"FORBIDDEN","message":"Insufficient permissions"}} |
| POST | `/api/catalog/v1/products/preview-description` | buyer | 401 | 403 | {"success":false,"error":{"code":"FORBIDDEN","message":"Insufficient permissions"}} |
| PUT | `/api/catalog/v1/reviews/{reviewId}/moderate` | buyer | 401 | 403 | {"success":false,"error":{"code":"FORBIDDEN","message":"Insufficient permissions"}} |
| GET | `/api/chat/v1/conversations/{id}/messages` | buyer+admin | 401 | 403 | {"success":false,"error":{"code":"CHAT_ACCESS_DENIED","message":"Access denied to this conversation"}} |
| POST | `/api/chat/v1/conversations/{id}/mute` | buyer | 401 | 403 | {"success":false,"error":{"code":"CHAT_ACCESS_DENIED","message":"Access denied to this conversation"}} |
| DELETE | `/api/chat/v1/conversations/{id}/mute` | buyer | 401 | 403 | {"success":false,"error":{"code":"CHAT_ACCESS_DENIED","message":"Access denied to this conversation"}} |
| PUT | `/api/chat/v1/conversations/{id}/read` | buyer | 401 | 403 | {"success":false,"error":{"code":"CHAT_ACCESS_DENIED","message":"Access denied to this conversation"}} |
| POST | `/api/payout/payouts` | buyer | 401 | 403 | {"success":false,"error":{"code":"FORBIDDEN","message":"Role buyer is not authorized for this operation","details":{"requiredRoles":["seller","supplie |
| POST | `/api/support/agents` | buyer | 401 | 403 | {"error":"Forbidden: Insufficient permissions"} |
| PUT | `/api/support/agents/{id}` | buyer | 401 | 403 | {"error":"Forbidden: Insufficient permissions"} |
| POST | `/api/support/disputes/{id}/escalate` | buyer | 401 | 403 | {"error":"Forbidden: Insufficient permissions"} |
| POST | `/api/support/tickets/{id}/assign` | buyer | 401 | 403 | {"error":"Forbidden: Insufficient permissions"} |
| POST | `/api/support/tickets/{id}/resolve` | buyer | 401 | 403 | {"error":"Forbidden: Insufficient permissions"} |
| GET | `/api/user/lookup` | buyer+admin | 403 | 403 | {"success":false,"error":{"code":"FORBIDDEN","message":"Internal endpoint"}} |
| GET | `/api/user/search` | buyer+admin | 403 | 403 | {"success":false,"error":{"code":"FORBIDDEN","message":"Internal endpoint"}} |
| POST | `/api/wallet/wallets/{userId}/payout` | buyer | 401 | 403 | {"success":false,"error":{"code":"INSUFFICIENT_PERMISSIONS","message":"Insufficient permissions","timestamp":"2026-09-20T17:45:54.742Z","path":"/api/w |

## METHOD NOT ALLOWED — 405 (6)

| Method | Path | Role | Anon | Authed | Response body |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/business-registry/public` | buyer | 401 | 405 | {"error":"Method Not Allowed"} |
| POST | `/api/checkout/items` | buyer | 401 | 405 | {"error":"Method Not Allowed"} |
| PATCH | `/api/checkout/items` | buyer | 401 | 405 | {"error":"Method Not Allowed"} |
| DELETE | `/api/checkout/items` | buyer | 401 | 405 | {"error":"Method Not Allowed"} |
| POST | `/api/checkout/merge` | buyer | 401 | 405 | {"error":"Method Not Allowed"} |
| DELETE | `/api/checkout/{cartId}` | buyer | 401 | 405 | {"error":"Method Not Allowed"} |

## REDIRECT — 301/302 (2)

| Method | Path | Role | Anon | Authed | Response body |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/catalog/v1/search` | buyer | 301 | 301 | Moved Permanently. Redirecting to /api/catalog/v1/products/search?q= |
| GET | `/api/catalog/v1/search/products` | buyer | 301 | 301 | Moved Permanently. Redirecting to /api/catalog/v1/products/search |

## RESOURCE ABSENT (404) — count by module

Total: 101

| Method | Path | Example response |
| --- | --- | --- |
| GET | `/api/auth/session/{sessionId}` | {"success":false,"error":{"code":"SESSION_NOT_FOUND","message":"Session not found"}} |
| POST | `/api/business-registry` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route POST /api/business-registry not found","timestamp |
| GET | `/api/business-registry/businesses/{id}` | {"success":false,"error":{"code":"BUSINESS_NOT_FOUND","message":"Business not found"}} |
| DELETE | `/api/business-registry/businesses/{id}` | {"success":false,"error":{"code":"BUSINESS_NOT_FOUND","message":"Business not found"}} |
| GET | `/api/business-registry/businesses/{id}/documents` | {"success":false,"error":{"code":"BUSINESS_NOT_FOUND","message":"Business not found"}} |
| GET | `/api/business-registry/businesses/{id}/compliance-records` | {"success":false,"error":{"code":"BUSINESS_NOT_FOUND","message":"Business not found"}} |
| POST | `/api/business-registry/businesses/{id}/reactivate` | {"success":false,"error":{"code":"BUSINESS_NOT_FOUND","message":"Business not found"}} |
| GET | `/api/business-registry/businesses/industries/{industry}/sellers` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route GET /api/business-registry/businesses/industries/ |
| GET | `/api/business-registry/businesses/sellers/{sellerId}` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route GET /api/business-registry/businesses/sellers/usr |
| GET | `/api/business-registry/businesses/sellers/{sellerId}/industries` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route GET /api/business-registry/businesses/sellers/usr |
| GET | `/api/business-registry/industries/{industry}/sellers` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route GET /api/business-registry/industries/test-000/se |
| GET | `/api/business-registry/public/{id}` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route GET /api/business-registry/public/usr_01KRFXQZC36 |
| PUT | `/api/business-registry/public/{id}` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route PUT /api/business-registry/public/usr_01KRFXQZC36 |
| DELETE | `/api/business-registry/public/{id}` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route DELETE /api/business-registry/public/usr_01KRFXQZ |
| GET | `/api/business-registry/public/{id}/compliance-records` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route GET /api/business-registry/public/usr_01KRFXQZC36 |
| POST | `/api/business-registry/public/{id}/compliance-records` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route POST /api/business-registry/public/usr_01KRFXQZC3 |
| GET | `/api/business-registry/public/{id}/documents` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route GET /api/business-registry/public/usr_01KRFXQZC36 |
| POST | `/api/business-registry/public/{id}/documents` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route POST /api/business-registry/public/usr_01KRFXQZC3 |
| POST | `/api/business-registry/public/{id}/reactivate` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route POST /api/business-registry/public/usr_01KRFXQZC3 |
| POST | `/api/business-registry/public/{id}/suspend` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route POST /api/business-registry/public/usr_01KRFXQZC3 |
| POST | `/api/business-registry/public/{id}/verify` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route POST /api/business-registry/public/usr_01KRFXQZC3 |
| GET | `/api/business-registry/public/owner/{ownerId}` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route GET /api/business-registry/public/owner/usr_01KRF |
| GET | `/api/business-registry/public/search` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route GET /api/business-registry/public/search not foun |
| GET | `/api/business-registry/public/sellers/{sellerId}` | {"success":false,"error":{"code":"BUSINESS_NOT_FOUND","message":"Seller not found"}} |
| GET | `/api/business-registry/public/sellers/{sellerId}/industries` | {"success":false,"error":{"code":"BUSINESS_NOT_FOUND","message":"Seller not found"}} |
| GET | `/api/business-registry/sellers/{sellerId}` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route GET /api/business-registry/sellers/usr_01KRFZ1E5G |
| GET | `/api/business-registry/sellers/{sellerId}/industries` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route GET /api/business-registry/sellers/usr_01KRFZ1E5G |
| GET | `/api/business-registry/{id}/compliance-records` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route GET /api/business-registry/usr_01KRFXQZC36NK3CDEW |
| POST | `/api/business-registry/{id}/compliance-records` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route POST /api/business-registry/usr_01KRFXQZC36NK3CDE |
| GET | `/api/business-registry/{id}/documents` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route GET /api/business-registry/usr_01KRFXQZC36NK3CDEW |
| GET | `/api/business-registry/{id}` | {"success":false,"error":{"code":"BUSINESS_NOT_FOUND","message":"Business not found"}} |
| DELETE | `/api/business-registry/{id}` | {"success":false,"error":{"code":"BUSINESS_NOT_FOUND","message":"Business not found"}} |
| POST | `/api/business-registry/{id}/documents` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route POST /api/business-registry/usr_01KRFXQZC36NK3CDE |
| POST | `/api/business-registry/{id}/reactivate` | {"success":false,"error":{"code":"BUSINESS_NOT_FOUND","message":"Business not found"}} |
| GET | `/api/catalog/campaigns/{id}` | {"error":"Campaign with ID usr_01KRFXQZC36NK3CDEWJJS21RP8 not found"} |
| POST | `/api/catalog/match/confirm/{confirmationId}` | {"error":"Confirmation not found"} |
| POST | `/api/catalog/system/maintenance/cleanup/event-store/report` | {"success":false,"error":{"code":"NOT_FOUND","message":"Health endpoint /api/catalog/system/maintenance/cleanup/event-st |
| POST | `/api/catalog/system/maintenance/cleanup/event-store` | {"success":false,"error":{"code":"NOT_FOUND","message":"Health endpoint /api/catalog/system/maintenance/cleanup/event-st |
| POST | `/api/catalog/system/maintenance/cleanup/outbox` | {"success":false,"error":{"code":"NOT_FOUND","message":"Health endpoint /api/catalog/system/maintenance/cleanup/outbox n |
| POST | `/api/catalog/system/maintenance/cleanup/outbox/report` | {"success":false,"error":{"code":"NOT_FOUND","message":"Health endpoint /api/catalog/system/maintenance/cleanup/outbox/r |
| GET | `/api/catalog/v1/products/{id}` | {"success":false,"error":{"code":"NOT_FOUND","message":"Product not found"},"meta":{"timestamp":"2026-09-20T17:45:50.075 |
| GET | `/api/catalog/v1/products/{id}/metrics` | {"success":false,"error":{"code":"NOT_FOUND","message":"Product not found"},"meta":{"timestamp":"2026-09-20T17:45:50.144 |
| GET | `/api/catalog/v1/products/{id}/media` | {"success":false,"error":{"code":"NOT_FOUND","message":"Product not found"},"meta":{"timestamp":"2026-09-20T17:45:50.148 |
| GET | `/api/chat/v1/conversations/{id}` | {"success":false,"error":{"code":"CHAT_NOT_FOUND","message":"Conversation not found"}} |
| DELETE | `/api/chat/v1/conversations/{id}/messages/{messageId}` | {"success":false,"error":{"code":"CHAT_NOT_FOUND","message":"Message not found"}} |
| GET | `/api/checkout/current` | {"success":false,"error":{"code":"CHECKOUT_SESSION_NOT_FOUND","message":"Session not found"},"timestamp":"2026-09-20T17: |
| GET | `/api/checkout/{cartId}` | {"success":false,"error":{"code":"CHECKOUT_SESSION_NOT_FOUND","message":"Session not found"},"timestamp":"2026-09-20T17: |
| POST | `/api/checkout/{id}/confirm` | {"success":false,"error":{"code":"CHECKOUT_SESSION_NOT_FOUND","message":"Session not found"},"timestamp":"2026-09-20T17: |
| GET | `/api/checkout/{id}` | {"success":false,"error":{"code":"CHECKOUT_SESSION_NOT_FOUND","message":"Session not found"},"timestamp":"2026-09-20T17: |
| POST | `/api/commission/calculate` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route POST /api/commission/calculate not found","timest |
| GET | `/api/commission/health` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route GET /api/commission/health not found","timestamp" |
| GET | `/api/commission/health/live` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route GET /api/commission/health/live not found","times |
| GET | `/api/commission/health/ready` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route GET /api/commission/health/ready not found","time |
| GET | `/api/commission/sellers/{sellerId}` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route GET /api/commission/sellers/usr_01KRFZ1E5G6CWAQ4B |
| GET | `/api/commission/sellers/{sellerId}/summary` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route GET /api/commission/sellers/usr_01KRFZ1E5G6CWAQ4B |
| PUT | `/api/commission/{id}/approve` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route PUT /api/commission/usr_01KRFXQZC36NK3CDEWJJS21RP |
| GET | `/api/commission/{id}` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route GET /api/commission/usr_01KRFXQZC36NK3CDEWJJS21RP |
| GET | `/api/community/articles` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route GET /api/community/articles not found","timestamp |
| POST | `/api/community/articles` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route POST /api/community/articles not found","timestam |
| GET | `/api/community/articles/{articleId}` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route GET /api/community/articles/no-fixture not found" |
| POST | `/api/community/articles/{articleId}/publish` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route POST /api/community/articles/no-fixture/publish n |
| POST | `/api/community/articles/{articleId}/reviews` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route POST /api/community/articles/no-fixture/reviews n |
| GET | `/api/community/discover` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"User business profile not found","timestamp":"2026-09-2 |
| GET | `/api/community/knowledge/challenges` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route GET /api/community/knowledge/challenges not found |
| POST | `/api/community/knowledge/challenges` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route POST /api/community/knowledge/challenges not foun |
| POST | `/api/community/knowledge/challenges/{challengeId}/solutions` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route POST /api/community/knowledge/challenges/no-fixtu |
| GET | `/api/community/knowledge/discover` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route GET /api/community/knowledge/discover not found", |
| POST | `/api/community/knowledge/expertise/validate` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route POST /api/community/knowledge/expertise/validate  |
| GET | `/api/governance/constitution` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route GET /api/governance/constitution not found","time |
| GET | `/api/governance/dashboard` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route GET /api/governance/dashboard not found","timesta |
| GET | `/api/governance/reports/latest` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route GET /api/governance/reports/latest not found","ti |
| GET | `/api/governance/runs` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route GET /api/governance/runs not found","timestamp":" |
| GET | `/api/governance/runs/{runId}` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route GET /api/governance/runs/usr_01KRFXQZC36NK3CDEWJJ |
| GET | `/api/governance/runs/{runId}/evidence/{gateId}` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route GET /api/governance/runs/usr_01KRFXQZC36NK3CDEWJJ |
| POST | `/api/governance/runs` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route POST /api/governance/runs not found","timestamp": |
| GET | `/api/governance/summary` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route GET /api/governance/summary not found","timestamp |
| GET | `/api/inventory/stock/{variantId}` | {"error":"Stock not found","variantId":"usr_01KRFXQZC36NK3CDEWJJS21RP8","warehouseId":"all"} |
| GET | `/api/inventory/warehouses/{id}` | {"error":"Warehouse not found"} |
| GET | `/api/logistics/api/v1/routes/{routeId}` | {"success":false,"error":{"code":"ROUTE_NOT_FOUND","message":"Failed to find route"}} |
| GET | `/api/logistics/api/v1/routes/courier/{courierId}` | {"success":false,"error":{"code":"ROUTE_NOT_FOUND","message":"Failed to find routes"}} |
| GET | `/api/logistics/api/v1/routes` | {"success":false,"error":{"code":"ROUTE_NOT_FOUND","message":"Failed to find routes"}} |
| GET | `/api/notification/notifications/{id}` | {"success":false,"error":{"code":"NOT_FOUND","message":"Notification not found"}} |
| DELETE | `/api/notification/notifications/{id}` | {"success":false,"error":{"code":"NOT_FOUND","message":"Notification not found"}} |
| POST | `/api/notification/notifications/{id}/retry` | {"success":false,"error":{"code":"NOT_FOUND","message":"Notification usr_01KRFXQZC36NK3CDEWJJS21RP8 not found"}} |
| PATCH | `/api/notification/notifications/{id}/status` | {"success":false,"error":{"code":"NOT_FOUND","message":"Notification not found"}} |
| POST | `/api/notification/sms/retry/{messageId}` | {"messageId":"no-fixture","success":false,"newStatus":"NOT_FOUND","retryCount":0,"message":"Message not found"} |
| POST | `/api/notification/sms/webhook/africastalking` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route POST /api/notification/sms/webhook/africastalking |
| GET | `/api/notification/sms/status/{messageId}` | {"error":{"message":"SMS message not found: no-fixture","status":404,"timestamp":"2026-09-20T17:45:53.281Z","path":"/api |
| GET | `/api/notification/templates/{id}` | {"success":false,"error":{"code":"NOT_FOUND","message":"Template not found"}} |
| DELETE | `/api/notification/templates/{id}` | {"success":false,"error":{"code":"NOT_FOUND","message":"Template not found"}} |
| POST | `/api/notification/templates/{id}/render` | {"success":false,"error":{"code":"NOT_FOUND","message":"Template not found"}} |
| GET | `/api/order/orders/{id}` | {"error":"ORDER_NOT_FOUND","message":"Order with ID usr_01KRFXQZC36NK3CDEWJJS21RP8 not found"} |
| POST | `/api/payment/payments/webhooks/paymentGateway` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route POST /api/payment/payments/webhooks/paymentGatewa |
| POST | `/api/payment/webhooks/paymentGateway` | {"success":false,"error":{"code":"RESOURCE_NOT_FOUND","message":"Route POST /api/payment/webhooks/paymentGateway not fou |
| GET | `/api/payout/payouts/{id}` | {"success":false,"error":"Payout not found"} |
| POST | `/api/payout/payouts/{id}/cancel` | {"success":false,"error":"Payout not found"} |
| GET | `/api/support/disputes/{id}` | {"success":false,"error":"Dispute not found"} |
| GET | `/api/support/tickets/{id}` | {"success":false,"error":"Ticket not found: usr_01KRFXQZC36NK3CDEWJJS21RP8"} |
| POST | `/api/support/tickets/{id}/close` | {"success":false,"error":"Ticket not found: usr_01KRFXQZC36NK3CDEWJJS21RP8"} |
| GET | `/api/training/api/v1/modules/{id}` | {"error":"TrainingModule with identifier usr_01KRFXQZC36NK3CDEWJJS21RP8 was not found","timestamp":"2026-09-20T17:45:53. |
| GET | `/api/training/api/v1/modules/{id}/content` | {"error":"TrainingModule with identifier usr_01KRFXQZC36NK3CDEWJJS21RP8 was not found","timestamp":"2026-09-20T17:45:53. |
