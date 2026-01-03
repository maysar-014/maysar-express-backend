# Maysar Event Catalog

**Version**: 1.0  
**Last Updated**: 2025-12-30  
**Status**: CANONICAL - This is the single source of truth for all domain events

## Event Naming Convention
`<domain>.<entity>.<action>.v<version>`

Examples: `order.created.v1`, `payment.succeeded.v1`, `inventory.reserved.v1`

## Core Domain Events

### ORDER DOMAIN

#### order.created.v1
**Producer**: order-service  
**Consumers**: inventory-service, payment-service, notification-service, analytics-service  
**Trigger**: Buyer places order  
**Compensation**: order.cancelled.v1

```json
{
  "eventId": "uuid",
  "eventType": "order.created.v1",
  "timestamp": "2025-12-30T12:00:00Z",
  "correlationId": "uuid",
  "causationId": "uuid",
  "producer": "order-service",
  "payload": {
    "orderId": "uuid",
    "orderNumber": "ORD-1234567890-001",
    "buyerId": "uuid",
    "sellerId": "uuid",
    "items": [
      {
        "productVariantId": "uuid",
        "quantity": 2,
        "unitPrice": 1500,
        "totalPrice": 3000
      }
    ],
    "totalAmount": 3000,
    "currency": "TZS",
    "shippingAddress": {},
    "billingAddress": {}
  }
}
```

#### order.payment.initiated.v1
**Producer**: payment-service  
**Consumers**: order-service, notification-service  
**Trigger**: Payment processing starts  
**Compensation**: order.payment.failed.v1

#### order.payment.succeeded.v1
**Producer**: payment-service  
**Consumers**: order-service, inventory-service, commission-service  
**Trigger**: Payment confirmed  

#### order.inventory.reserved.v1
**Producer**: inventory-service  
**Consumers**: order-service, seller-service  
**Trigger**: Stock reserved for order  
**Compensation**: order.inventory.released.v1

#### order.seller.confirmed.v1
**Producer**: seller-service  
**Consumers**: order-service, logistics-service  
**Trigger**: Seller accepts order  
**Compensation**: order.seller.rejected.v1

#### order.logistics.assigned.v1
**Producer**: logistics-service  
**Consumers**: order-service, courier-console  
**Trigger**: Courier assigned  

#### order.shipped.v1
**Producer**: logistics-service  
**Consumers**: order-service, notification-service, trust-service  
**Trigger**: Package picked up  

#### order.delivered.v1
**Producer**: logistics-service  
**Consumers**: order-service, commission-service, trust-service  
**Trigger**: Package delivered  

#### order.completed.v1
**Producer**: order-service  
**Consumers**: analytics-service, commission-service  
**Trigger**: Order lifecycle complete  

#### order.cancelled.v1
**Producer**: order-service  
**Consumers**: inventory-service, payment-service, notification-service  
**Trigger**: Order cancellation  

### PAYMENT DOMAIN

#### payment.initiated.v1
**Producer**: payment-service  
**Consumers**: order-service, compliance-service  

#### payment.succeeded.v1
**Producer**: payment-service  
**Consumers**: order-service, commission-service, analytics-service  

#### payment.failed.v1
**Producer**: payment-service  
**Consumers**: order-service, notification-service  

#### payment.refund.initiated.v1
**Producer**: payment-service  
**Consumers**: order-service, compliance-service  

#### payment.refund.completed.v1
**Producer**: payment-service  
**Consumers**: order-service, commission-service, notification-service  

### INVENTORY DOMAIN

#### inventory.reserved.v1
**Producer**: inventory-service  
**Consumers**: order-service, seller-service, analytics-service  

#### inventory.released.v1
**Producer**: inventory-service  
**Consumers**: order-service, seller-service  

#### inventory.low.stock.v1
**Producer**: inventory-service  
**Consumers**: seller-service, supplier-console, notification-service  

#### inventory.reorder.triggered.v1
**Producer**: inventory-service  
**Consumers**: supplier-console, analytics-service  

### SELLER DOMAIN

#### seller.registered.v1
**Producer**: auth-service  
**Consumers**: seller-service, compliance-service, enabler-console  

#### seller.kyc.submitted.v1
**Producer**: seller-service  
**Consumers**: compliance-service, admin-console  

#### seller.kyc.approved.v1
**Producer**: compliance-service  
**Consumers**: seller-service, catalog-service, notification-service  

#### seller.kyc.rejected.v1
**Producer**: compliance-service  
**Consumers**: seller-service, notification-service  

#### seller.activated.v1
**Producer**: seller-service  
**Consumers**: catalog-service, commission-service, analytics-service  

#### seller.suspended.v1
**Producer**: admin-service  
**Consumers**: seller-service, catalog-service, order-service  

### LOGISTICS DOMAIN

#### logistics.pickup.assigned.v1
**Producer**: logistics-service  
**Consumers**: courier-console, notification-service  

#### logistics.pickup.completed.v1
**Producer**: logistics-service  
**Consumers**: order-service, notification-service  

#### logistics.delivery.attempted.v1
**Producer**: logistics-service  
**Consumers**: order-service, notification-service  

#### logistics.delivery.completed.v1
**Producer**: logistics-service  
**Consumers**: order-service, commission-service, trust-service  

### COMMISSION DOMAIN

#### commission.calculated.v1
**Producer**: commission-service  
**Consumers**: analytics-service, enabler-console  

#### commission.paid.v1
**Producer**: commission-service  
**Consumers**: notification-service, analytics-service  

### TRUST DOMAIN

#### review.submitted.v1
**Producer**: trust-service  
**Consumers**: seller-service, analytics-service  

#### dispute.opened.v1
**Producer**: trust-service  
**Consumers**: admin-console, notification-service  

#### dispute.resolved.v1
**Producer**: trust-service  
**Consumers**: order-service, payment-service, analytics-service  

### NOTIFICATION DOMAIN

#### notification.sent.v1
**Producer**: notification-service  
**Consumers**: analytics-service  

### ANALYTICS DOMAIN

#### analytics.event.processed.v1
**Producer**: analytics-service  
**Consumers**: admin-console  

## Event Schema Versions

### Version Compatibility Matrix

| Event | v1 | v2 | v3 | Backward Compatible | Breaking Changes |
|-------|----|----|----|--------------------|------------------|
| order.created | ✅ | ✅ | ❌ | v2 ← v1 | None (additive only) |
| payment.succeeded | ✅ | ✅ | ❌ | ❌ v2 ← v1 | v2: processingFee required |
| inventory.reserved | ✅ | 🚧 | ❌ | ❌ v2 ← v1 | v2: expiresAt required |
| logistics.delivery.completed | ✅ | ❌ | ❌ | - | - |
| seller.kyc.approved | ✅ | ❌ | ❌ | - | - |

### Schema Evolution Examples

#### order.created.v1 → v2 (Backward Compatible)
**v2 Additions** (all optional):
- `discountCode`: Promotional code applied
- `totalDiscount`: Total discount amount
- `totalTax`: Total tax amount
- `orderSource`: Origin of order (web/mobile/api)
- `customerNotes`: Customer-provided notes
- Item-level: `discountAmount`, `taxAmount`

#### payment.succeeded.v1 → v2 (Breaking Change)
**v2 Breaking Changes**:
- `processingFee`: Now required field
- `paymentMethod`: Added 'crypto' option

**v2 Additions**:
- `exchangeRate`: Currency conversion rate
- `originalAmount`: Amount in original currency
- `originalCurrency`: Original payment currency

#### inventory.reserved.v1 → v2 (Breaking Change)
**v2 Breaking Changes**:
- `expiresAt`: Now required field

**v2 Additions**:
- `priority`: Reservation priority level
- `reservationType`: Soft vs hard reservation
- `cost`: Reservation cost
- `totalReservationCost`: Total cost
- `reservationStrategy`: Allocation strategy

## Producer/Consumer Matrix

| Event | order-service | payment-service | inventory-service | seller-service | logistics-service | notification-service | analytics-service | admin-console |
|-------|---------------|-----------------|-------------------|----------------|-------------------|---------------------|-------------------|---------------|
| order.created.v1 | 🟢 | 🔵 | 🔵 | ⚪ | ⚪ | 🔵 | 🔵 | ⚪ |
| payment.succeeded.v1 | 🔵 | 🟢 | ⚪ | ⚪ | ⚪ | 🔵 | 🔵 | ⚪ |
| inventory.reserved.v1 | 🔵 | ⚪ | 🟢 | 🔵 | ⚪ | ⚪ | 🔵 | ⚪ |

**Legend**: 🟢 Producer | 🔵 Consumer | ⚪ Not involved

## Saga Event Flows

### Order Fulfillment Saga
```
order.created.v1 
→ payment.initiated.v1 
→ payment.succeeded.v1 
→ inventory.reserved.v1 
→ order.seller.confirmed.v1 
→ logistics.assigned.v1 
→ order.shipped.v1 
→ order.delivered.v1 
→ order.completed.v1
```

### Compensation Flow (Payment Failure)
```
payment.failed.v1 
→ inventory.released.v1 
→ order.cancelled.v1 
→ notification.sent.v1
```

### KYC Approval Saga
```
seller.registered.v1 
→ seller.kyc.submitted.v1 
→ seller.kyc.approved.v1 
→ seller.activated.v1
```

## Event Envelope Standard

All events MUST follow this envelope structure:

```typescript
interface EventEnvelope<T> {
  eventId: string;           // UUID v4
  eventType: string;         // domain.entity.action.version
  timestamp: string;         // ISO 8601
  correlationId: string;     // UUID v4 - tracks related events
  causationId?: string;      // UUID v4 - event that caused this
  producer: string;          // service name
  version: string;           // schema version
  payload: T;                // event-specific data
}
```

## Critical Business Rules

### Idempotency Requirements
- ALL events MUST be idempotent
- Consumers MUST handle duplicate events gracefully
- Use `eventId` for deduplication

### Ordering Guarantees
- Events within same `correlationId` maintain causal ordering
- No global ordering guarantee across different sagas

### Retention Policy
- Critical events (order, payment): Permanent retention
- Notification events: 90 days
- Analytics events: 2 years

### Schema Evolution Rules
1. **Additive changes**: New optional fields (backward compatible)
2. **Breaking changes**: New version required
3. **Deprecation**: 6-month notice before removal

## Monitoring & Alerting

### Event Metrics to Track
- Event publishing rate per service
- Event processing latency
- Failed event processing rate
- Dead letter queue size
- Schema validation failures

### Critical Alerts
- Event processing failure rate > 1%
- Dead letter queue size > 100
- Schema validation failure rate > 0.1%
- Event publishing latency > 5 seconds

## Compliance & Audit

### Audit Trail Requirements
- ALL events stored permanently for audit
- Event replay capability for investigation
- Immutable event log for compliance

### GDPR Considerations
- Personal data in events must be encrypted
- Right to erasure handled via tombstone events
- Data retention policies enforced

---

**Next Steps**:
1. Implement schema registry validation
2. Add event compatibility testing
3. Create monitoring dashboards
4. Implement event replay functionality