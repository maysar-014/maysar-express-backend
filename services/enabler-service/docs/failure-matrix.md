# Enabler Service - Failure Matrix

| Step | Failure Mode | Compensation | Timeout | Dead-Letter |
|------|--------------|--------------|---------|-------------|
| Find Enabler | No enabler available | Queue for manual | 10s | Manual |
| Assign Task | Enabler unavailable | Find next | 5s | 3 |
| Validate Deliverables | Quality below threshold | Reject, reassign | N/A | 0 |
| Trigger Payout | Wallet service down | Retry | 15s | 5 |
