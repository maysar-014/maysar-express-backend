# Operations Playbook (Comprehensive)

## Coverage

- Source: `postman/Maysar-Platform-E2E.postman_collection.json`
- Total operational requests covered: **219**
- Single entry point: `http://localhost:3000`
- Source-of-truth note: if a path below disagrees with the current service README or OpenAPI file, treat the service docs as current and regenerate this playbook next.
- This document provides step-by-step intent and response behavior for both happy and unhappy paths.

## Folder Coverage Summary

| Operation Group | Count |
|---|---:|
| 00 - Core Entry Point | 3 |
| 01 - Role Journeys (Register -> Login -> Operate -> Logout) | 144 |
| 02 - Authentication (Complete Endpoint Coverage) | 21 |
| 03 - Mounted Modules (Pass + Fail) | 23 |
| 04 - Unmounted Module Gap Checks (Expected 404) | 12 |
| 05 - Auth and Security Failures | 4 |
| 06 - Order and Catalog Failures | 4 |
| 07 - Notification and Enabler Failures | 3 |
| 08 - Regression Sentinels | 5 |

## Role Narratives (Step-by-Step Intent and Response)

KYC-gated roles: `SELLER`, `COURIER`, `SUPPLIER`, `ENABLER` (KYC submission -> admin approval -> verified check must pass before full role operations).

### BUYER - Full Supported Operations

Sequence length: **22** steps.

#### Step 1: CSRF Bootstrap

- User intent: CSRF Bootstrap.
- Request: `GET {{platform_base_url}}/health`.
- Happy path: 200 -> session bootstrap/csrf context is established.
- Unhappy path: 503: service degraded/unavailable.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 2: Register

- User intent: Register.
- Request: `POST {{platform_base_url}}/api/auth/register`.
- Happy path: 200 -> account is created and user identifier is captured.
- Unhappy path: 400: bad request / missing required fields; 409: conflict (duplicate or state conflict); 422: semantic validation failed; 429: rate limited; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 3: Login

- User intent: Login.
- Request: `POST {{platform_base_url}}/api/auth/login`.
- Happy path: 200 -> access token is issued and stored for subsequent calls.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 429: rate limited; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 4: Verify Session

- User intent: Verify Session.
- Request: `GET {{platform_base_url}}/api/auth/verify`.
- Happy path: 200 -> current session/token is confirmed as valid.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 5: Catalog Health

- User intent: Catalog Health.
- Request: `GET {{platform_base_url}}/api/catalog/health`.
- Happy path: 200 -> catalog module health is confirmed.
- Unhappy path: none expected by current contract (non-success responses indicate regression).
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 6: Catalog Pricing Calculate

- User intent: Catalog Pricing Calculate.
- Request: `POST {{platform_base_url}}/api/catalog/pricing/calculate`.
- Happy path: 200 -> auditable pricing result is returned.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 422: semantic validation failed; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 7: Order List

- User intent: Order List.
- Request: `GET {{platform_base_url}}/api/order/orders?buyerId={{role_buyer_user_id}}`.
- Happy path: 200 -> orders are listed for the given buyer context.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 500: internal service error; 503: service degraded/unavailable.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 8: Order Create

- User intent: Order Create.
- Request: `POST {{platform_base_url}}/api/order/orders`.
- Happy path: 200, 201 -> order is validated and persisted.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 422: semantic validation failed; 500: internal service error; 503: service degraded/unavailable.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 9: Order Analytics

- User intent: Order Analytics.
- Request: `GET {{platform_base_url}}/api/order/orders/analytics/stats`.
- Happy path: 200 -> aggregated order analytics are returned.
- Unhappy path: 401: authentication required/invalid token; 403: authenticated but not authorized; 500: internal service error; 503: service degraded/unavailable.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 10: Notification Health

- User intent: Notification Health.
- Request: `GET {{platform_base_url}}/api/notification/health`.
- Happy path: 200 -> notification module health is confirmed.
- Unhappy path: none expected by current contract (non-success responses indicate regression).
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 11: Notification SMS Statistics

- User intent: Notification SMS Statistics.
- Request: `GET {{platform_base_url}}/api/notification/sms/statistics`.
- Happy path: 200 -> sms metrics are returned.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 12: Notification SMS Send

- User intent: Notification SMS Send.
- Request: `POST {{platform_base_url}}/api/notification/sms/send`.
- Happy path: 200, 201 -> sms delivery request is accepted.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 422: semantic validation failed; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 13: Enabler Hub Products

- User intent: Enabler Hub Products.
- Request: `GET {{platform_base_url}}/api/enabler/hub/products`.
- Happy path: 200 -> endpoint-specific action is executed and response contract is validated.
- Unhappy path: 401: authentication required/invalid token; 403: authenticated but not authorized; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 14: Enabler Register Reachability

- User intent: Enabler Register Reachability.
- Request: `POST {{platform_base_url}}/api/enabler/enablers/register`.
- Happy path: 200, 201 -> account is created and user identifier is captured.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 422: semantic validation failed; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 15: Maps Health

- User intent: Maps Health.
- Request: `GET {{platform_base_url}}/api/maps/health`.
- Happy path: 200 -> maps service state is reported.
- Unhappy path: 503: service degraded/unavailable.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 16: Maps Ready

- User intent: Maps Ready.
- Request: `GET {{platform_base_url}}/api/maps/health/ready`.
- Happy path: 200 -> maps service state is reported.
- Unhappy path: 503: service degraded/unavailable.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 17: Compliance Verify Document

- User intent: Compliance Verify Document.
- Request: `POST {{platform_base_url}}/api/compliance/api/compliance/verify-document`.
- Happy path: 200 -> compliance verification flow is triggered.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 422: semantic validation failed; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 18: Compliance KYC Status

- User intent: Compliance KYC Status.
- Request: `GET {{platform_base_url}}/api/compliance/api/compliance/kyc-status/{{role_buyer_user_id}}`.
- Happy path: 200 -> kyc verification state is returned.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 404: route/resource not found; 422: semantic validation failed; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 19: Production Dashboard

- User intent: Production Dashboard.
- Request: `GET {{platform_base_url}}/api/production/dashboard`.
- Happy path: 200 -> production dashboard payload is returned.
- Unhappy path: 401: authentication required/invalid token; 403: authenticated but not authorized; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 20: Support Tickets List

- User intent: Support Tickets List.
- Request: `GET {{platform_base_url}}/api/support/tickets`.
- Happy path: 200 -> ticket list is returned.
- Unhappy path: 401: authentication required/invalid token; 403: authenticated but not authorized; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 21: Support Ticket Create

- User intent: Support Ticket Create.
- Request: `POST {{platform_base_url}}/api/support/tickets`.
- Happy path: 200, 201 -> support ticket is created.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 422: semantic validation failed; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 22: Logout

- User intent: Logout.
- Request: `POST {{platform_base_url}}/api/auth/logout`.
- Happy path: 200 -> session is terminated.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

Full satisfaction condition: every step in sequence passes on happy path and the journey ends with successful logout.

### SELLER - Full Supported Operations

Sequence length: **25** steps.

#### Step 1: CSRF Bootstrap

- User intent: CSRF Bootstrap.
- Request: `GET {{platform_base_url}}/health`.
- Happy path: 200 -> session bootstrap/csrf context is established.
- Unhappy path: 503: service degraded/unavailable.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 2: Register

- User intent: Register.
- Request: `POST {{platform_base_url}}/api/auth/register`.
- Happy path: 200 -> account is created and user identifier is captured.
- Unhappy path: 400: bad request / missing required fields; 409: conflict (duplicate or state conflict); 422: semantic validation failed; 429: rate limited; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 3: Login

- User intent: Login.
- Request: `POST {{platform_base_url}}/api/auth/login`.
- Happy path: 200 -> access token is issued and stored for subsequent calls.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 429: rate limited; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 4: KYC Submission

- User intent: KYC Submission.
- Request: `POST {{platform_base_url}}/api/compliance/api/compliance/verify-document`.
- Happy path: 200 -> kyc evidence is submitted.
- Unhappy path: none expected by current contract (non-success responses indicate regression).
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 5: KYC Admin Approval

- User intent: KYC Admin Approval.
- Request: `POST {{platform_base_url}}/api/compliance/api/compliance/manual-review`.
- Happy path: 200 -> kyc decision is applied as approved.
- Unhappy path: none expected by current contract (non-success responses indicate regression).
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 6: KYC Verified Check

- User intent: KYC Verified Check.
- Request: `GET {{platform_base_url}}/api/compliance/api/compliance/kyc-status/{{role_seller_user_id}}`.
- Happy path: 200 -> kyc verification state is returned.
- Unhappy path: none expected by current contract (non-success responses indicate regression).
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 7: Verify Session

- User intent: Verify Session.
- Request: `GET {{platform_base_url}}/api/auth/verify`.
- Happy path: 200 -> current session/token is confirmed as valid.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 8: Catalog Health

- User intent: Catalog Health.
- Request: `GET {{platform_base_url}}/api/catalog/health`.
- Happy path: 200 -> catalog module health is confirmed.
- Unhappy path: none expected by current contract (non-success responses indicate regression).
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 9: Catalog Pricing Calculate

- User intent: Catalog Pricing Calculate.
- Request: `POST {{platform_base_url}}/api/catalog/pricing/calculate`.
- Happy path: 200 -> auditable pricing result is returned.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 422: semantic validation failed; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 10: Order List

- User intent: Order List.
- Request: `GET {{platform_base_url}}/api/order/orders?buyerId={{role_seller_user_id}}`.
- Happy path: 200 -> orders are listed for the given buyer context.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 500: internal service error; 503: service degraded/unavailable.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 11: Order Create

- User intent: Order Create.
- Request: `POST {{platform_base_url}}/api/order/orders`.
- Happy path: 200, 201 -> order is validated and persisted.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 422: semantic validation failed; 500: internal service error; 503: service degraded/unavailable.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 12: Order Analytics

- User intent: Order Analytics.
- Request: `GET {{platform_base_url}}/api/order/orders/analytics/stats`.
- Happy path: 200 -> aggregated order analytics are returned.
- Unhappy path: 401: authentication required/invalid token; 403: authenticated but not authorized; 500: internal service error; 503: service degraded/unavailable.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 13: Notification Health

- User intent: Notification Health.
- Request: `GET {{platform_base_url}}/api/notification/health`.
- Happy path: 200 -> notification module health is confirmed.
- Unhappy path: none expected by current contract (non-success responses indicate regression).
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 14: Notification SMS Statistics

- User intent: Notification SMS Statistics.
- Request: `GET {{platform_base_url}}/api/notification/sms/statistics`.
- Happy path: 200 -> sms metrics are returned.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 15: Notification SMS Send

- User intent: Notification SMS Send.
- Request: `POST {{platform_base_url}}/api/notification/sms/send`.
- Happy path: 200, 201 -> sms delivery request is accepted.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 422: semantic validation failed; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 16: Enabler Hub Products

- User intent: Enabler Hub Products.
- Request: `GET {{platform_base_url}}/api/enabler/hub/products`.
- Happy path: 200 -> endpoint-specific action is executed and response contract is validated.
- Unhappy path: 401: authentication required/invalid token; 403: authenticated but not authorized; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 17: Enabler Register Reachability

- User intent: Enabler Register Reachability.
- Request: `POST {{platform_base_url}}/api/enabler/enablers/register`.
- Happy path: 200, 201 -> account is created and user identifier is captured.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 422: semantic validation failed; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 18: Maps Health

- User intent: Maps Health.
- Request: `GET {{platform_base_url}}/api/maps/health`.
- Happy path: 200 -> maps service state is reported.
- Unhappy path: 503: service degraded/unavailable.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 19: Maps Ready

- User intent: Maps Ready.
- Request: `GET {{platform_base_url}}/api/maps/health/ready`.
- Happy path: 200 -> maps service state is reported.
- Unhappy path: 503: service degraded/unavailable.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 20: Compliance Verify Document

- User intent: Compliance Verify Document.
- Request: `POST {{platform_base_url}}/api/compliance/api/compliance/verify-document`.
- Happy path: 200 -> compliance verification flow is triggered.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 422: semantic validation failed; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 21: Compliance KYC Status

- User intent: Compliance KYC Status.
- Request: `GET {{platform_base_url}}/api/compliance/api/compliance/kyc-status/{{role_seller_user_id}}`.
- Happy path: 200 -> kyc verification state is returned.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 404: route/resource not found; 422: semantic validation failed; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 22: Production Dashboard

- User intent: Production Dashboard.
- Request: `GET {{platform_base_url}}/api/production/dashboard`.
- Happy path: 200 -> production dashboard payload is returned.
- Unhappy path: 401: authentication required/invalid token; 403: authenticated but not authorized; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 23: Support Tickets List

- User intent: Support Tickets List.
- Request: `GET {{platform_base_url}}/api/support/tickets`.
- Happy path: 200 -> ticket list is returned.
- Unhappy path: 401: authentication required/invalid token; 403: authenticated but not authorized; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 24: Support Ticket Create

- User intent: Support Ticket Create.
- Request: `POST {{platform_base_url}}/api/support/tickets`.
- Happy path: 200, 201 -> support ticket is created.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 422: semantic validation failed; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 25: Logout

- User intent: Logout.
- Request: `POST {{platform_base_url}}/api/auth/logout`.
- Happy path: 200 -> session is terminated.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

Full satisfaction condition: every step in sequence passes on happy path and the journey ends with successful logout.

### COURIER - Full Supported Operations

Sequence length: **25** steps.

#### Step 1: CSRF Bootstrap

- User intent: CSRF Bootstrap.
- Request: `GET {{platform_base_url}}/health`.
- Happy path: 200 -> session bootstrap/csrf context is established.
- Unhappy path: 503: service degraded/unavailable.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 2: Register

- User intent: Register.
- Request: `POST {{platform_base_url}}/api/auth/register`.
- Happy path: 200 -> account is created and user identifier is captured.
- Unhappy path: 400: bad request / missing required fields; 409: conflict (duplicate or state conflict); 422: semantic validation failed; 429: rate limited; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 3: Login

- User intent: Login.
- Request: `POST {{platform_base_url}}/api/auth/login`.
- Happy path: 200 -> access token is issued and stored for subsequent calls.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 429: rate limited; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 4: KYC Submission

- User intent: KYC Submission.
- Request: `POST {{platform_base_url}}/api/compliance/api/compliance/verify-document`.
- Happy path: 200 -> kyc evidence is submitted.
- Unhappy path: none expected by current contract (non-success responses indicate regression).
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 5: KYC Admin Approval

- User intent: KYC Admin Approval.
- Request: `POST {{platform_base_url}}/api/compliance/api/compliance/manual-review`.
- Happy path: 200 -> kyc decision is applied as approved.
- Unhappy path: none expected by current contract (non-success responses indicate regression).
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 6: KYC Verified Check

- User intent: KYC Verified Check.
- Request: `GET {{platform_base_url}}/api/compliance/api/compliance/kyc-status/{{role_courier_user_id}}`.
- Happy path: 200 -> kyc verification state is returned.
- Unhappy path: none expected by current contract (non-success responses indicate regression).
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 7: Verify Session

- User intent: Verify Session.
- Request: `GET {{platform_base_url}}/api/auth/verify`.
- Happy path: 200 -> current session/token is confirmed as valid.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 8: Catalog Health

- User intent: Catalog Health.
- Request: `GET {{platform_base_url}}/api/catalog/health`.
- Happy path: 200 -> catalog module health is confirmed.
- Unhappy path: none expected by current contract (non-success responses indicate regression).
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 9: Catalog Pricing Calculate

- User intent: Catalog Pricing Calculate.
- Request: `POST {{platform_base_url}}/api/catalog/pricing/calculate`.
- Happy path: 200 -> auditable pricing result is returned.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 422: semantic validation failed; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 10: Order List

- User intent: Order List.
- Request: `GET {{platform_base_url}}/api/order/orders?buyerId={{role_courier_user_id}}`.
- Happy path: 200 -> orders are listed for the given buyer context.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 500: internal service error; 503: service degraded/unavailable.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 11: Order Create

- User intent: Order Create.
- Request: `POST {{platform_base_url}}/api/order/orders`.
- Happy path: 200, 201 -> order is validated and persisted.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 422: semantic validation failed; 500: internal service error; 503: service degraded/unavailable.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 12: Order Analytics

- User intent: Order Analytics.
- Request: `GET {{platform_base_url}}/api/order/orders/analytics/stats`.
- Happy path: 200 -> aggregated order analytics are returned.
- Unhappy path: 401: authentication required/invalid token; 403: authenticated but not authorized; 500: internal service error; 503: service degraded/unavailable.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 13: Notification Health

- User intent: Notification Health.
- Request: `GET {{platform_base_url}}/api/notification/health`.
- Happy path: 200 -> notification module health is confirmed.
- Unhappy path: none expected by current contract (non-success responses indicate regression).
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 14: Notification SMS Statistics

- User intent: Notification SMS Statistics.
- Request: `GET {{platform_base_url}}/api/notification/sms/statistics`.
- Happy path: 200 -> sms metrics are returned.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 15: Notification SMS Send

- User intent: Notification SMS Send.
- Request: `POST {{platform_base_url}}/api/notification/sms/send`.
- Happy path: 200, 201 -> sms delivery request is accepted.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 422: semantic validation failed; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 16: Enabler Hub Products

- User intent: Enabler Hub Products.
- Request: `GET {{platform_base_url}}/api/enabler/hub/products`.
- Happy path: 200 -> endpoint-specific action is executed and response contract is validated.
- Unhappy path: 401: authentication required/invalid token; 403: authenticated but not authorized; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 17: Enabler Register Reachability

- User intent: Enabler Register Reachability.
- Request: `POST {{platform_base_url}}/api/enabler/enablers/register`.
- Happy path: 200, 201 -> account is created and user identifier is captured.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 422: semantic validation failed; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 18: Maps Health

- User intent: Maps Health.
- Request: `GET {{platform_base_url}}/api/maps/health`.
- Happy path: 200 -> maps service state is reported.
- Unhappy path: 503: service degraded/unavailable.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 19: Maps Ready

- User intent: Maps Ready.
- Request: `GET {{platform_base_url}}/api/maps/health/ready`.
- Happy path: 200 -> maps service state is reported.
- Unhappy path: 503: service degraded/unavailable.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 20: Compliance Verify Document

- User intent: Compliance Verify Document.
- Request: `POST {{platform_base_url}}/api/compliance/api/compliance/verify-document`.
- Happy path: 200 -> compliance verification flow is triggered.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 422: semantic validation failed; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 21: Compliance KYC Status

- User intent: Compliance KYC Status.
- Request: `GET {{platform_base_url}}/api/compliance/api/compliance/kyc-status/{{role_courier_user_id}}`.
- Happy path: 200 -> kyc verification state is returned.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 404: route/resource not found; 422: semantic validation failed; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 22: Production Dashboard

- User intent: Production Dashboard.
- Request: `GET {{platform_base_url}}/api/production/dashboard`.
- Happy path: 200 -> production dashboard payload is returned.
- Unhappy path: 401: authentication required/invalid token; 403: authenticated but not authorized; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 23: Support Tickets List

- User intent: Support Tickets List.
- Request: `GET {{platform_base_url}}/api/support/tickets`.
- Happy path: 200 -> ticket list is returned.
- Unhappy path: 401: authentication required/invalid token; 403: authenticated but not authorized; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 24: Support Ticket Create

- User intent: Support Ticket Create.
- Request: `POST {{platform_base_url}}/api/support/tickets`.
- Happy path: 200, 201 -> support ticket is created.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 422: semantic validation failed; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 25: Logout

- User intent: Logout.
- Request: `POST {{platform_base_url}}/api/auth/logout`.
- Happy path: 200 -> session is terminated.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

Full satisfaction condition: every step in sequence passes on happy path and the journey ends with successful logout.

### SUPPLIER - Full Supported Operations

Sequence length: **25** steps.

#### Step 1: CSRF Bootstrap

- User intent: CSRF Bootstrap.
- Request: `GET {{platform_base_url}}/health`.
- Happy path: 200 -> session bootstrap/csrf context is established.
- Unhappy path: 503: service degraded/unavailable.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 2: Register

- User intent: Register.
- Request: `POST {{platform_base_url}}/api/auth/register`.
- Happy path: 200 -> account is created and user identifier is captured.
- Unhappy path: 400: bad request / missing required fields; 409: conflict (duplicate or state conflict); 422: semantic validation failed; 429: rate limited; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 3: Login

- User intent: Login.
- Request: `POST {{platform_base_url}}/api/auth/login`.
- Happy path: 200 -> access token is issued and stored for subsequent calls.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 429: rate limited; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 4: KYC Submission

- User intent: KYC Submission.
- Request: `POST {{platform_base_url}}/api/compliance/api/compliance/verify-document`.
- Happy path: 200 -> kyc evidence is submitted.
- Unhappy path: none expected by current contract (non-success responses indicate regression).
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 5: KYC Admin Approval

- User intent: KYC Admin Approval.
- Request: `POST {{platform_base_url}}/api/compliance/api/compliance/manual-review`.
- Happy path: 200 -> kyc decision is applied as approved.
- Unhappy path: none expected by current contract (non-success responses indicate regression).
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 6: KYC Verified Check

- User intent: KYC Verified Check.
- Request: `GET {{platform_base_url}}/api/compliance/api/compliance/kyc-status/{{role_supplier_user_id}}`.
- Happy path: 200 -> kyc verification state is returned.
- Unhappy path: none expected by current contract (non-success responses indicate regression).
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 7: Verify Session

- User intent: Verify Session.
- Request: `GET {{platform_base_url}}/api/auth/verify`.
- Happy path: 200 -> current session/token is confirmed as valid.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 8: Catalog Health

- User intent: Catalog Health.
- Request: `GET {{platform_base_url}}/api/catalog/health`.
- Happy path: 200 -> catalog module health is confirmed.
- Unhappy path: none expected by current contract (non-success responses indicate regression).
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 9: Catalog Pricing Calculate

- User intent: Catalog Pricing Calculate.
- Request: `POST {{platform_base_url}}/api/catalog/pricing/calculate`.
- Happy path: 200 -> auditable pricing result is returned.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 422: semantic validation failed; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 10: Order List

- User intent: Order List.
- Request: `GET {{platform_base_url}}/api/order/orders?buyerId={{role_supplier_user_id}}`.
- Happy path: 200 -> orders are listed for the given buyer context.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 500: internal service error; 503: service degraded/unavailable.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 11: Order Create

- User intent: Order Create.
- Request: `POST {{platform_base_url}}/api/order/orders`.
- Happy path: 200, 201 -> order is validated and persisted.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 422: semantic validation failed; 500: internal service error; 503: service degraded/unavailable.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 12: Order Analytics

- User intent: Order Analytics.
- Request: `GET {{platform_base_url}}/api/order/orders/analytics/stats`.
- Happy path: 200 -> aggregated order analytics are returned.
- Unhappy path: 401: authentication required/invalid token; 403: authenticated but not authorized; 500: internal service error; 503: service degraded/unavailable.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 13: Notification Health

- User intent: Notification Health.
- Request: `GET {{platform_base_url}}/api/notification/health`.
- Happy path: 200 -> notification module health is confirmed.
- Unhappy path: none expected by current contract (non-success responses indicate regression).
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 14: Notification SMS Statistics

- User intent: Notification SMS Statistics.
- Request: `GET {{platform_base_url}}/api/notification/sms/statistics`.
- Happy path: 200 -> sms metrics are returned.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 15: Notification SMS Send

- User intent: Notification SMS Send.
- Request: `POST {{platform_base_url}}/api/notification/sms/send`.
- Happy path: 200, 201 -> sms delivery request is accepted.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 422: semantic validation failed; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 16: Enabler Hub Products

- User intent: Enabler Hub Products.
- Request: `GET {{platform_base_url}}/api/enabler/hub/products`.
- Happy path: 200 -> endpoint-specific action is executed and response contract is validated.
- Unhappy path: 401: authentication required/invalid token; 403: authenticated but not authorized; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 17: Enabler Register Reachability

- User intent: Enabler Register Reachability.
- Request: `POST {{platform_base_url}}/api/enabler/enablers/register`.
- Happy path: 200, 201 -> account is created and user identifier is captured.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 422: semantic validation failed; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 18: Maps Health

- User intent: Maps Health.
- Request: `GET {{platform_base_url}}/api/maps/health`.
- Happy path: 200 -> maps service state is reported.
- Unhappy path: 503: service degraded/unavailable.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 19: Maps Ready

- User intent: Maps Ready.
- Request: `GET {{platform_base_url}}/api/maps/health/ready`.
- Happy path: 200 -> maps service state is reported.
- Unhappy path: 503: service degraded/unavailable.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 20: Compliance Verify Document

- User intent: Compliance Verify Document.
- Request: `POST {{platform_base_url}}/api/compliance/api/compliance/verify-document`.
- Happy path: 200 -> compliance verification flow is triggered.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 422: semantic validation failed; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 21: Compliance KYC Status

- User intent: Compliance KYC Status.
- Request: `GET {{platform_base_url}}/api/compliance/api/compliance/kyc-status/{{role_supplier_user_id}}`.
- Happy path: 200 -> kyc verification state is returned.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 404: route/resource not found; 422: semantic validation failed; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 22: Production Dashboard

- User intent: Production Dashboard.
- Request: `GET {{platform_base_url}}/api/production/dashboard`.
- Happy path: 200 -> production dashboard payload is returned.
- Unhappy path: 401: authentication required/invalid token; 403: authenticated but not authorized; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 23: Support Tickets List

- User intent: Support Tickets List.
- Request: `GET {{platform_base_url}}/api/support/tickets`.
- Happy path: 200 -> ticket list is returned.
- Unhappy path: 401: authentication required/invalid token; 403: authenticated but not authorized; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 24: Support Ticket Create

- User intent: Support Ticket Create.
- Request: `POST {{platform_base_url}}/api/support/tickets`.
- Happy path: 200, 201 -> support ticket is created.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 422: semantic validation failed; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 25: Logout

- User intent: Logout.
- Request: `POST {{platform_base_url}}/api/auth/logout`.
- Happy path: 200 -> session is terminated.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

Full satisfaction condition: every step in sequence passes on happy path and the journey ends with successful logout.

### ENABLER - Full Supported Operations

Sequence length: **25** steps.

#### Step 1: CSRF Bootstrap

- User intent: CSRF Bootstrap.
- Request: `GET {{platform_base_url}}/health`.
- Happy path: 200 -> session bootstrap/csrf context is established.
- Unhappy path: 503: service degraded/unavailable.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 2: Register

- User intent: Register.
- Request: `POST {{platform_base_url}}/api/auth/register`.
- Happy path: 200 -> account is created and user identifier is captured.
- Unhappy path: 400: bad request / missing required fields; 409: conflict (duplicate or state conflict); 422: semantic validation failed; 429: rate limited; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 3: Login

- User intent: Login.
- Request: `POST {{platform_base_url}}/api/auth/login`.
- Happy path: 200 -> access token is issued and stored for subsequent calls.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 429: rate limited; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 4: KYC Submission

- User intent: KYC Submission.
- Request: `POST {{platform_base_url}}/api/compliance/api/compliance/verify-document`.
- Happy path: 200 -> kyc evidence is submitted.
- Unhappy path: none expected by current contract (non-success responses indicate regression).
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 5: KYC Admin Approval

- User intent: KYC Admin Approval.
- Request: `POST {{platform_base_url}}/api/compliance/api/compliance/manual-review`.
- Happy path: 200 -> kyc decision is applied as approved.
- Unhappy path: none expected by current contract (non-success responses indicate regression).
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 6: KYC Verified Check

- User intent: KYC Verified Check.
- Request: `GET {{platform_base_url}}/api/compliance/api/compliance/kyc-status/{{role_enabler_user_id}}`.
- Happy path: 200 -> kyc verification state is returned.
- Unhappy path: none expected by current contract (non-success responses indicate regression).
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 7: Verify Session

- User intent: Verify Session.
- Request: `GET {{platform_base_url}}/api/auth/verify`.
- Happy path: 200 -> current session/token is confirmed as valid.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 8: Catalog Health

- User intent: Catalog Health.
- Request: `GET {{platform_base_url}}/api/catalog/health`.
- Happy path: 200 -> catalog module health is confirmed.
- Unhappy path: none expected by current contract (non-success responses indicate regression).
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 9: Catalog Pricing Calculate

- User intent: Catalog Pricing Calculate.
- Request: `POST {{platform_base_url}}/api/catalog/pricing/calculate`.
- Happy path: 200 -> auditable pricing result is returned.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 422: semantic validation failed; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 10: Order List

- User intent: Order List.
- Request: `GET {{platform_base_url}}/api/order/orders?buyerId={{role_enabler_user_id}}`.
- Happy path: 200 -> orders are listed for the given buyer context.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 500: internal service error; 503: service degraded/unavailable.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 11: Order Create

- User intent: Order Create.
- Request: `POST {{platform_base_url}}/api/order/orders`.
- Happy path: 200, 201 -> order is validated and persisted.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 422: semantic validation failed; 500: internal service error; 503: service degraded/unavailable.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 12: Order Analytics

- User intent: Order Analytics.
- Request: `GET {{platform_base_url}}/api/order/orders/analytics/stats`.
- Happy path: 200 -> aggregated order analytics are returned.
- Unhappy path: 401: authentication required/invalid token; 403: authenticated but not authorized; 500: internal service error; 503: service degraded/unavailable.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 13: Notification Health

- User intent: Notification Health.
- Request: `GET {{platform_base_url}}/api/notification/health`.
- Happy path: 200 -> notification module health is confirmed.
- Unhappy path: none expected by current contract (non-success responses indicate regression).
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 14: Notification SMS Statistics

- User intent: Notification SMS Statistics.
- Request: `GET {{platform_base_url}}/api/notification/sms/statistics`.
- Happy path: 200 -> sms metrics are returned.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 15: Notification SMS Send

- User intent: Notification SMS Send.
- Request: `POST {{platform_base_url}}/api/notification/sms/send`.
- Happy path: 200, 201 -> sms delivery request is accepted.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 422: semantic validation failed; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 16: Enabler Hub Products

- User intent: Enabler Hub Products.
- Request: `GET {{platform_base_url}}/api/enabler/hub/products`.
- Happy path: 200 -> endpoint-specific action is executed and response contract is validated.
- Unhappy path: 401: authentication required/invalid token; 403: authenticated but not authorized; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 17: Enabler Register Reachability

- User intent: Enabler Register Reachability.
- Request: `POST {{platform_base_url}}/api/enabler/enablers/register`.
- Happy path: 200, 201 -> account is created and user identifier is captured.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 422: semantic validation failed; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 18: Maps Health

- User intent: Maps Health.
- Request: `GET {{platform_base_url}}/api/maps/health`.
- Happy path: 200 -> maps service state is reported.
- Unhappy path: 503: service degraded/unavailable.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 19: Maps Ready

- User intent: Maps Ready.
- Request: `GET {{platform_base_url}}/api/maps/health/ready`.
- Happy path: 200 -> maps service state is reported.
- Unhappy path: 503: service degraded/unavailable.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 20: Compliance Verify Document

- User intent: Compliance Verify Document.
- Request: `POST {{platform_base_url}}/api/compliance/api/compliance/verify-document`.
- Happy path: 200 -> compliance verification flow is triggered.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 422: semantic validation failed; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 21: Compliance KYC Status

- User intent: Compliance KYC Status.
- Request: `GET {{platform_base_url}}/api/compliance/api/compliance/kyc-status/{{role_enabler_user_id}}`.
- Happy path: 200 -> kyc verification state is returned.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 404: route/resource not found; 422: semantic validation failed; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 22: Production Dashboard

- User intent: Production Dashboard.
- Request: `GET {{platform_base_url}}/api/production/dashboard`.
- Happy path: 200 -> production dashboard payload is returned.
- Unhappy path: 401: authentication required/invalid token; 403: authenticated but not authorized; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 23: Support Tickets List

- User intent: Support Tickets List.
- Request: `GET {{platform_base_url}}/api/support/tickets`.
- Happy path: 200 -> ticket list is returned.
- Unhappy path: 401: authentication required/invalid token; 403: authenticated but not authorized; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 24: Support Ticket Create

- User intent: Support Ticket Create.
- Request: `POST {{platform_base_url}}/api/support/tickets`.
- Happy path: 200, 201 -> support ticket is created.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 422: semantic validation failed; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 25: Logout

- User intent: Logout.
- Request: `POST {{platform_base_url}}/api/auth/logout`.
- Happy path: 200 -> session is terminated.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

Full satisfaction condition: every step in sequence passes on happy path and the journey ends with successful logout.

### SYSTEM - Full Supported Operations

Sequence length: **22** steps.

#### Step 1: CSRF Bootstrap

- User intent: CSRF Bootstrap.
- Request: `GET {{platform_base_url}}/health`.
- Happy path: 200 -> session bootstrap/csrf context is established.
- Unhappy path: 503: service degraded/unavailable.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 2: Register

- User intent: Register.
- Request: `POST {{platform_base_url}}/api/auth/register`.
- Happy path: 200 -> account is created and user identifier is captured.
- Unhappy path: 400: bad request / missing required fields; 409: conflict (duplicate or state conflict); 422: semantic validation failed; 429: rate limited; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 3: Login

- User intent: Login.
- Request: `POST {{platform_base_url}}/api/auth/login`.
- Happy path: 200 -> access token is issued and stored for subsequent calls.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 429: rate limited; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 4: Verify Session

- User intent: Verify Session.
- Request: `GET {{platform_base_url}}/api/auth/verify`.
- Happy path: 200 -> current session/token is confirmed as valid.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 5: Catalog Health

- User intent: Catalog Health.
- Request: `GET {{platform_base_url}}/api/catalog/health`.
- Happy path: 200 -> catalog module health is confirmed.
- Unhappy path: none expected by current contract (non-success responses indicate regression).
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 6: Catalog Pricing Calculate

- User intent: Catalog Pricing Calculate.
- Request: `POST {{platform_base_url}}/api/catalog/pricing/calculate`.
- Happy path: 200 -> auditable pricing result is returned.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 422: semantic validation failed; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 7: Order List

- User intent: Order List.
- Request: `GET {{platform_base_url}}/api/order/orders?buyerId={{role_system_user_id}}`.
- Happy path: 200 -> orders are listed for the given buyer context.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 500: internal service error; 503: service degraded/unavailable.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 8: Order Create

- User intent: Order Create.
- Request: `POST {{platform_base_url}}/api/order/orders`.
- Happy path: 200, 201 -> order is validated and persisted.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 422: semantic validation failed; 500: internal service error; 503: service degraded/unavailable.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 9: Order Analytics

- User intent: Order Analytics.
- Request: `GET {{platform_base_url}}/api/order/orders/analytics/stats`.
- Happy path: 200 -> aggregated order analytics are returned.
- Unhappy path: 401: authentication required/invalid token; 403: authenticated but not authorized; 500: internal service error; 503: service degraded/unavailable.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 10: Notification Health

- User intent: Notification Health.
- Request: `GET {{platform_base_url}}/api/notification/health`.
- Happy path: 200 -> notification module health is confirmed.
- Unhappy path: none expected by current contract (non-success responses indicate regression).
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 11: Notification SMS Statistics

- User intent: Notification SMS Statistics.
- Request: `GET {{platform_base_url}}/api/notification/sms/statistics`.
- Happy path: 200 -> sms metrics are returned.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 12: Notification SMS Send

- User intent: Notification SMS Send.
- Request: `POST {{platform_base_url}}/api/notification/sms/send`.
- Happy path: 200, 201 -> sms delivery request is accepted.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 422: semantic validation failed; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 13: Enabler Hub Products

- User intent: Enabler Hub Products.
- Request: `GET {{platform_base_url}}/api/enabler/hub/products`.
- Happy path: 200 -> endpoint-specific action is executed and response contract is validated.
- Unhappy path: 401: authentication required/invalid token; 403: authenticated but not authorized; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 14: Enabler Register Reachability

- User intent: Enabler Register Reachability.
- Request: `POST {{platform_base_url}}/api/enabler/enablers/register`.
- Happy path: 200, 201 -> account is created and user identifier is captured.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 422: semantic validation failed; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 15: Maps Health

- User intent: Maps Health.
- Request: `GET {{platform_base_url}}/api/maps/health`.
- Happy path: 200 -> maps service state is reported.
- Unhappy path: 503: service degraded/unavailable.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 16: Maps Ready

- User intent: Maps Ready.
- Request: `GET {{platform_base_url}}/api/maps/health/ready`.
- Happy path: 200 -> maps service state is reported.
- Unhappy path: 503: service degraded/unavailable.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 17: Compliance Verify Document

- User intent: Compliance Verify Document.
- Request: `POST {{platform_base_url}}/api/compliance/api/compliance/verify-document`.
- Happy path: 200 -> compliance verification flow is triggered.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 422: semantic validation failed; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 18: Compliance KYC Status

- User intent: Compliance KYC Status.
- Request: `GET {{platform_base_url}}/api/compliance/api/compliance/kyc-status/{{role_system_user_id}}`.
- Happy path: 200 -> kyc verification state is returned.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 404: route/resource not found; 422: semantic validation failed; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 19: Production Dashboard

- User intent: Production Dashboard.
- Request: `GET {{platform_base_url}}/api/production/dashboard`.
- Happy path: 200 -> production dashboard payload is returned.
- Unhappy path: 401: authentication required/invalid token; 403: authenticated but not authorized; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 20: Support Tickets List

- User intent: Support Tickets List.
- Request: `GET {{platform_base_url}}/api/support/tickets`.
- Happy path: 200 -> ticket list is returned.
- Unhappy path: 401: authentication required/invalid token; 403: authenticated but not authorized; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 21: Support Ticket Create

- User intent: Support Ticket Create.
- Request: `POST {{platform_base_url}}/api/support/tickets`.
- Happy path: 200, 201 -> support ticket is created.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 422: semantic validation failed; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

#### Step 22: Logout

- User intent: Logout.
- Request: `POST {{platform_base_url}}/api/auth/logout`.
- Happy path: 200 -> session is terminated.
- Unhappy path: 400: bad request / missing required fields; 401: authentication required/invalid token; 403: authenticated but not authorized; 500: internal service error.
- Satisfaction gate: proceed only if happy-path contract holds for this step; otherwise apply recovery/escalation rules.

Full satisfaction condition: every step in sequence passes on happy path and the journey ends with successful logout.

## Role Journey Matrix (Quick Audit View)

### BUYER - Full Supported Operations

| Step | User Intent / Action | Endpoint | Happy Status | Unhappy Status / Failure Path |
|---|---|---|---|---|
| 1 | CSRF Bootstrap | `GET {{platform_base_url}}/health` | 200 | 503 |
| 2 | Register | `POST {{platform_base_url}}/api/auth/register` | 200 | 400, 409, 422, 429, 500 |
| 3 | Login | `POST {{platform_base_url}}/api/auth/login` | 200 | 400, 401, 403, 429, 500 |
| 4 | Verify Session | `GET {{platform_base_url}}/api/auth/verify` | 200 | 400, 401, 403, 500 |
| 5 | Catalog Health | `GET {{platform_base_url}}/api/catalog/health` | 200 | none |
| 6 | Catalog Pricing Calculate | `POST {{platform_base_url}}/api/catalog/pricing/calculate` | 200 | 400, 401, 403, 422, 500 |
| 7 | Order List | `GET {{platform_base_url}}/api/order/orders?buyerId={{role_buyer_user_id}}` | 200 | 400, 401, 403, 500, 503 |
| 8 | Order Create | `POST {{platform_base_url}}/api/order/orders` | 200, 201 | 400, 401, 403, 422, 500, 503 |
| 9 | Order Analytics | `GET {{platform_base_url}}/api/order/orders/analytics/stats` | 200 | 401, 403, 500, 503 |
| 10 | Notification Health | `GET {{platform_base_url}}/api/notification/health` | 200 | none |
| 11 | Notification SMS Statistics | `GET {{platform_base_url}}/api/notification/sms/statistics` | 200 | 400, 401, 403, 500 |
| 12 | Notification SMS Send | `POST {{platform_base_url}}/api/notification/sms/send` | 200, 201 | 400, 401, 403, 422, 500 |
| 13 | Enabler Hub Products | `GET {{platform_base_url}}/api/enabler/hub/products` | 200 | 401, 403, 500 |
| 14 | Enabler Register Reachability | `POST {{platform_base_url}}/api/enabler/enablers/register` | 200, 201 | 400, 401, 403, 422, 500 |
| 15 | Maps Health | `GET {{platform_base_url}}/api/maps/health` | 200 | 503 |
| 16 | Maps Ready | `GET {{platform_base_url}}/api/maps/health/ready` | 200 | 503 |
| 17 | Compliance Verify Document | `POST {{platform_base_url}}/api/compliance/api/compliance/verify-document` | 200 | 400, 401, 403, 422, 500 |
| 18 | Compliance KYC Status | `GET {{platform_base_url}}/api/compliance/api/compliance/kyc-status/{{role_buyer_user_id}}` | 200 | 400, 401, 403, 404, 422, 500 |
| 19 | Production Dashboard | `GET {{platform_base_url}}/api/production/dashboard` | 200 | 401, 403, 500 |
| 20 | Support Tickets List | `GET {{platform_base_url}}/api/support/tickets` | 200 | 401, 403, 500 |
| 21 | Support Ticket Create | `POST {{platform_base_url}}/api/support/tickets` | 200, 201 | 400, 401, 403, 422, 500 |
| 22 | Logout | `POST {{platform_base_url}}/api/auth/logout` | 200 | 400, 401, 403, 500 |

### SELLER - Full Supported Operations

| Step | User Intent / Action | Endpoint | Happy Status | Unhappy Status / Failure Path |
|---|---|---|---|---|
| 1 | CSRF Bootstrap | `GET {{platform_base_url}}/health` | 200 | 503 |
| 2 | Register | `POST {{platform_base_url}}/api/auth/register` | 200 | 400, 409, 422, 429, 500 |
| 3 | Login | `POST {{platform_base_url}}/api/auth/login` | 200 | 400, 401, 403, 429, 500 |
| 4 | KYC Submission | `POST {{platform_base_url}}/api/compliance/api/compliance/verify-document` | 200 | none |
| 5 | KYC Admin Approval | `POST {{platform_base_url}}/api/compliance/api/compliance/manual-review` | 200 | none |
| 6 | KYC Verified Check | `GET {{platform_base_url}}/api/compliance/api/compliance/kyc-status/{{role_seller_user_id}}` | 200 | none |
| 7 | Verify Session | `GET {{platform_base_url}}/api/auth/verify` | 200 | 400, 401, 403, 500 |
| 8 | Catalog Health | `GET {{platform_base_url}}/api/catalog/health` | 200 | none |
| 9 | Catalog Pricing Calculate | `POST {{platform_base_url}}/api/catalog/pricing/calculate` | 200 | 400, 401, 403, 422, 500 |
| 10 | Order List | `GET {{platform_base_url}}/api/order/orders?buyerId={{role_seller_user_id}}` | 200 | 400, 401, 403, 500, 503 |
| 11 | Order Create | `POST {{platform_base_url}}/api/order/orders` | 200, 201 | 400, 401, 403, 422, 500, 503 |
| 12 | Order Analytics | `GET {{platform_base_url}}/api/order/orders/analytics/stats` | 200 | 401, 403, 500, 503 |
| 13 | Notification Health | `GET {{platform_base_url}}/api/notification/health` | 200 | none |
| 14 | Notification SMS Statistics | `GET {{platform_base_url}}/api/notification/sms/statistics` | 200 | 400, 401, 403, 500 |
| 15 | Notification SMS Send | `POST {{platform_base_url}}/api/notification/sms/send` | 200, 201 | 400, 401, 403, 422, 500 |
| 16 | Enabler Hub Products | `GET {{platform_base_url}}/api/enabler/hub/products` | 200 | 401, 403, 500 |
| 17 | Enabler Register Reachability | `POST {{platform_base_url}}/api/enabler/enablers/register` | 200, 201 | 400, 401, 403, 422, 500 |
| 18 | Maps Health | `GET {{platform_base_url}}/api/maps/health` | 200 | 503 |
| 19 | Maps Ready | `GET {{platform_base_url}}/api/maps/health/ready` | 200 | 503 |
| 20 | Compliance Verify Document | `POST {{platform_base_url}}/api/compliance/api/compliance/verify-document` | 200 | 400, 401, 403, 422, 500 |
| 21 | Compliance KYC Status | `GET {{platform_base_url}}/api/compliance/api/compliance/kyc-status/{{role_seller_user_id}}` | 200 | 400, 401, 403, 404, 422, 500 |
| 22 | Production Dashboard | `GET {{platform_base_url}}/api/production/dashboard` | 200 | 401, 403, 500 |
| 23 | Support Tickets List | `GET {{platform_base_url}}/api/support/tickets` | 200 | 401, 403, 500 |
| 24 | Support Ticket Create | `POST {{platform_base_url}}/api/support/tickets` | 200, 201 | 400, 401, 403, 422, 500 |
| 25 | Logout | `POST {{platform_base_url}}/api/auth/logout` | 200 | 400, 401, 403, 500 |

### COURIER - Full Supported Operations

| Step | User Intent / Action | Endpoint | Happy Status | Unhappy Status / Failure Path |
|---|---|---|---|---|
| 1 | CSRF Bootstrap | `GET {{platform_base_url}}/health` | 200 | 503 |
| 2 | Register | `POST {{platform_base_url}}/api/auth/register` | 200 | 400, 409, 422, 429, 500 |
| 3 | Login | `POST {{platform_base_url}}/api/auth/login` | 200 | 400, 401, 403, 429, 500 |
| 4 | KYC Submission | `POST {{platform_base_url}}/api/compliance/api/compliance/verify-document` | 200 | none |
| 5 | KYC Admin Approval | `POST {{platform_base_url}}/api/compliance/api/compliance/manual-review` | 200 | none |
| 6 | KYC Verified Check | `GET {{platform_base_url}}/api/compliance/api/compliance/kyc-status/{{role_courier_user_id}}` | 200 | none |
| 7 | Verify Session | `GET {{platform_base_url}}/api/auth/verify` | 200 | 400, 401, 403, 500 |
| 8 | Catalog Health | `GET {{platform_base_url}}/api/catalog/health` | 200 | none |
| 9 | Catalog Pricing Calculate | `POST {{platform_base_url}}/api/catalog/pricing/calculate` | 200 | 400, 401, 403, 422, 500 |
| 10 | Order List | `GET {{platform_base_url}}/api/order/orders?buyerId={{role_courier_user_id}}` | 200 | 400, 401, 403, 500, 503 |
| 11 | Order Create | `POST {{platform_base_url}}/api/order/orders` | 200, 201 | 400, 401, 403, 422, 500, 503 |
| 12 | Order Analytics | `GET {{platform_base_url}}/api/order/orders/analytics/stats` | 200 | 401, 403, 500, 503 |
| 13 | Notification Health | `GET {{platform_base_url}}/api/notification/health` | 200 | none |
| 14 | Notification SMS Statistics | `GET {{platform_base_url}}/api/notification/sms/statistics` | 200 | 400, 401, 403, 500 |
| 15 | Notification SMS Send | `POST {{platform_base_url}}/api/notification/sms/send` | 200, 201 | 400, 401, 403, 422, 500 |
| 16 | Enabler Hub Products | `GET {{platform_base_url}}/api/enabler/hub/products` | 200 | 401, 403, 500 |
| 17 | Enabler Register Reachability | `POST {{platform_base_url}}/api/enabler/enablers/register` | 200, 201 | 400, 401, 403, 422, 500 |
| 18 | Maps Health | `GET {{platform_base_url}}/api/maps/health` | 200 | 503 |
| 19 | Maps Ready | `GET {{platform_base_url}}/api/maps/health/ready` | 200 | 503 |
| 20 | Compliance Verify Document | `POST {{platform_base_url}}/api/compliance/api/compliance/verify-document` | 200 | 400, 401, 403, 422, 500 |
| 21 | Compliance KYC Status | `GET {{platform_base_url}}/api/compliance/api/compliance/kyc-status/{{role_courier_user_id}}` | 200 | 400, 401, 403, 404, 422, 500 |
| 22 | Production Dashboard | `GET {{platform_base_url}}/api/production/dashboard` | 200 | 401, 403, 500 |
| 23 | Support Tickets List | `GET {{platform_base_url}}/api/support/tickets` | 200 | 401, 403, 500 |
| 24 | Support Ticket Create | `POST {{platform_base_url}}/api/support/tickets` | 200, 201 | 400, 401, 403, 422, 500 |
| 25 | Logout | `POST {{platform_base_url}}/api/auth/logout` | 200 | 400, 401, 403, 500 |

### SUPPLIER - Full Supported Operations

| Step | User Intent / Action | Endpoint | Happy Status | Unhappy Status / Failure Path |
|---|---|---|---|---|
| 1 | CSRF Bootstrap | `GET {{platform_base_url}}/health` | 200 | 503 |
| 2 | Register | `POST {{platform_base_url}}/api/auth/register` | 200 | 400, 409, 422, 429, 500 |
| 3 | Login | `POST {{platform_base_url}}/api/auth/login` | 200 | 400, 401, 403, 429, 500 |
| 4 | KYC Submission | `POST {{platform_base_url}}/api/compliance/api/compliance/verify-document` | 200 | none |
| 5 | KYC Admin Approval | `POST {{platform_base_url}}/api/compliance/api/compliance/manual-review` | 200 | none |
| 6 | KYC Verified Check | `GET {{platform_base_url}}/api/compliance/api/compliance/kyc-status/{{role_supplier_user_id}}` | 200 | none |
| 7 | Verify Session | `GET {{platform_base_url}}/api/auth/verify` | 200 | 400, 401, 403, 500 |
| 8 | Catalog Health | `GET {{platform_base_url}}/api/catalog/health` | 200 | none |
| 9 | Catalog Pricing Calculate | `POST {{platform_base_url}}/api/catalog/pricing/calculate` | 200 | 400, 401, 403, 422, 500 |
| 10 | Order List | `GET {{platform_base_url}}/api/order/orders?buyerId={{role_supplier_user_id}}` | 200 | 400, 401, 403, 500, 503 |
| 11 | Order Create | `POST {{platform_base_url}}/api/order/orders` | 200, 201 | 400, 401, 403, 422, 500, 503 |
| 12 | Order Analytics | `GET {{platform_base_url}}/api/order/orders/analytics/stats` | 200 | 401, 403, 500, 503 |
| 13 | Notification Health | `GET {{platform_base_url}}/api/notification/health` | 200 | none |
| 14 | Notification SMS Statistics | `GET {{platform_base_url}}/api/notification/sms/statistics` | 200 | 400, 401, 403, 500 |
| 15 | Notification SMS Send | `POST {{platform_base_url}}/api/notification/sms/send` | 200, 201 | 400, 401, 403, 422, 500 |
| 16 | Enabler Hub Products | `GET {{platform_base_url}}/api/enabler/hub/products` | 200 | 401, 403, 500 |
| 17 | Enabler Register Reachability | `POST {{platform_base_url}}/api/enabler/enablers/register` | 200, 201 | 400, 401, 403, 422, 500 |
| 18 | Maps Health | `GET {{platform_base_url}}/api/maps/health` | 200 | 503 |
| 19 | Maps Ready | `GET {{platform_base_url}}/api/maps/health/ready` | 200 | 503 |
| 20 | Compliance Verify Document | `POST {{platform_base_url}}/api/compliance/api/compliance/verify-document` | 200 | 400, 401, 403, 422, 500 |
| 21 | Compliance KYC Status | `GET {{platform_base_url}}/api/compliance/api/compliance/kyc-status/{{role_supplier_user_id}}` | 200 | 400, 401, 403, 404, 422, 500 |
| 22 | Production Dashboard | `GET {{platform_base_url}}/api/production/dashboard` | 200 | 401, 403, 500 |
| 23 | Support Tickets List | `GET {{platform_base_url}}/api/support/tickets` | 200 | 401, 403, 500 |
| 24 | Support Ticket Create | `POST {{platform_base_url}}/api/support/tickets` | 200, 201 | 400, 401, 403, 422, 500 |
| 25 | Logout | `POST {{platform_base_url}}/api/auth/logout` | 200 | 400, 401, 403, 500 |

### ENABLER - Full Supported Operations

| Step | User Intent / Action | Endpoint | Happy Status | Unhappy Status / Failure Path |
|---|---|---|---|---|
| 1 | CSRF Bootstrap | `GET {{platform_base_url}}/health` | 200 | 503 |
| 2 | Register | `POST {{platform_base_url}}/api/auth/register` | 200 | 400, 409, 422, 429, 500 |
| 3 | Login | `POST {{platform_base_url}}/api/auth/login` | 200 | 400, 401, 403, 429, 500 |
| 4 | KYC Submission | `POST {{platform_base_url}}/api/compliance/api/compliance/verify-document` | 200 | none |
| 5 | KYC Admin Approval | `POST {{platform_base_url}}/api/compliance/api/compliance/manual-review` | 200 | none |
| 6 | KYC Verified Check | `GET {{platform_base_url}}/api/compliance/api/compliance/kyc-status/{{role_enabler_user_id}}` | 200 | none |
| 7 | Verify Session | `GET {{platform_base_url}}/api/auth/verify` | 200 | 400, 401, 403, 500 |
| 8 | Catalog Health | `GET {{platform_base_url}}/api/catalog/health` | 200 | none |
| 9 | Catalog Pricing Calculate | `POST {{platform_base_url}}/api/catalog/pricing/calculate` | 200 | 400, 401, 403, 422, 500 |
| 10 | Order List | `GET {{platform_base_url}}/api/order/orders?buyerId={{role_enabler_user_id}}` | 200 | 400, 401, 403, 500, 503 |
| 11 | Order Create | `POST {{platform_base_url}}/api/order/orders` | 200, 201 | 400, 401, 403, 422, 500, 503 |
| 12 | Order Analytics | `GET {{platform_base_url}}/api/order/orders/analytics/stats` | 200 | 401, 403, 500, 503 |
| 13 | Notification Health | `GET {{platform_base_url}}/api/notification/health` | 200 | none |
| 14 | Notification SMS Statistics | `GET {{platform_base_url}}/api/notification/sms/statistics` | 200 | 400, 401, 403, 500 |
| 15 | Notification SMS Send | `POST {{platform_base_url}}/api/notification/sms/send` | 200, 201 | 400, 401, 403, 422, 500 |
| 16 | Enabler Hub Products | `GET {{platform_base_url}}/api/enabler/hub/products` | 200 | 401, 403, 500 |
| 17 | Enabler Register Reachability | `POST {{platform_base_url}}/api/enabler/enablers/register` | 200, 201 | 400, 401, 403, 422, 500 |
| 18 | Maps Health | `GET {{platform_base_url}}/api/maps/health` | 200 | 503 |
| 19 | Maps Ready | `GET {{platform_base_url}}/api/maps/health/ready` | 200 | 503 |
| 20 | Compliance Verify Document | `POST {{platform_base_url}}/api/compliance/api/compliance/verify-document` | 200 | 400, 401, 403, 422, 500 |
| 21 | Compliance KYC Status | `GET {{platform_base_url}}/api/compliance/api/compliance/kyc-status/{{role_enabler_user_id}}` | 200 | 400, 401, 403, 404, 422, 500 |
| 22 | Production Dashboard | `GET {{platform_base_url}}/api/production/dashboard` | 200 | 401, 403, 500 |
| 23 | Support Tickets List | `GET {{platform_base_url}}/api/support/tickets` | 200 | 401, 403, 500 |
| 24 | Support Ticket Create | `POST {{platform_base_url}}/api/support/tickets` | 200, 201 | 400, 401, 403, 422, 500 |
| 25 | Logout | `POST {{platform_base_url}}/api/auth/logout` | 200 | 400, 401, 403, 500 |

### SYSTEM - Full Supported Operations

| Step | User Intent / Action | Endpoint | Happy Status | Unhappy Status / Failure Path |
|---|---|---|---|---|
| 1 | CSRF Bootstrap | `GET {{platform_base_url}}/health` | 200 | 503 |
| 2 | Register | `POST {{platform_base_url}}/api/auth/register` | 200 | 400, 409, 422, 429, 500 |
| 3 | Login | `POST {{platform_base_url}}/api/auth/login` | 200 | 400, 401, 403, 429, 500 |
| 4 | Verify Session | `GET {{platform_base_url}}/api/auth/verify` | 200 | 400, 401, 403, 500 |
| 5 | Catalog Health | `GET {{platform_base_url}}/api/catalog/health` | 200 | none |
| 6 | Catalog Pricing Calculate | `POST {{platform_base_url}}/api/catalog/pricing/calculate` | 200 | 400, 401, 403, 422, 500 |
| 7 | Order List | `GET {{platform_base_url}}/api/order/orders?buyerId={{role_system_user_id}}` | 200 | 400, 401, 403, 500, 503 |
| 8 | Order Create | `POST {{platform_base_url}}/api/order/orders` | 200, 201 | 400, 401, 403, 422, 500, 503 |
| 9 | Order Analytics | `GET {{platform_base_url}}/api/order/orders/analytics/stats` | 200 | 401, 403, 500, 503 |
| 10 | Notification Health | `GET {{platform_base_url}}/api/notification/health` | 200 | none |
| 11 | Notification SMS Statistics | `GET {{platform_base_url}}/api/notification/sms/statistics` | 200 | 400, 401, 403, 500 |
| 12 | Notification SMS Send | `POST {{platform_base_url}}/api/notification/sms/send` | 200, 201 | 400, 401, 403, 422, 500 |
| 13 | Enabler Hub Products | `GET {{platform_base_url}}/api/enabler/hub/products` | 200 | 401, 403, 500 |
| 14 | Enabler Register Reachability | `POST {{platform_base_url}}/api/enabler/enablers/register` | 200, 201 | 400, 401, 403, 422, 500 |
| 15 | Maps Health | `GET {{platform_base_url}}/api/maps/health` | 200 | 503 |
| 16 | Maps Ready | `GET {{platform_base_url}}/api/maps/health/ready` | 200 | 503 |
| 17 | Compliance Verify Document | `POST {{platform_base_url}}/api/compliance/api/compliance/verify-document` | 200 | 400, 401, 403, 422, 500 |
| 18 | Compliance KYC Status | `GET {{platform_base_url}}/api/compliance/api/compliance/kyc-status/{{role_system_user_id}}` | 200 | 400, 401, 403, 404, 422, 500 |
| 19 | Production Dashboard | `GET {{platform_base_url}}/api/production/dashboard` | 200 | 401, 403, 500 |
| 20 | Support Tickets List | `GET {{platform_base_url}}/api/support/tickets` | 200 | 401, 403, 500 |
| 21 | Support Ticket Create | `POST {{platform_base_url}}/api/support/tickets` | 200, 201 | 400, 401, 403, 422, 500 |
| 22 | Logout | `POST {{platform_base_url}}/api/auth/logout` | 200 | 400, 401, 403, 500 |

## Authentication and Security Operations

| Step | User Intent / Action | Endpoint | Happy Status | Unhappy Status / Failure Path |
|---|---|---|---|---|
| 1 | Auth CSRF Bootstrap | `GET {{platform_base_url}}/health` | 200 | 503 |
| 2 | Auth Register | `POST {{platform_base_url}}/api/auth/register` | 200 | 400, 409, 422, 429, 500 |
| 3 | Auth Login (Capture Token When Available) | `POST {{platform_base_url}}/api/auth/login` | 200 | 400, 401, 403, 429, 500 |
| 4 | Auth Verify Session | `GET {{platform_base_url}}/api/auth/verify` | 200 | 400, 401, 403, 500 |
| 5 | Auth Refresh Token (Stub/Not Implemented) | `POST {{platform_base_url}}/api/auth/refresh` | 200 | 400, 401, 403, 500, 501 |
| 6 | Auth Logout | `POST {{platform_base_url}}/api/auth/logout` | 200 | 400, 401, 403, 500 |
| 7 | Auth Forgot Password (Stub/Not Implemented) | `POST {{platform_base_url}}/api/auth/forgot-password` | 200 | 400, 401, 403, 422, 429, 500, 501 |
| 8 | Auth Reset Password Route Reachability (Stub/Not Implemented) | `POST {{platform_base_url}}/api/auth/reset-password` | none | 400, 401, 403, 422, 500, 501 |
| 9 | Auth 2FA Enable Route Reachability (Stub/Not Implemented) | `POST {{platform_base_url}}/api/auth/2fa/enable` | none | 400, 401, 403, 422, 500, 501 |
| 10 | Auth 2FA Disable Route Reachability (Stub/Not Implemented) | `POST {{platform_base_url}}/api/auth/2fa/disable` | none | 400, 401, 403, 422, 500, 501 |
| 11 | Auth 2FA Verify Route Reachability (Stub/Not Implemented) | `POST {{platform_base_url}}/api/auth/2fa/verify` | none | 400, 401, 403, 422, 500, 501 |
| 12 | Auth Report Suspicious Activity | `POST {{platform_base_url}}/api/auth/report-suspicious` | 200 | 400, 401, 403, 422, 500 |
| 13 | Auth Stats Route Reachability | `GET {{platform_base_url}}/api/auth/stats` | 200 | 401, 403, 500 |
| 14 | Auth 2FA Setup Route Reachability | `POST {{platform_base_url}}/api/auth/2fa/setup` | 200 | 400, 401, 403, 500 |
| 15 | Auth 2FA Verify Setup Route Reachability | `POST {{platform_base_url}}/api/auth/2fa/verify-setup` | 200 | 400, 401, 403, 500 |
| 16 | Auth 2FA Backup Code Verification | `POST {{platform_base_url}}/api/auth/2fa/backup` | 200 | 400, 401, 403, 500 |
| 17 | Auth 2FA Backup Code Regeneration | `POST {{platform_base_url}}/api/auth/2fa/backup-codes/regenerate` | 200 | 400, 401, 403, 500 |
| 18 | Auth 2FA Status Route Reachability | `GET {{platform_base_url}}/api/auth/2fa/status` | 200 | 400, 401, 403, 500 |
| 19 | Auth Session Create | `POST {{platform_base_url}}/api/auth/sessions` | 201 | 400, 422, 500 |
| 20 | Auth Session List | `GET {{platform_base_url}}/api/auth/sessions?userId={{user_id}}` | 200 | 400, 500 |
| 21 | Auth Session Delete | `DELETE {{platform_base_url}}/api/auth/sessions/{{session_id}}` | 204 | 400, 404, 500 |

## Mounted Module Operations (Pass + Fail)

| Step | User Intent / Action | Endpoint | Happy Status | Unhappy Status / Failure Path |
|---|---|---|---|---|
| 1 | Catalog Health | `GET {{platform_base_url}}/api/catalog/health` | 200 | none |
| 2 | Catalog Pricing Calculate Route Reachability | `POST {{platform_base_url}}/api/catalog/pricing/calculate` | 200 | 400, 422, 500 |
| 3 | Catalog Pricing Invalid Payload | `POST {{platform_base_url}}/api/catalog/pricing/calculate` | none | 400, 422, 500 |
| 4 | Hub Products | `GET {{platform_base_url}}/api/enabler/hub/products` | 200 | none |
| 5 | Register Route Reachability | `POST {{platform_base_url}}/api/enabler/enablers/register` | 200, 201 | 400, 422, 500 |
| 6 | Register Invalid | `POST {{platform_base_url}}/api/enabler/enablers/register` | none | 400, 422, 500 |
| 7 | Notification Health | `GET {{platform_base_url}}/api/notification/health` | 200 | none |
| 8 | Notification SMS Statistics Route Reachability | `GET {{platform_base_url}}/api/notification/sms/statistics` | 200 | 400, 500 |
| 9 | Notification SMS Send Invalid Phone | `POST {{platform_base_url}}/api/notification/sms/send` | none | 400, 422, 500 |
| 10 | Order List Route Reachability | `GET {{platform_base_url}}/api/order/orders?buyerId=buyer-1` | 200 | 400, 500, 503 |
| 11 | Order Create Route Reachability | `POST {{platform_base_url}}/api/order/orders` | 201, 200 | 400, 422, 500 |
| 12 | Order Create Invalid | `POST {{platform_base_url}}/api/order/orders` | none | 400, 422, 500 |
| 13 | Order Analytics Route Reachability | `GET {{platform_base_url}}/api/order/orders/analytics/stats` | 200 | 500 |
| 14 | Maps Health | `GET {{platform_base_url}}/api/maps/health` | 200 | 503 |
| 15 | Maps Ready | `GET {{platform_base_url}}/api/maps/health/ready` | 200 | none |
| 16 | Maps Live | `GET {{platform_base_url}}/api/maps/health/live` | 200 | none |
| 17 | Compliance Route Reachability (verify-document) | `POST {{platform_base_url}}/api/compliance/api/compliance/verify-document` | 200 | 400, 422, 500 |
| 18 | Compliance Invalid Payload | `POST {{platform_base_url}}/api/compliance/api/compliance/verify-document` | none | 422, 400 |
| 19 | Compliance KYC Status Route Reachability | `GET {{platform_base_url}}/api/compliance/api/compliance/kyc-status/ckyc000000000000000000001` | 200 | 404, 400, 500 |
| 20 | Production Dashboard Route Reachability | `GET {{platform_base_url}}/api/production/dashboard` | 200 | 401, 403, 500 |
| 21 | Production Create Plan Invalid | `POST {{platform_base_url}}/api/production/plans` | none | 400, 422, 500 |
| 22 | Support Tickets Route Reachability | `GET {{platform_base_url}}/api/support/tickets` | none | 401, 403, 500 |
| 23 | Support Create Ticket Unauthorized | `POST {{platform_base_url}}/api/support/tickets` | none | 401, 403 |

## Secondary Module Reachability (Mounted After Wiring)

| Step | User Intent / Action | Endpoint | Happy Status | Unhappy Status / Failure Path |
|---|---|---|---|---|
| 1 | User Module Health | `GET {{platform_base_url}}/api/user/health` | 200 | 503 |
| 2 | Business Registry Health | `GET {{platform_base_url}}/api/business-registry/health` | 200 | 503 |
| 3 | Checkout Initiate Reachability | `POST {{platform_base_url}}/api/checkout/initiate` | 200, 201 | 400, 422, 500 |
| 4 | Payment Health | `GET {{platform_base_url}}/api/payment/health` | 200 | 503 |
| 5 | Payment Create Reachability | `POST {{platform_base_url}}/api/payment/payments` | 200, 201 | 400, 422, 429, 500, 503 |
| 6 | Wallet Health | `GET {{platform_base_url}}/api/wallet/health` | 200 | 503 |
| 7 | Wallet Balance Unauthorized | `GET {{platform_base_url}}/api/wallet/wallets/u1/balance` | none | 401, 403 |
| 8 | Payout Create Reachability | `POST {{platform_base_url}}/api/payout/payouts` | 200, 201 | 400, 422, 500 |
| 9 | Training Health | `GET {{platform_base_url}}/api/training/api/health` | 200 | 503 |
| 10 | Logistics Health | `GET {{platform_base_url}}/api/logistics/health` | 200 | 503 |
| 11 | Community Health | `GET {{platform_base_url}}/api/community/health` | 200 | 503 |
| 12 | Analytics Health | `GET {{platform_base_url}}/api/analytics/health` | 200 | 503 |
| 13 | Inventory Health | `GET {{platform_base_url}}/api/inventory/health` | 200 | 503 |
| 14 | Commission Health | `GET {{platform_base_url}}/api/commission/health` | 200 | 503 |

## Negative / Failure Path Operations

### 05 - Auth and Security Failures

| Step | User Intent / Action | Endpoint | Happy Status | Unhappy Status / Failure Path |
|---|---|---|---|---|
| 1 | Auth Verify Without Authorization Header | `GET {{platform_base_url}}/api/auth/verify` | none | 400, 401, 403 |
| 2 | Auth Forgot Password Invalid Email | `POST {{platform_base_url}}/api/auth/forgot-password` | none | 400, 422, 403 |
| 3 | Auth Reset Password Invalid Token | `POST {{platform_base_url}}/api/auth/reset-password` | none | 400, 422, 403 |
| 4 | Auth Report Suspicious Missing Fields | `POST {{platform_base_url}}/api/auth/report-suspicious` | none | 400, 422 |

### 06 - Order and Catalog Failures

| Step | User Intent / Action | Endpoint | Happy Status | Unhappy Status / Failure Path |
|---|---|---|---|---|
| 1 | Order Get Missing | `GET {{platform_base_url}}/api/order/orders/{{missing_id}}` | none | 404, 500 |
| 2 | Order COD Validate Invalid Payload | `POST {{platform_base_url}}/api/order/orders/cod/validate` | none | 400, 422, 500 |
| 3 | Order Resolve Dispute Missing Data | `POST {{platform_base_url}}/api/order/orders/disputes/{{missing_id}}/resolve` | none | 400, 404, 500 |
| 4 | Catalog Unknown Route | `GET {{platform_base_url}}/api/catalog/unknown` | none | 404 |

### 07 - Notification and Enabler Failures

| Step | User Intent / Action | Endpoint | Happy Status | Unhappy Status / Failure Path |
|---|---|---|---|---|
| 1 | Notification SMS Retry Missing Message | `POST {{platform_base_url}}/api/notification/sms/retry/` | none | 404 |
| 2 | Notification SMS Webhook Invalid Body | `POST {{platform_base_url}}/api/notification/sms/webhook/africastalking` | 200 | 400, 500 |
| 3 | Protected Route Unauthorized | `POST {{platform_base_url}}/api/enabler/enablers/{{enabler_id}}/listings` | none | 401, 403, 500 |

## Regression Sentinel Operations

| Step | User Intent / Action | Endpoint | Happy Status | Unhappy Status / Failure Path |
|---|---|---|---|---|
| 1 | Global Health Still Available | `GET {{platform_base_url}}/health` | 200 | 503 |
| 2 | Auth Route Still Mounted | `GET {{platform_base_url}}/api/auth/verify` | 200, 201, 202, 204 | 400, 401, 403, 404, 409, 422, 429, 500, 501, 503 |
| 3 | Catalog Route Still Mounted | `GET {{platform_base_url}}/api/catalog/health` | 200 | none |
| 4 | Notification Route Still Mounted | `GET {{platform_base_url}}/api/notification/health` | 200 | none |
| 5 | Order Route Still Mounted | `GET {{platform_base_url}}/api/order/orders?buyerId=buyer-1` | 200, 201, 202, 204 | 400, 401, 403, 404, 409, 422, 429, 500, 501, 503 |

## Operational Decision Rules

1. If a protected action returns `401/403`, re-authenticate and re-run session verify before retry.
2. If a write action returns `400/422`, correct payload and retry the same step.
3. If `429`, apply backoff and retry after cooldown; avoid rapid retries.
4. If `500`, capture correlation id, payload, role, and endpoint for incident triage.
5. If `503`, treat as degraded system/dependency and retry after readiness checks.
6. If `404` on an endpoint that should be mounted, treat as routing regression and escalate.

## Expanded Mounted Operations (Added Coverage)

### Catalog Promotions (Campaigns) Lifecycle

Role focus: `seller`, `admin`, `system`.

| Step | User Intent / Action | Endpoint | Happy Status | Unhappy Status / Failure Path |
|---|---|---|---|---|
| 1 | Create promotion campaign | `POST /api/catalog/campaigns` | 201 | 400 |
| 2 | List campaigns/promotions | `GET /api/catalog/campaigns` | 200 | 400 |
| 3 | Get campaign details | `GET /api/catalog/campaigns/:id` | 200 | 404 |
| 4 | Update campaign settings | `PUT /api/catalog/campaigns/:id` | 200 | 400 |
| 5 | Launch campaign | `POST /api/catalog/campaigns/:id/launch` | 200 | 400 |
| 6 | Pause live campaign | `POST /api/catalog/campaigns/:id/pause` | 200 | 400 |
| 7 | Resume paused campaign | `POST /api/catalog/campaigns/:id/resume` | 200 | 400 |
| 8 | Cancel campaign | `POST /api/catalog/campaigns/:id/cancel` | 200 | 400 |
| 9 | Complete campaign | `POST /api/catalog/campaigns/:id/complete` | 200 | 400 |

### Enabler Commerce Operations

Role focus: `enabler`, `admin`.

| Step | User Intent / Action | Endpoint | Happy Status | Unhappy Status / Failure Path |
|---|---|---|---|---|
| 1 | Register enabler profile | `POST /api/enabler/enablers/register` | 201 | 400 |
| 2 | Approve enabler profile | `POST /api/enabler/enablers/:id/approve` | 200 | 400 |
| 3 | Fetch enabler profile | `GET /api/enabler/enablers/:id` | 200 | 404, 500 |
| 4 | Create enabler product listing (protected) | `POST /api/enabler/enablers/:enablerId/listings` | 201 | 400, 401, 403, 500 |
| 5 | List enabler listings (protected) | `GET /api/enabler/enablers/:enablerId/listings` | 200 | 401, 403, 500 |
| 6 | Create enabler-facilitated order (protected) | `POST /api/enabler/enablers/:enablerId/orders` | 201 | 400, 401, 403, 500 |
| 7 | List enabler orders (protected) | `GET /api/enabler/enablers/:enablerId/orders` | 200 | 401, 403, 500 |
| 8 | Browse hub products | `GET /api/enabler/hub/products` | 200 | 500 |

### Order Advanced Lifecycle Operations

Role focus: `buyer`, `seller`, `courier`, `system`.

| Step | User Intent / Action | Endpoint | Happy Status | Unhappy Status / Failure Path |
|---|---|---|---|---|
| 1 | Fetch single order | `GET /api/order/orders/:id` | 200 | 404, 500 |
| 2 | Update order data | `PUT /api/order/orders/:id` | 200 | 404, 500 |
| 3 | Transition order status (confirm/process/ship/complete) | `POST /api/order/orders/:id/status` | 200 | 400, 403, 404, 500 |
| 4 | Cancel order | `DELETE /api/order/orders/:id` | 200 | 403, 404, 500 |
| 5 | Search orders by status or buyer | `GET /api/order/orders/search` | 200 | 500 |
| 6 | Validate COD eligibility | `POST /api/order/orders/cod/validate` | 200 | 400 |
| 7 | Resolve COD dispute | `POST /api/order/orders/disputes/:id/resolve` | 200 | 400 |

### Production Operations Beyond Dashboard

Role focus: `supplier`, `system`, `admin`.

| Step | User Intent / Action | Endpoint | Happy Status | Unhappy Status / Failure Path |
|---|---|---|---|---|
| 1 | Create production plan | `POST /api/production/plans` | 201 | 400 |
| 2 | Update production plan status | `PUT /api/production/plans/:id/status` | 200 | 400 |
| 3 | Record quality checkpoint | `POST /api/production/quality/checkpoints` | 201 | 400 |
| 4 | Read production dashboard | `GET /api/production/dashboard` | 200 | 400, 500 |
| 5 | Calculate production capacity | `GET /api/production/capacity` | 200 | 500 |

### Support Ticket Full Lifecycle

Role focus: `buyer` (ticket owner), `agent`, `admin`.

| Step | User Intent / Action | Endpoint | Happy Status | Unhappy Status / Failure Path |
|---|---|---|---|---|
| 1 | Create support ticket | `POST /api/support/tickets` | 201 | 400, 401 |
| 2 | List tickets (agent/admin scope) | `GET /api/support/tickets` | 200 | 400, 401, 403 |
| 3 | Get ticket details | `GET /api/support/tickets/:id` | 200 | 401, 404 |
| 4 | Add ticket message | `POST /api/support/tickets/:id/messages` | 201 | 400, 401 |
| 5 | Assign ticket to agent | `POST /api/support/tickets/:id/assign` | 200 | 400, 401, 403 |
| 6 | Resolve ticket | `POST /api/support/tickets/:id/resolve` | 200 | 400, 401, 403 |
| 7 | Close ticket | `POST /api/support/tickets/:id/close` | 200 | 400, 401 |
| 8 | Create support agent (admin) | `POST /api/support/agents` | 201 | 400, 401, 403 |
| 9 | Update support agent (admin) | `PUT /api/support/agents/:id` | 200 | 400, 401, 403 |

### Notification SMS Full Lifecycle

Role focus: `system`, `enabler`, `seller`, `buyer`.

| Step | User Intent / Action | Endpoint | Happy Status | Unhappy Status / Failure Path |
|---|---|---|---|---|
| 1 | Send SMS | `POST /api/notification/sms/send` | 201 | 400 |
| 2 | Query message status | `GET /api/notification/sms/status/:messageId` | 200 | 500 |
| 3 | Retry failed batch | `POST /api/notification/sms/retry/failed` | 200 | 500 |
| 4 | Retry one message | `POST /api/notification/sms/retry/:messageId` | 200 | 400, 500 |
| 5 | Read SMS statistics | `GET /api/notification/sms/statistics` | 200 | 500 |
| 6 | Receive provider webhook | `POST /api/notification/sms/webhook/africastalking` | 200 | 500 |

### Advanced Compliance Operations

Role focus: `admin`, `system`, `compliance officer`.

| Step | User Intent / Action | Endpoint | Happy Status | Unhappy Status / Failure Path |
|---|---|---|---|---|
| 1 | Verify user document | `POST /api/compliance/api/compliance/verify-document` | 200 | 400, 422 |
| 2 | Manual review decision | `POST /api/compliance/api/compliance/manual-review` | 200 | 400, 404, 422 |
| 3 | Run risk assessment | `POST /api/compliance/api/compliance/risk-assessment` | 200 | 400, 422 |
| 4 | Monitor compliance event | `POST /api/compliance/api/compliance/monitor` | 200 | 400, 422 |
| 5 | Generate compliance report | `POST /api/compliance/api/compliance/generate-report` | 200 | 400, 422 |
| 6 | Record compliance audit entry | `POST /api/compliance/api/compliance/audit-log` | 200 | 400, 422 |
| 7 | Read user KYC status | `GET /api/compliance/api/compliance/kyc-status/:userId` | 200 | 400, 404, 422 |
| 8 | Read compliance metrics | `GET /api/compliance/metrics` | 200 | 500 |

## Implemented But Currently Not Mounted (Operational Gap Inventory)

These routes exist in code but are not mounted by current module composition, so monolith behavior is expected `404` until mounted.

### Catalog Product Fetch/Search Operations (Gap)

Expected future base path if mounted under catalog module: `/api/catalog/api/v1`.

| User Intent / Action | Implemented Route | Typical Intended Happy Path | Current Runtime State |
|---|---|---|---|
| Fetch product by id | `GET /products/:id` | 200 | 404 (not mounted) |
| Search products | `GET /products/search` | 200 | 404 (not mounted) |
| Fetch seller products | `GET /sellers/:sellerId/products` | 200 | 404 (not mounted) |
| Fetch category attributes | `GET /categories/:categoryId/attributes` | 200 | 404 (not mounted) |
| Get product analytics | `GET /products/:id/analytics` | 200 | 404 (not mounted) |
| Create/update/delete product | `POST/PUT/DELETE /products/:id` | 201/200 | 404 (not mounted) |

### Catalog Search Experience Operations (Gap)

Expected future base path if mounted under catalog module: `/api/catalog/api/v1`.

| User Intent / Action | Implemented Route | Typical Intended Happy Path | Current Runtime State |
|---|---|---|---|
| Search suggestions | `GET /search/suggestions` | 200 | 404 (not mounted) |
| Popular searches | `GET /search/popular` | 200 | 404 (not mounted) |
| Search analytics | `GET /search/analytics` | 200 | 404 (not mounted) |
| Legacy search redirect | `GET /search` | 301/200 | 404 (not mounted) |

### Additional Not-Mounted Inventories

| Area | Example Routes | Current Runtime State |
|---|---|---|
| Catalog matching | `/match`, `/match/pending`, `/match/audit/:productId` | 404 (not mounted) |
| Catalog buy-box | `/products/:productId/buy-box` | 404 (not mounted) |
| Notification templates/preferences APIs | `/api/notification/templates/*`, `/api/notification/preferences/*` | 404 (not mounted) |
| Auth admin/google OAuth route modules | admin/google routes present in service code | not mounted in current module router |

## Catalog Discovery and Promotion Deep-Dive (Missing-Step Closure)

This section explicitly closes the documented gaps for product fetching, promotion fetching, and search flows.

### Live Now: Promotion Fetching and Product Feed

| Step | User Intent / Action | Endpoint | Happy Status | Unhappy Status / Failure Path |
|---|---|---|---|---|
| 1 | Fetch promotions list | `GET {{platform_base_url}}/api/catalog/campaigns` | 200 | 400, 500 |
| 2 | Fetch promotion by ID | `GET {{platform_base_url}}/api/catalog/campaigns/:id` | 200 | 404, 500 |
| 3 | Fetch promotion lifecycle state after launch/pause/resume/cancel/complete | `GET {{platform_base_url}}/api/catalog/campaigns/:id` | 200 | 404, 500 |
| 4 | Fetch role-neutral product feed (hub) | `GET {{platform_base_url}}/api/enabler/hub/products` | 200 | 401, 403, 500 |
| 5 | Fetch catalog pricing result for selected product context | `POST {{platform_base_url}}/api/catalog/pricing/calculate` | 200 | 400, 422, 500 |

### Implemented But Not Mounted: Product Fetching Operations

Current monolith state for the routes below: expected `404` until catalog route wiring mounts these routers.

Expected versioned base path when mounted: `{{platform_base_url}}/api/catalog/api/v1`.

| Step | User Intent / Action | Target Endpoint | Intended Happy Status | Current Runtime State |
|---|---|---|---|---|
| 1 | Fetch product by ID | `GET /products/:id` | 200 | 404 (not mounted) |
| 2 | Search products by query/filters | `GET /products/search` | 200 | 404 (not mounted) |
| 3 | Fetch seller products | `GET /sellers/:sellerId/products` | 200 | 404 (not mounted) |
| 4 | Fetch category attributes | `GET /categories/:categoryId/attributes` | 200 | 404 (not mounted) |
| 5 | Fetch product analytics | `GET /products/:id/analytics` | 200 | 404 (not mounted) |
| 6 | Fetch product metrics | `GET /products/:id/metrics` | 200, 501 | 404 (not mounted) |
| 7 | Fetch product media | `GET /products/:id/media` | 200, 501 | 404 (not mounted) |

Failure paths once mounted:

- `400`: malformed/invalid request.
- `401/403`: auth or role guard failure.
- `404`: product/seller/category not found.
- `429`: request throttling/rate limit.
- `500`: service/internal processing error.
- `501`: endpoint reachable but behavior stubbed/not implemented yet.

### Implemented But Not Mounted: Search and Discovery Operations

Current monolith state for the routes below: expected `404` until mounted.

Expected versioned base path when mounted: `{{platform_base_url}}/api/catalog/api/v1`.

| Step | User Intent / Action | Target Endpoint | Intended Happy Status | Current Runtime State |
|---|---|---|---|---|
| 1 | Search products | `GET /products/search` | 200 | 404 (not mounted) |
| 2 | Fetch autocomplete suggestions | `GET /search/suggestions` | 200 | 404 (not mounted) |
| 3 | Fetch popular search terms | `GET /search/popular` | 200 | 404 (not mounted) |
| 4 | Fetch search analytics | `GET /search/analytics` | 200 | 404 (not mounted) |
| 5 | Use legacy search endpoint | `GET /search` | 301, 200 | 404 (not mounted) |
| 6 | Use legacy product-search endpoint | `GET /search/products` | 301, 200 | 404 (not mounted) |

### Implemented But Not Mounted: Additional Catalog Discovery Operations

| Step | User Intent / Action | Target Endpoint (if mounted) | Intended Happy Status | Current Runtime State |
|---|---|---|---|---|
| 1 | Fetch seller storefront | `GET {{platform_base_url}}/api/catalog/sellers/:sellerId/storefront` | 200 | 404 (not mounted) |
| 2 | Fetch seller storefront share URL | `POST {{platform_base_url}}/api/catalog/sellers/:sellerId/share-url` | 200, 201 | 404 (not mounted) |
| 3 | Fetch pending product matches | `GET {{platform_base_url}}/api/catalog/match/pending` | 200 | 404 (not mounted) |
| 4 | Fetch match audit trail | `GET {{platform_base_url}}/api/catalog/match/audit/:productId` | 200 | 404 (not mounted) |
| 5 | Fetch buy-box winner details | `GET {{platform_base_url}}/api/catalog/products/:productId/buy-box` | 200 | 404 (not mounted) |

### End-to-End Fetch/Search Journey Contracts

#### Buyer Discovery Journey

1. Fetch promotions: `GET /api/catalog/campaigns` must return `200` for mounted promotions.
2. Fetch product feed: `GET /api/enabler/hub/products` must return `200` for available feed data.
3. Search products (versioned): `GET /api/catalog/api/v1/products/search` currently returns `404` until mounted; target happy status is `200`.
4. Fetch product details (versioned): `GET /api/catalog/api/v1/products/:id` currently returns `404` until mounted; target happy status is `200`.
5. Price selected item: `POST /api/catalog/pricing/calculate` returns `200` on valid payload; `400/422` on invalid payload.

#### Seller Merchandising Journey

1. Create/update promotion campaign: `POST/PUT /api/catalog/campaigns` returns `201/200` on valid payload.
2. Launch campaign and verify by fetch: `POST /api/catalog/campaigns/:id/launch` then `GET /api/catalog/campaigns/:id`.
3. Fetch own products (versioned): `GET /api/catalog/api/v1/sellers/:sellerId/products` currently `404` until mounted.
4. Fetch analytics for listed product (versioned): `GET /api/catalog/api/v1/products/:id/analytics` currently `404` until mounted.
5. Run pricing compute to validate margins before publishing: `POST /api/catalog/pricing/calculate`.

## Logical Validity Constraints (Mandatory)

The following sequencing rules are required so operations are meaningful and not synthetic.

1. Buyer discovery/search flows must not run until seller catalog supply exists and is published.
2. Promotion fetch flows are only meaningful after at least one campaign is created and launched.
3. Product analytics/metrics fetch is only meaningful for an existing published product id.
4. Order create/list/search flows are only meaningful after buyer identity and at least one product reference are available.
5. Role-restricted flows (`seller`, `supplier`, `courier`, `enabler`) must enforce KYC submit -> admin approve -> verified check before protected operations.

## Search Readiness Contract (100+ Products)

Minimum dataset before executing search/suggestions/popular/analytics scenarios:

1. One verified seller creates at least `100` products.
2. At least `80` products are published/active.
3. Dataset distribution for meaningful filters:
   - At least `5` categories.
   - At least `10` products per category.
   - At least `10` brands overall.
   - Price spread across low/mid/high ranges.
4. Optional campaign linkage:
   - At least `20` products attached to active campaigns so promotions + discovery can be validated together.

If these conditions are not met, search tests should be marked `BLOCKED_PRECONDITION` instead of run as pass/fail checks.

## Strict Sequence for Valid Product Search Scenarios

### Seller Supply Setup (must complete first)

| Step | User Intent / Action | Endpoint | Success Output Required | Failure Path |
|---|---|---|---|---|
| 1 | Register seller and login | `POST /api/auth/register` + `POST /api/auth/login` | `seller_user_id`, token | 400, 401, 409, 422 |
| 2 | Complete seller KYC cycle | KYC submit + admin approve + verify | `kyc_verified=true` | 400, 403, 404, 422 |
| 3 | Seed 100 products | `POST /api/catalog/api/v1/products` (x100) or `POST /api/catalog/api/v1/products/bulk` | `>=100` product ids persisted | 400, 401, 403, 404, 422, 500 |
| 4 | Publish sellable inventory | `POST /api/catalog/api/v1/products/:id/publish` | `>=80` published products | 400, 401, 403, 404, 500 |
| 5 | Validate supply count | `GET /api/catalog/api/v1/sellers/:sellerId/products` | count threshold satisfied | 400, 401, 403, 404, 500 |
| 6 | Launch at least one campaign | `POST /api/catalog/campaigns` + `/launch` | active campaign id | 400, 404, 500 |

### Buyer Discovery/Search (runs only after setup)

| Step | User Intent / Action | Endpoint | Happy Path Meaning | Failure Path |
|---|---|---|---|---|
| 1 | Fetch active promotions | `GET /api/catalog/campaigns` | buyer sees non-empty campaign set | 400, 500 |
| 2 | Fetch product feed | `GET /api/enabler/hub/products` | non-empty feed with campaign-eligible items | 401, 403, 500 |
| 3 | Search by text/category | `GET /api/catalog/api/v1/products/search?q=...&category=...` | result set reflects seeded distribution | 400, 404, 500 |
| 4 | Search with price filters | `GET /api/catalog/api/v1/products/search?minPrice=...&maxPrice=...` | range-filtered subset returned | 400, 404, 500 |
| 5 | Fetch suggestions | `GET /api/catalog/api/v1/search/suggestions?q=...` | autocomplete terms derived from seeded corpus | 400, 404, 500 |
| 6 | Fetch popular terms | `GET /api/catalog/api/v1/search/popular` | top queries present after search traffic | 400, 404, 500 |
| 7 | Fetch one product details | `GET /api/catalog/api/v1/products/:id` | details match product seeded by seller | 400, 404, 500 |

Note: in current monolith wiring, `/api/catalog/api/v1/*` routes are implemented but not mounted; these steps currently return `404` until router wiring is enabled.

## Additional Mounted Service Operations (Deep Coverage)

These sections add full operational coverage for the modules that were wired and mounted after the first pass. All endpoints below assume the single entry point `{{platform_base_url}}` (port `3000`).

### Business Registry (Registration + Verification Lifecycle)

Preconditions: business owner identity exists (user id), and compliance module reachable for verification hooks.

| Step | User Intent / Action | Endpoint | Happy Status | Unhappy Status / Failure Path |
|---|---|---|---|---|
| 1 | Create business record | `POST {{platform_base_url}}/api/business-registry/businesses` | 201 | 400, 422, 500 |
| 2 | Search businesses | `GET {{platform_base_url}}/api/business-registry/businesses/search` | 200 | 400, 500 |
| 3 | List businesses by owner | `GET {{platform_base_url}}/api/business-registry/businesses/owner/:ownerId` | 200 | 400, 404, 500 |
| 4 | Fetch business by id | `GET {{platform_base_url}}/api/business-registry/businesses/:id` | 200 | 404, 500 |
| 5 | Update business record | `PUT {{platform_base_url}}/api/business-registry/businesses/:id` | 200 | 400, 404, 422, 500 |
| 6 | Verify business | `POST {{platform_base_url}}/api/business-registry/businesses/:id/verify` | 200 | 400, 404, 422, 500 |
| 7 | Suspend business | `POST {{platform_base_url}}/api/business-registry/businesses/:id/suspend` | 200 | 400, 404, 422, 500 |
| 8 | Reactivate business | `POST {{platform_base_url}}/api/business-registry/businesses/:id/reactivate` | 200 | 400, 404, 422, 500 |
| 9 | Delete business | `DELETE {{platform_base_url}}/api/business-registry/businesses/:id` | 200, 204 | 400, 404, 500 |

### Payment (Collection, Status, Refund, Webhooks)

Preconditions: order exists and payment provider configuration is valid. Some failure paths are expected when providers are unreachable.

| Step | User Intent / Action | Endpoint | Happy Status | Unhappy Status / Failure Path |
|---|---|---|---|---|
| 1 | Create payment | `POST {{platform_base_url}}/api/payment/payments` | 200, 201 | 400, 422, 429, 500, 503 |
| 2 | Fetch payment by id | `GET {{platform_base_url}}/api/payment/payments/:id` | 200 | 404, 500 |
| 3 | Fetch payment by order id | `GET {{platform_base_url}}/api/payment/payments/order/:orderId` | 200 | 404, 500 |
| 4 | Check payment status | `GET {{platform_base_url}}/api/payment/payments/:id/status` | 200 | 404, 500 |
| 5 | Refund payment | `POST {{platform_base_url}}/api/payment/payments/:id/refund` | 200 | 400, 404, 500 |
| 6 | Handle provider webhook | `POST {{platform_base_url}}/api/payment/payments/webhooks/pesapal` | 200 | 400, 409, 500 |

### Payouts (Direct Module)

Preconditions: seller wallet exists and payout policy allows request.

| Step | User Intent / Action | Endpoint | Happy Status | Unhappy Status / Failure Path |
|---|---|---|---|---|
| 1 | Create payout | `POST {{platform_base_url}}/api/payout/payouts` | 200, 201 | 400, 422, 500 |
| 2 | Get payout by id | `GET {{platform_base_url}}/api/payout/payouts/:id` | 200 | 404, 500 |
| 3 | Cancel payout | `POST {{platform_base_url}}/api/payout/payouts/:id/cancel` | 200 | 400, 404, 500 |

### Wallet (Balance, Holds, Topups, Payouts)

Preconditions: valid auth token, user wallet exists.

| Step | User Intent / Action | Endpoint | Happy Status | Unhappy Status / Failure Path |
|---|---|---|---|---|
| 1 | Get wallet | `GET {{platform_base_url}}/api/wallet/wallets/:userId` | 200 | 401, 403, 404, 500 |
| 2 | Get balance | `GET {{platform_base_url}}/api/wallet/wallets/:userId/balance` | 200 | 401, 403, 404, 500 |
| 3 | Credit wallet | `POST {{platform_base_url}}/api/wallet/wallets/:userId/credit` | 200, 201 | 400, 401, 403, 404, 422, 500 |
| 4 | Debit wallet | `POST {{platform_base_url}}/api/wallet/wallets/:userId/debit` | 200, 201 | 400, 401, 403, 404, 422, 500 |
| 5 | Place hold | `POST {{platform_base_url}}/api/wallet/wallets/:userId/hold` | 200, 201 | 400, 401, 403, 404, 422, 500 |
| 6 | Release hold | `POST {{platform_base_url}}/api/wallet/wallets/:userId/hold/:holdId/release` | 200 | 400, 401, 403, 404, 500 |
| 7 | Capture hold | `POST {{platform_base_url}}/api/wallet/wallets/:userId/hold/:holdId/capture` | 200 | 400, 401, 403, 404, 500 |
| 8 | Reverse transaction | `POST {{platform_base_url}}/api/wallet/wallets/:userId/transaction/:transactionId/reverse` | 200 | 400, 401, 403, 404, 500 |
| 9 | Wallet statement | `GET {{platform_base_url}}/api/wallet/wallets/:userId/statement` | 200 | 400, 401, 403, 404, 500 |
| 10 | Freeze wallet | `POST {{platform_base_url}}/api/wallet/wallets/:userId/freeze` | 200 | 400, 401, 403, 404, 500 |
| 11 | Unfreeze wallet | `POST {{platform_base_url}}/api/wallet/wallets/:userId/unfreeze` | 200 | 400, 401, 403, 404, 500 |
| 12 | Topup wallet | `POST {{platform_base_url}}/api/wallet/wallets/:userId/topup` | 200, 201 | 400, 401, 403, 404, 422, 500 |
| 13 | Request payout | `POST {{platform_base_url}}/api/wallet/wallets/:userId/payout` | 200, 201 | 400, 401, 403, 404, 422, 500 |

### Training (Enrollment, Progress, Eligibility)

Preconditions: learner exists.

| Step | User Intent / Action | Endpoint | Happy Status | Unhappy Status / Failure Path |
|---|---|---|---|---|
| 1 | Start training | `POST {{platform_base_url}}/api/training/api/v1/training/start` | 200, 201 | 400, 422, 500 |
| 2 | Complete training | `POST {{platform_base_url}}/api/training/api/v1/training/:id/complete` | 200 | 400, 404, 422, 500 |
| 3 | Get learner progress | `GET {{platform_base_url}}/api/training/api/v1/training/progress/:learnerId` | 200 | 400, 404, 500 |
| 4 | Check eligibility | `GET {{platform_base_url}}/api/training/api/v1/training/eligibility/:learnerId` | 200 | 400, 404, 500 |
| 5 | Get available modules | `GET {{platform_base_url}}/api/training/api/v1/training/available` | 200 | 500 |
| 6 | Track progress event | `POST {{platform_base_url}}/api/training/api/v1/training/:id/progress` | 200 | 400, 404, 500 |
| 7 | List modules | `GET {{platform_base_url}}/api/training/api/v1/modules` | 200 | 500 |
| 8 | Get module | `GET {{platform_base_url}}/api/training/api/v1/modules/:id` | 200 | 400, 404, 500 |
| 9 | Get module content | `GET {{platform_base_url}}/api/training/api/v1/modules/:id/content` | 200 | 400, 404, 500 |
| 10 | Get leaderboard | `GET {{platform_base_url}}/api/training/api/v1/modules/leaderboard` | 200 | 500 |
| 11 | Get learner badges | `GET {{platform_base_url}}/api/training/api/v1/modules/badges/:learnerId` | 200 | 400, 404, 500 |

### Analytics (Seller, Supplier, Courier, Profitability)

Preconditions: entity ids exist. Protected endpoints require auth.

| Step | User Intent / Action | Endpoint | Happy Status | Unhappy Status / Failure Path |
|---|---|---|---|---|
| 1 | Analytics health | `GET {{platform_base_url}}/api/analytics/health` | 200 | 503 |
| 2 | Seller dashboard (summary) | `GET {{platform_base_url}}/api/analytics/analytics/dashboard/:sellerId` | 200 | 401, 403, 404, 500 |
| 3 | Seller sales analytics | `GET {{platform_base_url}}/api/analytics/analytics/sales/:sellerId` | 200 | 401, 403, 404, 500 |
| 4 | Supplier analytics | `GET {{platform_base_url}}/api/analytics/supplier/analytics/:supplierId` | 200 | 401, 403, 404, 500 |
| 5 | Courier analytics | `GET {{platform_base_url}}/api/analytics/courier/analytics/:courierId` | 200 | 401, 403, 404, 500 |
| 6 | Seller dashboard (detail) | `GET {{platform_base_url}}/api/analytics/sellers/:sellerId/dashboard` | 200 | 401, 403, 404, 500 |
| 7 | Money snapshot | `GET {{platform_base_url}}/api/analytics/sellers/:sellerId/dashboard/money-snapshot` | 200 | 401, 403, 404, 500 |
| 8 | Action center | `GET {{platform_base_url}}/api/analytics/sellers/:sellerId/dashboard/action-center` | 200 | 401, 403, 404, 500 |
| 9 | Sales trend | `GET {{platform_base_url}}/api/analytics/sellers/:sellerId/dashboard/sales-trend` | 200 | 401, 403, 404, 500 |
| 10 | Profitability score | `GET {{platform_base_url}}/api/analytics/sellers/:sellerId/dashboard/profitability-score` | 200 | 401, 403, 404, 500 |
| 11 | Resolve action item | `PATCH {{platform_base_url}}/api/analytics/action-items/:actionId/resolve` | 200 | 400, 401, 403, 404, 500 |
| 12 | Profitability dashboard (global) | `GET {{platform_base_url}}/api/analytics/seller-profitability/dashboard` | 200 | 401, 403, 500 |
| 13 | Profitability dashboard (seller) | `GET {{platform_base_url}}/api/analytics/seller-profitability/dashboard/:sellerId` | 200 | 401, 403, 404, 500 |
| 14 | Revenue health | `GET {{platform_base_url}}/api/analytics/seller-profitability/revenue-health` | 200 | 401, 403, 500 |
| 15 | Growth indicators | `GET {{platform_base_url}}/api/analytics/seller-profitability/growth-indicators` | 200 | 401, 403, 500 |
| 16 | Retention metrics | `GET {{platform_base_url}}/api/analytics/seller-profitability/retention` | 200 | 401, 403, 500 |
| 17 | Financial metrics | `GET {{platform_base_url}}/api/analytics/seller-profitability/financial` | 200 | 401, 403, 500 |
| 18 | Happiness signals | `GET {{platform_base_url}}/api/analytics/seller-profitability/happiness` | 200 | 401, 403, 500 |
| 19 | Admin red flags | `GET {{platform_base_url}}/api/analytics/admin/dashboard/red-flags` | 200 | 401, 403, 500 |

### Logistics (Delivery, Routing, Courier Ops)

Preconditions: order exists, courier exists, and tracking number is known for tracking operations.

| Step | User Intent / Action | Endpoint | Happy Status | Unhappy Status / Failure Path |
|---|---|---|---|---|
| 1 | List couriers | `GET {{platform_base_url}}/api/logistics/api/v1/couriers` | 200 | 400, 500 |
| 2 | Get courier by id | `GET {{platform_base_url}}/api/logistics/api/v1/couriers/:courierId` | 200 | 404, 500 |
| 3 | Update courier status | `PUT {{platform_base_url}}/api/logistics/api/v1/couriers/:courierId/status` | 200 | 400, 404, 500 |
| 4 | Create delivery | `POST {{platform_base_url}}/api/logistics/api/v1/deliveries` | 201 | 400, 422, 500 |
| 5 | Get delivery by id | `GET {{platform_base_url}}/api/logistics/api/v1/deliveries/:deliveryId` | 200 | 404, 500 |
| 6 | List deliveries | `GET {{platform_base_url}}/api/logistics/api/v1/deliveries` | 200 | 400, 500 |
| 7 | Update delivery status | `POST {{platform_base_url}}/api/logistics/api/v1/deliveries/:deliveryId/status` | 200 | 400, 404, 500 |
| 8 | Request COD OTP | `POST {{platform_base_url}}/api/logistics/api/v1/cod/:deliveryId/otp` | 200 | 400, 404, 500 |
| 9 | Verify COD OTP | `POST {{platform_base_url}}/api/logistics/api/v1/cod/:deliveryId/verify` | 200 | 400, 404, 500 |
| 10 | Get routes | `GET {{platform_base_url}}/api/logistics/api/v1/routes` | 200 | 400, 500 |
| 11 | Optimize route | `POST {{platform_base_url}}/api/logistics/api/v1/routes/optimize` | 200 | 400, 500 |
| 12 | Get route details | `GET {{platform_base_url}}/api/logistics/api/v1/routes/:routeId` | 200 | 404, 500 |
| 13 | Update route progress | `PUT {{platform_base_url}}/api/logistics/api/v1/routes/:routeId/progress` | 200 | 400, 404, 500 |
| 14 | Route alternatives | `POST {{platform_base_url}}/api/logistics/api/v1/routes/:routeId/alternatives` | 200 | 400, 404, 500 |
| 15 | Track shipment | `GET {{platform_base_url}}/api/logistics/api/v1/tracking/:trackingNumber` | 200 | 404, 500 |
| 16 | Track location update | `POST {{platform_base_url}}/api/logistics/api/v1/tracking/location` | 200 | 400, 422, 500 |
| 17 | Courier tracking history | `GET {{platform_base_url}}/api/logistics/api/v1/tracking/courier/:courierId/history` | 200 | 404, 500 |
| 18 | Logistics analytics | `GET {{platform_base_url}}/api/logistics/api/v1/analytics` | 200 | 500 |
| 19 | Performance analytics | `GET {{platform_base_url}}/api/logistics/api/v1/analytics/performance` | 200 | 500 |
| 20 | Courier analytics | `GET {{platform_base_url}}/api/logistics/api/v1/analytics/courier/:courierId` | 200 | 404, 500 |
| 21 | Earnings summary | `GET {{platform_base_url}}/api/logistics/api/v1/earnings/summary` | 200 | 500 |
| 22 | Courier earnings | `GET {{platform_base_url}}/api/logistics/api/v1/earnings/courier/:courierId` | 200 | 404, 500 |
| 23 | Calculate earnings | `POST {{platform_base_url}}/api/logistics/api/v1/earnings/calculate` | 200 | 400, 422, 500 |
| 24 | Engine status | `GET {{platform_base_url}}/api/logistics/api/v1/engines/status` | 200 | 500 |

Legacy courier endpoints (used by internal logistics engines) are mounted under `/api/logistics/api/courier/*` and should be validated for reachability only.

### Community (Knowledge, Discussions, Challenges, Posts)

Preconditions: community user exists.

| Step | User Intent / Action | Endpoint | Happy Status | Unhappy Status / Failure Path |
|---|---|---|---|---|
| 1 | Submit knowledge article | `POST {{platform_base_url}}/api/community/knowledge/articles` | 201 | 400, 422, 500 |
| 2 | List knowledge articles | `GET {{platform_base_url}}/api/community/knowledge/articles` | 200 | 400, 500 |
| 3 | Get knowledge article | `GET {{platform_base_url}}/api/community/knowledge/articles/:articleId` | 200 | 404, 500 |
| 4 | Review knowledge article | `POST {{platform_base_url}}/api/community/knowledge/articles/:articleId/reviews` | 201 | 400, 404, 422, 500 |
| 5 | Publish knowledge article | `POST {{platform_base_url}}/api/community/knowledge/articles/:articleId/publish` | 200 | 400, 404, 500 |
| 6 | Discover content | `GET {{platform_base_url}}/api/community/discover` | 200 | 400, 500 |
| 7 | Propose challenge | `POST {{platform_base_url}}/api/community/challenges` | 201 | 400, 422, 500 |
| 8 | List challenges | `GET {{platform_base_url}}/api/community/challenges` | 200 | 400, 500 |
| 9 | Submit challenge solution | `POST {{platform_base_url}}/api/community/challenges/:challengeId/solutions` | 201 | 400, 404, 422, 500 |
| 10 | Validate expertise | `POST {{platform_base_url}}/api/community/expertise/validate` | 200 | 400, 422, 500 |
| 11 | Create discussion | `POST {{platform_base_url}}/api/community/discussions` | 201 | 400, 422, 500 |
| 12 | List discussions | `GET {{platform_base_url}}/api/community/discussions` | 200 | 400, 500 |
| 13 | Get discussion | `GET {{platform_base_url}}/api/community/discussions/:threadId` | 200 | 404, 500 |
| 14 | Submit answer | `POST {{platform_base_url}}/api/community/discussions/:threadId/answers` | 201 | 400, 404, 422, 500 |
| 15 | Accept answer | `PATCH {{platform_base_url}}/api/community/discussions/:threadId/accept/:answerId` | 200 | 400, 404, 500 |
| 16 | Close discussion | `PATCH {{platform_base_url}}/api/community/discussions/:threadId/close` | 200 | 400, 404, 500 |
| 17 | Create post | `POST {{platform_base_url}}/api/community/posts` | 201 | 400, 422, 500 |
| 18 | List published posts | `GET {{platform_base_url}}/api/community/posts/published` | 200 | 400, 500 |
| 19 | Search posts | `GET {{platform_base_url}}/api/community/posts/search` | 200 | 400, 500 |
| 20 | Trending topics | `GET {{platform_base_url}}/api/community/posts/trending` | 200 | 400, 500 |
| 21 | Get post | `GET {{platform_base_url}}/api/community/posts/:postId` | 200 | 404, 500 |
| 22 | Related posts | `GET {{platform_base_url}}/api/community/posts/:postId/related` | 200 | 404, 500 |
| 23 | Posts by author | `GET {{platform_base_url}}/api/community/posts/authors/:authorId` | 200 | 404, 500 |
| 24 | User feed | `GET {{platform_base_url}}/api/community/posts/users/:userId/feed` | 200 | 404, 500 |

### Checkout (Session Lifecycle)

| Step | User Intent / Action | Endpoint | Happy Status | Unhappy Status / Failure Path |
|---|---|---|---|---|
| 1 | Initiate checkout | `POST {{platform_base_url}}/api/checkout/initiate` | 200, 201 | 400, 422, 500 |
| 2 | Get checkout session | `GET {{platform_base_url}}/api/checkout/:id` | 200 | 404, 500 |
| 3 | Confirm checkout | `POST {{platform_base_url}}/api/checkout/:id/confirm` | 200 | 400, 404, 500 |

### User (Account + Security Operations)

Note: these routes are mounted under `/api/user`, not `/api/users`.

| Step | User Intent / Action | Endpoint | Happy Status | Unhappy Status / Failure Path |
|---|---|---|---|---|
| 1 | Create user | `POST {{platform_base_url}}/api/user` | 200, 201 | 400, 422, 500 |
| 2 | Get user by id | `GET {{platform_base_url}}/api/user/:id` | 200 | 404, 500, 501 |
| 3 | Update user | `PUT {{platform_base_url}}/api/user/:id` | 200 | 400, 404, 422, 500, 501 |
| 4 | Delete user | `DELETE {{platform_base_url}}/api/user/:id` | 200, 204 | 404, 500, 501 |
| 5 | Verify email | `POST {{platform_base_url}}/api/user/verify-email/:token` | 200 | 400, 404, 500, 501 |
| 6 | Request password reset | `POST {{platform_base_url}}/api/user/request-password-reset` | 200 | 400, 422, 500, 501 |
| 7 | Reset password | `POST {{platform_base_url}}/api/user/reset-password/:token` | 200 | 400, 404, 422, 500, 501 |
| 8 | Get profile | `GET {{platform_base_url}}/api/user/profile` | 200 | 401, 403, 500 |
| 9 | Update profile | `PUT {{platform_base_url}}/api/user/profile` | 200 | 400, 401, 403, 422, 500 |
| 10 | Change password | `POST {{platform_base_url}}/api/user/:id/password` | 200 | 400, 401, 403, 422, 500, 501 |
| 11 | Suspend account | `POST {{platform_base_url}}/api/user/:id/suspend` | 200 | 400, 401, 403, 404, 500, 501 |
| 12 | Change role | `POST {{platform_base_url}}/api/user/:id/role` | 200 | 400, 401, 403, 404, 500, 501 |
| 13 | Verify phone | `POST {{platform_base_url}}/api/user/:id/phone/verify` | 200 | 400, 401, 403, 422, 500, 501 |
| 14 | Setup 2FA | `POST {{platform_base_url}}/api/user/:id/2fa/setup` | 200 | 400, 401, 403, 422, 500, 501 |
| 15 | Report security breach | `POST {{platform_base_url}}/api/user/security/breaches/report` | 200 | 400, 401, 403, 422, 500 |
| 16 | COD reputation | `GET {{platform_base_url}}/api/user/:userId/cod-reputation` | 200 | 400, 404, 500 |

### Commission (Calculation + Approval)

| Step | User Intent / Action | Endpoint | Happy Status | Unhappy Status / Failure Path |
|---|---|---|---|---|
| 1 | Calculate commission | `POST {{platform_base_url}}/api/commission/calculate` | 200 | 400, 422, 500 |
| 2 | Approve commission | `PUT {{platform_base_url}}/api/commission/:id/approve` | 200 | 400, 404, 500 |
| 3 | Get commission by id | `GET {{platform_base_url}}/api/commission/:id` | 200 | 400, 404, 500 |
| 4 | List seller commissions | `GET {{platform_base_url}}/api/commission/sellers/:sellerId` | 200 | 400, 404, 500 |
| 5 | Seller commission summary | `GET {{platform_base_url}}/api/commission/sellers/:sellerId/summary` | 200 | 400, 404, 500 |

### Inventory (Health Reachability)

| Step | User Intent / Action | Endpoint | Happy Status | Unhappy Status / Failure Path |
|---|---|---|---|---|
| 1 | Inventory health | `GET {{platform_base_url}}/api/inventory/health` | 200 | 503 |
