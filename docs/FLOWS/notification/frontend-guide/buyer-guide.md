# Buyer Guide — Notification Service

> Mirrors: `docs/FLOWS/notification/user-flow/buyer-flows.md`
> Verification status: Partially Verified
> Last updated: September 2026

## Overview

Buyers receive notifications automatically — no API calls needed to receive them. This guide covers the notification inbox management UI and OTP notification display.

---

## COD OTP Notification Display

When the delivery reaches `out_for_delivery`, the buyer receives an OTP via SMS/push. Display requirements:

- **Push notification format:** "Share this code with your courier: **XXXXXX**"
- **In-app display while awaiting delivery:** "Your courier is on the way. Share this code when they arrive: **XXXXXX**"
- **Code visibility:** Make the OTP large and easy to read — the buyer shares it verbally
- **If OTP not received within 2 minutes:** Show "Didn't receive a code? Ask your courier to resend it." — the courier calls `POST /api/logistics/v1/cod/:deliveryId/otp` to regenerate

---

## Notification Inbox

**User Goal:** View all in-app notifications.

**Action:** `GET /api/notification/notifications?page=1&limit=20&isRead=false`

**UI States:** Loading (skeleton list) | Notifications list | Empty ("You're all caught up") | Error

Each notification shows: message text, timestamp, read/unread indicator. Tap to mark as read and navigate to relevant screen.

---

## Mark Notification as Read

**Action:** `PATCH /api/notification/notifications/:id/read`

| Status | Message |
|---|---|
| 404 | Notification not found — silently ignore |
| 403 | Do not surface — notification not owned by this user |

---

## Unread Count Badge

**Action:** `GET /api/notification/notifications/count`

Poll on app focus or use WebSocket push updates. Show as badge on notification bell icon.

---

## Known Gap — SMS Webhook

> `POST /api/notification/sms/webhook/africastalking` → route-level 404 (Missing). SMS delivery status callbacks are not currently received. SMS delivery cannot be confirmed programmatically — advise users to check their SMS inbox directly if an OTP is delayed.
