# Business Registry - Failure Matrix

| Step | Failure Mode | Compensation | Timeout | Dead-Letter |
|------|--------------|--------------|---------|-------------|
| Validate Documents | Invalid format | Reject | N/A | 0 |
| External KYC | Provider timeout | Retry | 30s | 3 |
| Create Record | Duplicate registration | Return existing | N/A | 0 |
| Upload Document | Storage failure | Retry | 15s | 5 |
