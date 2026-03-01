# Notification Service - Failure Matrix

| Step | Failure Mode | Compensation | Timeout | Dead-Letter |
|------|--------------|--------------|---------|-------------|
| Check Preferences | User not found | Skip notification | N/A | 0 |
| Send SMS | SMS service down | Retry, fallback to email | 10s | 3 |
| Send Email | Email provider down | Retry | 15s | 3 |
| Send Push | Device token invalid | Remove token | N/A | 0 |
| Track Delivery | Tracking service down | Log locally | 5s | 0 |
