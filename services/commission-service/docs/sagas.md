# Commission Service - Sagas

## CommissionCalculationSaga
**Purpose**: Calculates commission with quality bonus

**Steps**:
1. Fetch order details
2. Fetch seller/enabler quality metrics
3. Calculate base commission
4. Calculate quality bonus
5. Emit `CommissionCalculated` event

**Compensation**: None (read-only calculation)
**Idempotency**: Keyed by `commission-{orderId}`
