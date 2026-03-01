# User Service - Sagas

## UserRegistrationSaga
**Purpose**: Orchestrates user registration with wallet creation

**Steps**:
1. Create user record
2. Trigger wallet creation (wallet-service)
3. Send welcome notification
4. Emit `UserRegistered` event

**Compensation**: Delete user, delete wallet
**Idempotency**: Keyed by `register-{email}`

## UserVerificationSaga
**Purpose**: KYC verification workflow

**Steps**:
1. Submit verification documents
2. Call external KYC provider
3. Update verification status
4. Emit `UserVerified` event

**Compensation**: Revert verification status
**Retry**: 3 attempts for external KYC call
