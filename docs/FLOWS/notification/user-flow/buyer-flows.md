# Buyer Flows — Notification Service

> **Verification status:** Verified — Live-verified 2026-11-06 against `run-lifecycle-checks.mjs` (LC-24)
> **Verification basis:** `scripts/verification/run-lifecycle-checks.mjs` LC-24 (2026-11-06); `docs/FLOWS/_verification/analysis-report.md` (September 2026)
> **Last updated:** 2026-11-06 (corrected: FLW-001 mark-read path; FLW-002 unread-count path)

## Overview

Buyers do not initiate notification-service calls for their core notification experience — notifications are event-driven and delivered automatically by notification-service in response to platform events. This document covers the notifications buyers receive and the notification management endpoints they can call to read and manage their in-app notification inbox.

---

## Flow Index

| # | Flow Name | Verification Status | Trigger / Endpoint |
|---|---|---|---|
| 1 | Event-Driven Notifications Received | Partially Verified | Various platform events |
| 2 | View In-App Notification Inbox | Partially Verified | `GET /api/notification/notifications` |
| 3 | Mark Notification as Read | Verified | `PATCH /api/notification/notifications/:id/status` |
| 4 | Get Unread Count | Verified | `GET /api/notification/notifications/unread-count` |

---

## Flow 1: Event-Driven Notifications Received by Buyer

Buyers receive notifications triggered automatically by platform events. The buyer does not call any endpoint to receive these.

| Event | Trigger Service | Channel | What Buyer Sees | Action Available |
|---|---|---|---|---|
| `UserRegistered.v1` | auth-service | SMS / push | "Welcome to Maysar! Your account is ready." | None |
| `order.pending_seller_verification` | order-service | Push / in-app | "Order placed — awaiting seller confirmation" | View order |
| `order.seller_verified` | order-service | Push / in-app | "Your order has been confirmed" | View order |
| `order.seller_declined` | order-service | Push / in-app | "Your order was declined — your payment has been refunded" | View order, contact support |
| `WalletNotificationRequested` | wallet-service | Push / in-app | Wallet credit/debit notification with amount | View wallet |
| COD OTP delivery | logistics-service | SMS / push | OTP code message: "Your COD delivery code is XXXXXX" | Share code with courier verbally |
| Delivery `assigned` | logistics-service | Push / in-app | "Courier assigned — [courier name] is collecting your order" | Track delivery |
| Delivery `picked_up` | logistics-service | Push / in-app | "Your order has been picked up" | Track delivery |
| Delivery `out_for_delivery` | logistics-service | Push / in-app | "Out for delivery — your courier is nearby" | Prepare OTP if COD |
| Delivery `delivered` | logistics-service | Push / in-app | "Delivered — your order has arrived" | Rate, return, or contact support |
| `TicketCreated` | support-service | In-app | "Your support ticket has been received" | View ticket |
| `support.ticket_resolved` | support-service | Push / in-app | "Your support ticket has been resolved" | View ticket, close or reopen |

### If a Notification Does Not Arrive

1. Check in-app notification inbox (`GET /api/notification/notifications`)
2. Verify push token is registered (`POST /api/notification/push-tokens`)
3. If OTP not received within 2 minutes, ask courier to regenerate (`POST /api/logistics/v1/cod/:deliveryId/otp` is called by courier)
4. Contact support if critical notification is missing

---

## Flow 2: View In-App Notification Inbox

### Summary

| Field | Value |
|---|---|
| Actor | Buyer |
| Trigger | Buyer opens notification center in the app |
| Preconditions | Authenticated (Bearer JWT) |
| Terminal states | 200 with paginated notification list |
| Verification status | Partially Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Buyer | Fetch notification list | `GET /api/notification/notifications?page=1&limit=20&isRead=false` | Bearer JWT | 200 `{ notifications[], pagination }` |

### Unhappy Path Branches

| Trigger | System Response | Error Code |
|---|---|---|
| JWT missing or expired | 401 | `UNAUTHORIZED` |
| Invalid pagination params | 400 | `VALIDATION_ERROR` |

---

## Flow 3: Mark Notification as Read

### Summary

| Field | Value |
|---|---|
| Actor | Buyer |
| Trigger | Buyer reads a notification |
| Preconditions | Authenticated (Bearer JWT); notification belongs to buyer |
| Terminal states | Notification marked as read; unread count decremented |
| Verification status | Partially Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Buyer | Mark notification read | `PATCH /api/notification/notifications/:id/status` | Bearer JWT | 200 `{ success: true }` |

**Request body:**
```json
{ "status": "read" }
```

> ⚠️ **FLW-001 corrected 2026-11-06:** The previous version of this doc used `PATCH /api/notification/notifications/:id/read` (no body). The live endpoint is `/status` with body `{ "status": "read" }`. Calling `/read` returns 404.

### Unhappy Path Branches

| Trigger | System Response | Error Code |
|---|---|---|
| Notification not found | 404 data-level | `RESOURCE_NOT_FOUND` |
| Notification belongs to different user | 403 | `FORBIDDEN` |

---

## Flow 4: Get Unread Count

### Summary

| Field | Value |
|---|---|
| Actor | Buyer (or app on behalf of buyer) |
| Trigger | App polls for badge count update |
| Preconditions | Authenticated (Bearer JWT) |
| Terminal states | 200 with `{ count: N }` |
| Verification status | Partially Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Buyer App | Fetch unread count | `GET /api/notification/notifications/unread-count` | Bearer JWT | 200 `{ data: { unread: N } }` |

> ⚠️ **FLW-002 corrected 2026-11-06:** Previous path was `GET /api/notification/notifications/count` (returns 404). Correct path is `/unread-count`. Response shape is `{ data: { unread: N } }`, not `{ count: N }`.

### Note on SMS Webhook

> `POST /api/notification/sms/webhook/africastalking` returns route-level 404 (Missing) in the September 2026 sweep — this is a Known Gap. SMS delivery status callbacks are not currently being received.
