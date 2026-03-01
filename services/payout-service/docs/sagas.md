# Payout Service - Sagas

## PayoutProcessingSaga
**Purpose**: Processes payout to external account

**Steps**:
1. Validate bank details
2. Debit wallet balance
3. Initiate bank transfer
4. Track transfer status
5. Emit `PayoutCompleted` event

**Compensation**: Credit wallet, mark payout failed
**Idempotency**: Keyed by `payout-{recipientId}-{amount}-{timestamp}`
**Retry**: 3 attempts for bank API calls
