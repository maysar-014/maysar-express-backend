# Analytics Service - Failure Matrix

| Step | Failure Mode | Compensation | Timeout | Dead-Letter |
|------|--------------|--------------|---------|-------------|
| Consume Event | Event malformed | Log, skip | N/A | 0 |
| Aggregate Metric | Database timeout | Retry | 10s | 5 |
| Generate Report | Template error | Alert, skip | N/A | Manual |
| Store Report | Storage full | Alert, retry | 15s | 3 |
