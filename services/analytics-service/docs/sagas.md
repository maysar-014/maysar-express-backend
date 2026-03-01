# Analytics Service - Sagas

## MetricAggregationSaga
**Purpose**: Aggregates raw events into metrics

**Steps**:
1. Consume event stream
2. Apply aggregation rules
3. Update metric tables
4. Emit `MetricCalculated` event

**Compensation**: None (idempotent aggregation)
**Idempotency**: Event-based deduplication

## ReportGenerationSaga
**Purpose**: Generates scheduled reports

**Steps**:
1. Query metric tables
2. Apply report template
3. Generate report file
4. Store report
5. Notify recipients

**Compensation**: None (read-only)
