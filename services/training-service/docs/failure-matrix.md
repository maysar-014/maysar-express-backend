# Training Service - Failure Matrix

| Step | Failure Mode | Compensation | Timeout | Dead-Letter |
|------|--------------|--------------|---------|-------------|
| Enroll | Already enrolled | Return existing | N/A | 0 |
| Track Progress | Data loss | Retry | 10s | 5 |
| Validate Completion | Score below threshold | Require retake | N/A | 0 |
| Award Certification | Database timeout | Retry | 5s | 5 |
