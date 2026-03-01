# Auth Service - Sagas

## LoginSaga
**Purpose**: Authenticates user with optional 2FA

**Steps**:
1. Validate credentials
2. Check 2FA requirement
3. Send OTP if 2FA enabled
4. Create session
5. Generate JWT tokens

**Compensation**: Invalidate session
**Idempotency**: Keyed by `login-{userId}-{timestamp}`

## TwoFactorEnrollmentSaga
**Purpose**: Enrolls user in 2FA

**Steps**:
1. Generate 2FA secret
2. Send setup instructions
3. Verify test code
4. Activate 2FA

**Compensation**: Delete 2FA secret
**Retry**: 3 attempts for SMS delivery
