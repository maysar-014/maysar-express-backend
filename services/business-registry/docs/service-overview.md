# Business Registry - Service Overview
Manages business registration, KYC verification, and compliance documentation for sellers.

# Events
- BusinessRegistered, KYCVerified, DocumentUploaded

# Sagas
- BusinessRegistrationSaga: Validates and registers business entities

# Failure Matrix
| Step | Failure | Compensation | Timeout |
|------|---------|--------------|---------|
| Validate Documents | Invalid | Reject | N/A |
| External KYC | Timeout | Retry | 30s |

# Scaling
- Low volume: 5 registrations/s
- Stateless validation

# Revenue Impact
- KYC completion: Enables seller onboarding
- Compliance: Reduces regulatory risk
