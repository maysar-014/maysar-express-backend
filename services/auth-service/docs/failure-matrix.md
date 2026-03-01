# Auth Service - Failure Matrix

| Step | Failure Mode | Compensation | Timeout | Dead-Letter |
|------|--------------|--------------|---------|-------------|
| Validate Credentials | Invalid password | Return 401 | N/A | 0 |
| Send OTP | SMS service down | Retry | 10s | 3 |
| Create Session | Redis unavailable | Retry | 5s | 5 |
| Generate JWT | Signing key missing | Alert, fail | N/A | 0 |
| Brute Force | >5 failed attempts | Lock account 15m | N/A | 0 |
