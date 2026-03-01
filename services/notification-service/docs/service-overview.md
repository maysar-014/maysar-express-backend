# Notification Service - Service Overview

## Purpose
Multi-channel notification delivery (SMS, email, push, in-app). Manages notification preferences and delivery tracking.

## Key Domain Concepts

### Notification Channels
- SMS (via sms-service)
- Email
- Push notifications
- In-app notifications

### Notification Types
- Transactional (order updates, payment confirmations)
- Marketing (campaigns, promotions)
- System (security alerts, account changes)

### Delivery Tracking
- Sent, delivered, read, clicked
- Retry logic for failed deliveries

## Primary Dependencies
- **sms-service**: SMS delivery
- **email-provider**: Email delivery
- **push-provider**: Mobile push notifications

## Entry Point
`services/notification-service/src/index.ts`

## Database Schema
- `Notification_Notification`: Notification records
- `Notification_Preference`: User notification preferences
- `Notification_DeliveryLog`: Delivery tracking
