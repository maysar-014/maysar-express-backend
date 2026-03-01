# Compliance Service - Failure Matrix

| Step | Failure Mode | Compensation | Timeout | Dead-Letter |
|------|--------------|--------------|---------|-------------|
| Fetch Transaction | Not found | Skip check | 5s | 0 |
| Apply Rules | Rule engine down | Alert, allow | 10s | 3 |
| Calculate Risk | Calculation error | Use default | N/A | 0 |
| Flag Activity | Database timeout | Retry | 5s | 5 |
