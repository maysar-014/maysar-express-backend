# Payout Service - Failure Matrix

| Step | Failure Mode | Compensation | Timeout | Dead-Letter |
|------|--------------|--------------|---------|-------------|
| Validate Bank Details | Invalid account | Reject payout | N/A | 0 |
| Debit Wallet | Insufficient balance | Reject payout | 15s | 0 |
| Bank Transfer | Bank API timeout | Retry | 60s | 3 |
| Track Status | Status unavailable | Poll retry | 30s | 5 |
| Reconciliation | Mismatch detected | Manual review | N/A | Manual |
