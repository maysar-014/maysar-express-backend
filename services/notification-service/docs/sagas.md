# Notification Service - Sagas

## NotificationDeliverySaga
**Purpose**: Delivers notification across multiple channels

**Steps**:
1. Check user preferences
2. Select delivery channels
3. Send via each channel
4. Track delivery status
5. Retry failed deliveries

**Compensation**: None (best-effort delivery)
**Idempotency**: Keyed by `notification-{userId}-{eventId}`
**Retry**: 3 attempts per channel with exponential backoff
