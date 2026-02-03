# User Service Modeling Docs

This directory contains the software modeling documentation for the User Service.

## Use Case Diagrams
- [account-management.mmd](./use-cases/account-management.mmd): Core profile and account operations.
- [security-management.mmd](./use-cases/security-management.mmd): 2FA, verification, and reset flows.

## Sequence Diagrams
- [account-deletion-saga.mmd](./sequence/account-deletion-saga.mmd): Coordinated account deletion.
- [account-suspension-saga.mmd](./sequence/account-suspension-saga.mmd): Coordinated account suspension.
- [email-verification-saga.mmd](./sequence/email-verification-saga.mmd): Email verification flow.
- [phone-verification-saga.mmd](./sequence/phone-verification-saga.mmd): Phone verification flow.
- [password-reset-saga.mmd](./sequence/password-reset-saga.mmd): Password reset flow.
- [role-change-saga.mmd](./sequence/role-change-saga.mmd): Role and permission transition.
- [profile-update-saga.mmd](./sequence/profile-update-saga.mmd): Coordinated profile changes.
- [two-factor-setup-saga.mmd](./sequence/two-factor-setup-saga.mmd): 2FA activation flow.
- [security-policy-breach-saga.mmd](./sequence/security-policy-breach-saga.mmd): Incident response and locking.

---
*Last Updated: 2026-02-02*
