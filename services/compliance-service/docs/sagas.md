# Compliance Service - Sagas

## ComplianceCheckSaga
**Purpose**: Validates transactions against compliance rules

**Steps**:
1. Fetch transaction details
2. Apply AML/KYC rules
3. Calculate risk score
4. Flag if suspicious
5. Emit alert if needed

**Compensation**: None (monitoring only)
**Idempotency**: Keyed by `compliance-{transactionId}`
