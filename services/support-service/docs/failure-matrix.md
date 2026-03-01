# Support Service - Failure Matrix

| Step | Failure Mode | Compensation | Timeout | Dead-Letter |
|------|--------------|--------------|---------|-------------|
| Create Ticket | Duplicate | Return existing | N/A | 0 |
| Assign Agent | No agent available | Queue | 30s | Manual |
| Track Resolution | Database timeout | Retry | 10s | 5 |
| Collect Feedback | User unresponsive | Skip | N/A | 0 |
