# Quick Reference Guide - Implemented Use Cases

## 🎯 All 7 Use Cases Implemented

### Priority 1: Critical Operations

#### 1️⃣ DeleteAccountUseCase
```typescript
import { DeleteAccountUseCase } from './use-cases';

const useCase = new DeleteAccountUseCase(userRepository, eventPublisher);
const result = await useCase.execute({
  userId: 'user-123',
  deletedBy: 'admin-456',
  reason: 'User requested deletion'
});
// Triggers: AccountDeletionSaga
// Steps: Terminate sessions → Anonymize data → Archive → Audit → Notify
```

#### 2️⃣ ChangePasswordUseCase
```typescript
import { ChangePasswordUseCase } from './use-cases';

const useCase = new ChangePasswordUseCase(userRepository, eventPublisher);
const result = await useCase.execute({
  userId: 'user-123',
  newPassword: 'NewSecurePassword123!',
  changedBy: 'user-123',
  reason: 'user_initiated'
});
// Triggers: PasswordResetSaga
// Steps: Invalidate sessions → Send notification
```

#### 3️⃣ SuspendAccountUseCase
```typescript
import { SuspendAccountUseCase } from './use-cases';

const useCase = new SuspendAccountUseCase(userRepository);
const result = await useCase.execute({
  userId: 'user-123',
  suspendedBy: 'admin-456',
  reason: 'Suspicious activity detected',
  duration: 86400000 // 24 hours in ms
});
// Triggers: AccountSuspensionSaga
// Steps: Terminate sessions → Record audit → Notify user → Notify admin
```

---

### Priority 2: High-Priority Operations

#### 4️⃣ ChangeRoleUseCase
```typescript
import { ChangeRoleUseCase } from './use-cases';

const useCase = new ChangeRoleUseCase(userRepository);
const result = await useCase.execute({
  userId: 'user-123',
  newRole: 'seller',
  changedBy: 'admin-456',
  promotionReason: 'Verified seller application'
});
// Triggers: RoleChangeSaga
// Steps: Sync permissions → Update ACLs → Record audit → Notify user
```

#### 5️⃣ VerifyPhoneUseCase
```typescript
import { VerifyPhoneUseCase } from './use-cases';

const useCase = new VerifyPhoneUseCase(userRepository);
const result = await useCase.execute({
  userId: 'user-123',
  phoneNumber: '+255712345678',
  otp: '123456',
  verificationMethod: 'otp'
});
// Triggers: PhoneVerificationSaga
// Steps: Validate OTP → Update status → Record audit → Send notification
```

#### 6️⃣ SetupTwoFactorUseCase
```typescript
import { SetupTwoFactorUseCase } from './use-cases';

const useCase = new SetupTwoFactorUseCase(userRepository);
const result = await useCase.execute({
  userId: 'user-123',
  method: 'totp',
  deviceId: 'device-456'
});
// Returns: { secret, backupCodes }
// Triggers: TwoFactorSetupSaga
// Steps: Register device → Generate codes → Record audit → Send notification
```

---

### Priority 3: Medium-Priority Operations

#### 7️⃣ ReportSecurityBreachUseCase
```typescript
import { ReportSecurityBreachUseCase } from './use-cases';

const useCase = new ReportSecurityBreachUseCase(userRepository);
const result = await useCase.execute({
  userId: 'user-123',
  breachType: 'suspicious_login',
  severity: 'high',
  details: {
    ipAddress: '192.168.1.1',
    location: 'Unknown',
    timestamp: new Date()
  },
  reportedBy: 'security-system'
});
// Triggers: SecurityPolicyBreachSaga
// Steps: Alert team → Review sessions → Record event → Notify user
```

---

## 📊 Coverage Matrix

| Use Case | Event | Saga | Authorization | Status |
|----------|-------|------|---------------|--------|
| DeleteAccount | AccountDeletionEvent | AccountDeletionSaga | User/Admin | ✅ |
| ChangePassword | UserPasswordChangedEvent | PasswordResetSaga | User/Admin | ✅ |
| SuspendAccount | AccountSuspensionEvent | AccountSuspensionSaga | Admin | ✅ |
| ChangeRole | RoleChangeEvent | RoleChangeSaga | Admin | ✅ |
| VerifyPhone | PhoneVerificationEvent | PhoneVerificationSaga | User | ✅ |
| SetupTwoFactor | TwoFactorSetupEvent | TwoFactorSetupSaga | User | ✅ |
| ReportSecurityBreach | SecurityPolicyBreachEvent | SecurityPolicyBreachSaga | System | ✅ |

---

## 🔐 Authorization Rules

### User Self-Service
- ✅ ChangePassword (own account)
- ✅ VerifyPhone (own account)
- ✅ SetupTwoFactor (own account)

### Admin Only
- ✅ SuspendAccount
- ✅ ChangeRole
- ✅ DeleteAccount (others)

### System/Security
- ✅ ReportSecurityBreach

---

## 📝 Input Validation

### ChangePasswordUseCase
- Password minimum 8 characters
- Cannot be empty

### VerifyPhoneUseCase
- Tanzanian phone format: +255 or 0 followed by valid carrier codes
- OTP minimum 4 characters

### ChangeRoleUseCase
- Valid roles: buyer, seller, supplier, courier, enabler, system
- Cannot change to same role

### SetupTwoFactorUseCase
- Method: totp or sms
- Optional deviceId

### ReportSecurityBreachUseCase
- Valid breach types: suspicious_login, multiple_failed_attempts, unusual_activity, location_anomaly
- Valid severities: low, medium, high, critical

---

## 🎯 Saga Orchestration

### Event Publishing Flow
```
Use Case Execute
    ↓
Business Logic
    ↓
Validation
    ↓
State Change (Database)
    ↓
Event Created
    ↓
Event Published
    ↓
SagaEventHandler Receives
    ↓
Saga Executed
    ↓
Compensation on Failure
```

### Error Handling
All use cases return:
```typescript
{
  success: boolean;
  message: string;
  // Additional fields based on use case
}
```

---

## 🚀 Integration Checklist

### Before Using These Use Cases

- [ ] Repository methods implemented
  - [ ] updatePassword()
  - [ ] updateStatus()
  - [ ] updateRole()
  - [ ] updatePhoneVerification()
  - [ ] markAsDeleted()
  - [ ] setupTwoFactor()
  - [ ] recordSecurityEvent()

- [ ] Event handlers registered
  - [ ] handleAccountDeletionEvent()
  - [ ] handleUserPasswordChangedEvent()
  - [ ] handleAccountSuspensionEvent()
  - [ ] handleRoleChangeEvent()
  - [ ] handlePhoneVerificationEvent()
  - [ ] handleTwoFactorSetupEvent()
  - [ ] handleSecurityPolicyBreachEvent()

- [ ] API endpoints created
- [ ] Tests written and passing
- [ ] Documentation updated

---

## 📚 File Locations

```
user-service/src/application/use-cases/
├── delete-account.use-case.ts
├── change-password.use-case.ts
├── suspend-account.use-case.ts
├── change-role.use-case.ts
├── verify-phone.use-case.ts
├── setup-two-factor.use-case.ts
├── report-security-breach.use-case.ts
└── index.ts (exports all)
```

---

## 🔗 Related Documentation

- `SAGA_TRIGGERS.md` - Event flow and saga orchestration
- `USE_CASE_SAGA_COVERAGE.md` - Coverage analysis
- `IMPLEMENTATION_SUMMARY.md` - Detailed implementation info
- `EXECUTION_PLAN.md` - Project timeline and phases

---

## ✅ Quality Assurance

All use cases include:
- ✅ Input validation
- ✅ Authorization checks
- ✅ Error handling
- ✅ Business logging
- ✅ Event publishing
- ✅ Saga orchestration
- ✅ Compensation logic

---

## 🎓 Learning Resources

### Event-Driven Architecture
- Events trigger sagas
- Sagas handle distributed transactions
- Compensation logic handles failures
- Idempotency prevents duplicates

### Saga Pattern
- Forward transaction: Execute steps
- Backward transaction: Compensate on failure
- Idempotency key: Prevents duplicate processing
- Circuit breaker: Handles service failures

### DDD Principles
- Domain events represent state changes
- Use cases orchestrate business logic
- Repositories abstract data access
- Policies enforce business rules

---

*Quick Reference v1.0*
*All 7 Use Cases Implemented ✅*
*Ready for Integration ⏳*
