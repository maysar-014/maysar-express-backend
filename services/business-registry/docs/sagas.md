# Business Registry - Sagas

## BusinessRegistrationSaga
**Purpose**: Validates and registers business entities

**Steps**:
1. Validate business documents
2. Call external KYC provider
3. Create business record
4. Emit `BusinessRegistered` event

**Compensation**: Delete business record
**Idempotency**: Keyed by `business-{registrationNumber}`
**Retry**: 3 attempts for external KYC
