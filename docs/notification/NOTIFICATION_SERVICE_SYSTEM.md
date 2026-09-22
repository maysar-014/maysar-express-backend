# Maysar Notification Service — Implementation Reference (As-Built)

> **Status:** Live and verified — multi-channel delivery (SMS, email, push, in-app), template rendering, delivery tracking.
> **Last updated:** September 2026
> **Scope:** `services/notification-service`

---

## 1. Guiding Principles

| Principle | Where it lives |
|---|---|
| **Channel routing is event-driven** | Notification service subscribes to platform events and routes to appropriate channels |
| **SMS uses Tanzania providers** | Selcom SMS adapter for local delivery; E.164 phone numbers required |
| **Templates are versioned** | Template changes create new versions — old notifications are reproducible |
| **Delivery is tracked** | Every notification has a delivery status: `PENDING → SENT → DELIVERED | FAILED` |
| **In-app notifications are persistent** | Stored in DB; user can mark as read; paginated history |

---

## 2. Notification Channels

| Channel | Provider | Use cases |
|---|---|---|
| SMS | Selcom | OTP, order status, COD OTP, payment confirmation |
| Email | SMTP/SendGrid | Registration, password reset, receipts |
| Push | Firebase FCM | Order updates, delivery tracking, promotions |
| In-app | Internal DB | All platform events, persistent history |

---

## 3. Application Layer

| Use case | What it does |
|---|---|
| `SendSMSUseCase` | Validates E.164 phone → routes to Selcom adapter |
| `SendEmailUseCase` | Renders template → sends via SMTP |
| `SendPushUseCase` | Sends FCM push to registered device tokens |
| `CreateInAppNotificationUseCase` | Persists notification record |
| `MarkNotificationReadUseCase` | Marks in-app notification as read |
| `GetNotificationsUseCase` | Paginated in-app notification history |

---

## 4. HTTP Surface

Mounted at `/api/notification` (module name `notification-service` → strip `-service` → `/api/notification`).

Routes are prefixed under sub-paths:
- Notifications: `/api/notification/notifications/...`
- Templates: `/api/notification/templates/...`
- Preferences: `/api/notification/preferences/...`
- SMS (merged): `/api/notification/sms/...`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET  | `/api/notification/notifications` | JWT | In-app notification list |
| POST | `/api/notification/notifications` | JWT (admin/system) | Send a notification |
| GET  | `/api/notification/notifications/unread-count` | JWT | Unread count badge |
| POST | `/api/notification/notifications/mark-all-read` | JWT | Mark all read |
| POST | `/api/notification/notifications/bulk` | JWT (admin/system) | Bulk send |
| GET  | `/api/notification/notifications/:id` | JWT | Get single notification |
| PATCH | `/api/notification/notifications/:id/status` | JWT | Update status (e.g. mark read) |
| DELETE | `/api/notification/notifications/:id` | JWT | Cancel scheduled notification |
| POST | `/api/notification/notifications/:id/retry` | JWT (admin) | Retry failed notification |
| GET  | `/api/notification/preferences/:userId` | JWT | Get user preferences |
| PUT  | `/api/notification/preferences/:userId` | JWT | Update preference |
| POST | `/api/notification/preferences/:userId/opt-out` | JWT | Opt out of channel |
| POST | `/api/notification/push-tokens` | JWT | Register push token |
| DELETE | `/api/notification/push-tokens/:token` | JWT | Unregister push token |
| POST | `/api/notification/templates` | JWT (admin) | Create template |
| GET  | `/api/notification/templates/:id` | JWT (admin) | Get template |
| PUT  | `/api/notification/templates/:id` | JWT (admin) | Update template |
| DELETE | `/api/notification/templates/:id` | JWT (admin) | Delete template |
| POST | `/api/notification/templates/:id/render` | JWT (admin) | Preview render |
| GET  | `/api/notification/health` | none | Health check |

---

## 5. Events Consumed

| Event | Action |
|---|---|
| `UserRegistered.v1` | Send welcome SMS + email |
| `order.placed` | Send order confirmation SMS + in-app |
| `order.confirmed` | Send "Seller confirmed" notification |
| `order.shipped` | Send "Your order is on the way" |
| `order.delivered` | Send delivery confirmation |
| `payment.completed` | Send payment receipt |
| `wallet.credited` | Send credit notification |
| `cod.otp_generated` | Send COD OTP via SMS |

---

## 6. Frontend Integration Guide

### In-app notifications

`GET /api/notification/notifications?limit=20&cursor=...&unreadOnly=false`

```jsonc
{
  "data": {
    "notifications": [
      {
        "id": "ntf_01...",
        "type": "ORDER_CONFIRMED",
        "title": "Order Confirmed",
        "body": "Your order ORD-01... has been confirmed by the seller.",
        "isRead": false,
        "createdAt": "2026-09-01T10:00:00Z",
        "metadata": { "orderId": "ORD-01..." }
      }
    ],
    "unreadCount": 3,
    "nextCursor": "..."
  }
}
```

`GET /api/notification/notifications/unread-count` → `{ "count": 3 }` — use for badge display.

### Integration checklist

- [ ] Show unread count badge on notification bell icon
- [ ] Poll unread count every 30 seconds or use WebSocket push
- [ ] Deep-link from notification `metadata` to the relevant screen (order, payment, etc.)
- [ ] Mark notifications as read when user views them
- [ ] Handle push notification permission request on app first launch
- [ ] Register FCM device token via `PUT /api/user/profile` `{ "fcmToken": "..." }`


---

## System Maintenance Routes

Mounted at `/api/notification/system/maintenance`. Guards: `requireRoleOrService(['admin','system'])` **and** `x-service-key` header.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/notification/system/maintenance/cleanup/outbox/report` | Dry-run count of deletable notification outbox events |
| POST | `/api/notification/system/maintenance/cleanup/outbox` | Batched deletion of expired outbox events. Body: `{ "dryRun": true }` to simulate |

**Retention defaults:** sent/processed → 7 days, failed → 30 days. Batch size: 1000. Max runtime: 20 s.
