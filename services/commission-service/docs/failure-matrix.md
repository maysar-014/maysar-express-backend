# Commission Service - Failure Matrix

| Step | Failure Mode | Compensation | Timeout | Dead-Letter |
|------|--------------|--------------|---------|-------------|
| Fetch Order | Order not found | Return 404 | 5s | 0 |
| Fetch Metrics | Metrics unavailable | Use defaults | 10s | 3 |
| Calculate Commission | Invalid rate | Use snapshot | N/A | 0 |
| Quality Bonus | Metrics incomplete | Skip bonus | N/A | 0 |
