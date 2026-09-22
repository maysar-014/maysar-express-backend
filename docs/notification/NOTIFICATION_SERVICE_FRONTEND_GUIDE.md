# Notification Service — Frontend Integration Guide

> Audience: Client app engineers (all apps — buyer, seller, courier, enabler, admin)
> Mount path: `/api/notification`

---

## 1. What the Notification Service Does

Delivers multi-channel notifications (email, SMS, push, in-app) to platform users. The frontend interacts with it to display in-app feeds and manage preferences. Most notifications are sent automatically by other services — the frontend reads and manages them, not creates them.

```
Order confirmed → order-service publishes event → notification-service sends
→ push notification on device + in-app record created
→ GET /notifications shows it in feed
```

---

## 2. Service at a Glance

| Aspect | Detail |
|--------|--------|
| Mount path | `/api/notification` |
| Notifications | `/api/notification/notifications` |
| Templates | `/api/notification/templates` |
| Preferences | `/api/notification/preferences` |
| SMS | `/api/notification/sms` |
| Auth | `requireAuth` on all routes |
| Rate limits | Notifications: 100/min; Preferences: 60/min; Templates: 50/min |
| Max retries | 3 (after 3 failures, `canRetry()` returns false) |
| Scheduled expiry | Scheduled notifications expire after 7 days if not sent |
| Error envelope | `{ success: false, error: { code, message }, timestamp }` |

---

## 3. Authentication & Roles

| Surface | Auth | Notes |
|---------|------|-------|
| `GET /notifications` | JWT | Users see own notifications only |
| `POST /notifications` | JWT (admin/system) | Sending is system-initiated |
| `POST /notifications/bulk` | JWT (admin/system) | Bulk send |
| `GET/PUT /preferences/:userId` | JWT | Users manage own preferences |
| `POST /preferences/:userId/opt-out` | JWT | Users opt out per channel |
| `POST/GET/PUT/DELETE /templates` | JWT (admin) | Template management |

---

## 4. Push Token Registration

The notification service exposes a `/push-tokens` HTTP endpoint:

| Method | Path | Status | Description |
|--------|------|--------|-------------|
| `POST` | `/api/notification/push-tokens` | **201** | Register device FCM token |
| `DELETE` | `/api/notification/push-tokens/:token` | **200** | Deregister token on logout |

Auth: `requireAuth`. Rate limit: 60/min.

Alternatively, tokens can also be stored via the user-service profile update (`PUT /api/user/profile` with `{ "fcmToken": "..." }`). Either path is valid; prefer the dedicated push-token endpoint for notification-specific token lifecycle management.

---

## 5. Core Domain Objects

```
Notification
  ├── id
  ├── userId (recipient)
  ├── type: NotificationType (channel: email | sms | push | in-app)
  ├── channel: email | sms | push | in-app
  ├── status: pending → sent → delivered → read | failed | cancelled
  ├── priority: low | medium | high | urgent
  ├── subject + content
  ├── metadata (e.g. { orderId, paymentId })
  ├── scheduledAt (optional)
  ├── retryCount (max 3)
  ├── sentAt, deliveredAt, readAt
  └── lastError (set on failed)

NotificationPreference
  ├── userId
  ├── channel: email | sms | push | in-app
  ├── enabled: boolean
  ├── categories: { marketing: bool, transactional: bool, system: bool }
  ├── quietHours: { start: "HH:mm", end: "HH:mm", timezone? }
  └── frequency: realtime | hourly | daily | weekly
```

### Notification status machine

```
pending → sent → delivered → read
        → failed    (retryable if retryCount < 3)
        → cancelled (scheduled only, via DELETE /:id)
```

**Critical delivery rule:** `canSend()` checks three things before delivering:
1. `preference.enabled === true` for the channel
2. The notification's category is not disabled in `preference.categories`
3. If currently in `quietHours`, only `urgent` or `high` priority notifications are delivered

---

## 6. Notification Status Display

| Status | Display | User action |
|--------|---------|-------------|
| `pending` | Sending... | — |
| `sent` | Sent | — |
| `delivered` | Delivered | — |
| `read` | Read | — |
| `failed` | Failed (retrying) | — (system retries up to 3×) |
| `cancelled` | Cancelled | — |

Show `failed` as "retrying" not as a permanent error — the system retries automatically up to 3 times. Only show a permanent failure after `retryCount >= 3`.

---

## 7. API Reference

### 7.1 List notifications (in-app feed)
`GET /api/notification/notifications?limit=20&cursor=...` → **200**

```jsonc
{
  "success": true,
  "data": [
    {
      "id": "ntf_01J...",
      "channel": "in-app",
      "subject": "Your order has been confirmed",
      "content": "Order ORD-123 is confirmed and being prepared.",
      "status": "delivered",
      "priority": "high",
      "read": false,
      "metadata": { "orderId": "ord_01J..." },
      "createdAt": "2026-09-06T10:00:00Z",
      "deliveredAt": "2026-09-06T10:00:01Z"
    }
  ],
  "pagination": { "cursor": "...", "hasMore": true }
}
```

Only `in-app` channel notifications appear in the feed. Email/SMS/push are delivery-only.

### 7.2 Get unread count
`GET /api/notification/notifications/unread-count` → **200**

```jsonc
{ "success": true, "data": { "count": 7 } }
```

Use this for the notification bell badge. Poll every 30s or use WebSocket push.

### 7.3 Mark all as read
`POST /api/notification/notifications/mark-all-read` → **200**

Call this when the user opens the notification panel. Clears the badge count.

### 7.4 Mark single notification as read
`PATCH /api/notification/notifications/:id/status` → **200**

```jsonc
{ "status": "read" }
```

Status values are **lowercase** (`pending`, `sent`, `delivered`, `read`, `failed`) — not uppercase.

### 7.5 Get a single notification
`GET /api/notification/notifications/:id` → **200**

### 7.6 Retry a failed notification (admin)
`POST /api/notification/notifications/:id/retry` → **200**

Only works when `status === 'failed'` and `retryCount < 3`. Returns 422 otherwise.

### 7.7 Cancel a scheduled notification
`DELETE /api/notification/notifications/:id` → **200**

Only works for `pending` scheduled notifications (those with `scheduledAt` set). Returns 422 for already-sent notifications.

### 7.8 Send a notification (system/admin)
`POST /api/notification/notifications` → **201**

```jsonc
{
  "userId": "usr_01J...",
  "channel": "in-app",
  "type": "in-app",
  "subject": "Order confirmed",
  "content": "Your order ORD-123 has been confirmed.",
  "priority": "high",
  "metadata": { "orderId": "ord_01J..." },
  "scheduledAt": null
}
```

### 7.9 Bulk send (admin)
`POST /api/notification/notifications/bulk` → **200**

```jsonc
{
  "userIds": ["usr_01J...", "usr_02J..."],
  "channel": "push",
  "type": "push",
  "subject": "Flash sale!",
  "content": "50% off all electronics today only.",
  "priority": "medium"
}
```

---

## 8. Preferences API

### 8.1 Get user preferences
`GET /api/notification/preferences/:userId` → **200**

```jsonc
{
  "success": true,
  "data": {
    "userId": "usr_01J...",
    "preferences": [
      {
        "channel": "email",
        "enabled": true,
        "categories": { "marketing": true, "transactional": true, "system": true },
        "frequency": "realtime",
        "quietHours": null
      },
      {
        "channel": "sms",
        "enabled": true,
        "categories": { "marketing": false, "transactional": true, "system": true },
        "frequency": "realtime",
        "quietHours": { "start": "22:00", "end": "07:00", "timezone": "Africa/Dar_es_Salaam" }
      },
      { "channel": "push", "enabled": true, "categories": { "marketing": true, "transactional": true, "system": true }, "frequency": "realtime" },
      { "channel": "in-app", "enabled": true, "categories": { "marketing": true, "transactional": true, "system": true }, "frequency": "realtime" }
    ]
  }
}
```

**Quiet hours:** During quiet hours, only `urgent` and `high` priority notifications are delivered. Show this in the settings UI so users understand why some notifications may be delayed.

### 8.2 Update a preference
`PUT /api/notification/preferences/:userId` → **200**

```jsonc
{ "channel": "sms", "enabled": false }
```

Only one field can be updated per call. The server merges `categories` — you can update a single category without affecting others.

### 8.3 Opt out of a channel
`POST /api/notification/preferences/:userId/opt-out` → **200**

```jsonc
{ "channel": "sms" }
```

Sets `enabled: false` for the channel. Use for GDPR/opt-out flows.

---

## 9. Template API (admin)

| Endpoint | Body | Description |
|----------|------|-------------|
| `POST /api/notification/templates` | `{ name, channel, subject, bodyTemplate, variables[] }` | Create template |
| `GET /api/notification/templates/:id` | — | Get template |
| `PUT /api/notification/templates/:id` | `{ name?, subject?, bodyTemplate?, variables?, isActive? }` | Update |
| `DELETE /api/notification/templates/:id` | — | Delete template |
| `POST /api/notification/templates/:id/render` | `{ variables: { key: value } }` | Preview rendered output |

`bodyTemplate` uses `{{variableName}}` placeholders.

---

## 10. Error Codes

| Code | HTTP | Meaning | UI action |
|------|------|---------|-----------|
| `UNAUTHORIZED` | 401 | No/expired JWT | Re-login |
| `FORBIDDEN` | 403 | Accessing another user's notifications | Hide |
| `NOTIFICATION_NOT_FOUND` | 404 | Invalid notification ID | Show "not found" |
| `TEMPLATE_NOT_FOUND` | 404 | Invalid template ID | Show "not found" |
| `PREFERENCE_NOT_FOUND` | 404 | No preference record for user/channel | Create default via PUT |
| `INVALID_STATUS_TRANSITION` | 422 | Retrying non-failed or cancelling non-pending | Refresh list |
| `MAX_RETRIES_EXCEEDED` | 422 | `retryCount >= 3` — cannot retry | Show permanent failure |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests | Back off 60s |
| `VALIDATION_ERROR` | 400 | Missing/invalid fields | Highlight fields |
| `INTERNAL_SERVER_ERROR` | 500 | Server failure | Retry with backoff |

---

## 11. UX Patterns

**Notification bell / badge:**
1. On app load → `GET /notifications/unread-count` → show badge number.
2. On bell click → `GET /notifications?limit=20` → render feed (in-app channel only).
3. On panel open → `POST /notifications/mark-all-read` → clear badge.
4. On individual notification click → `PATCH /notifications/:id/status` `{ "status": "read" }` → navigate to `metadata.orderId` or relevant screen.

**Notification settings screen:**
1. `GET /preferences/:userId` → render toggles per channel.
2. Show category toggles (marketing, transactional, system) per channel.
3. Show quiet hours configuration — explain that `urgent`/`high` priority still delivers during quiet hours.
4. On toggle change → `PUT /preferences/:userId` with `{ channel, enabled }`.

**Push notification setup (mobile):**
1. Request OS permission → get FCM/Expo token.
2. `POST /api/notification/push-tokens` `{ "token": "...", "platform": "android"|"ios" }` on every app launch (or `PUT /api/user/profile` `{ "fcmToken": "..." }` — both paths work).
3. On logout → `DELETE /api/notification/push-tokens/:token` (or `PUT /api/user/profile` `{ "fcmToken": null }`).

**Integration checklist:**
- [ ] Register push token on every app launch via `POST /api/notification/push-tokens` or `PUT /api/user/profile` `{ "fcmToken": "..." }`
- [ ] Clear FCM token on logout via `DELETE /api/notification/push-tokens/:token` or `PUT /api/user/profile` `{ "fcmToken": null }`
- [ ] Poll unread count every 30s or use WebSocket
- [ ] Use lowercase status values (`read`, not `READ`) in PATCH requests
- [ ] Show `failed` as "retrying" not permanent error until `retryCount >= 3`
- [ ] Explain quiet hours in settings — urgent/high still delivers
- [ ] Handle `PREFERENCE_NOT_FOUND` (404) by creating a default preference via PUT
- [ ] Handle `RATE_LIMIT_EXCEEDED` (429) with 60s backoff

---

## 12. Route Map

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/notification/notifications` | JWT (admin) | Send notification |
| GET | `/api/notification/notifications` | JWT | List notifications |
| GET | `/api/notification/notifications/unread-count` | JWT | Unread count |
| POST | `/api/notification/notifications/mark-all-read` | JWT | Mark all read |
| POST | `/api/notification/notifications/bulk` | JWT (admin) | Bulk send → **200** |
| GET | `/api/notification/notifications/:id` | JWT | Get notification |
| PATCH | `/api/notification/notifications/:id/status` | JWT | Update status |
| DELETE | `/api/notification/notifications/:id` | JWT | Cancel scheduled |
| POST | `/api/notification/notifications/:id/retry` | JWT (admin) | Retry failed |
| GET | `/api/notification/preferences/:userId` | JWT | Get preferences |
| PUT | `/api/notification/preferences/:userId` | JWT | Update preference |
| POST | `/api/notification/preferences/:userId/opt-out` | JWT | Opt out |
| POST | `/api/notification/templates` | JWT (admin) | Create template |
| GET | `/api/notification/templates/:id` | JWT (admin) | Get template |
| PUT | `/api/notification/templates/:id` | JWT (admin) | Update template |
| DELETE | `/api/notification/templates/:id` | JWT (admin) | Delete template |
| POST | `/api/notification/templates/:id/render` | JWT (admin) | Preview render |
| POST | `/api/notification/push-tokens` | JWT | Register push token → **201** |
| DELETE | `/api/notification/push-tokens/:token` | JWT | Deregister push token |


---

## System Maintenance (internal/ops)

These endpoints are for ops/admin use only. They are not called from the frontend.

```
POST /api/notification/system/maintenance/cleanup/outbox/report
POST /api/notification/system/maintenance/cleanup/outbox
```

**Auth:** `requireRoleOrService(['admin','system'])` **and** `x-service-key` header.

### Outbox cleanup report
`POST /api/notification/system/maintenance/cleanup/outbox/report` → **200** — dry-run count of deletable outbox events.

### Outbox cleanup
`POST /api/notification/system/maintenance/cleanup/outbox` → **200** — batched deletion. Body: `{ "dryRun": true }` to simulate. `maxRuntimeMs` defaults to 20 seconds.
