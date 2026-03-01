# User Service - Failure Matrix

| Step | Failure Mode | Compensation | Timeout | Dead-Letter |
|------|--------------|--------------|---------|-------------|
| Create User | Duplicate email | Return existing | N/A | 0 |
| Create Wallet | Wallet service down | Delete user, retry | 15s | 3 |
| KYC Verification | Provider timeout | Retry | 30s | 3 |
| COD Reputation Update | Invalid score | Log error | N/A | 0 |
