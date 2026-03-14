# Integration Constitution Audit

- Generated At: 2026-03-09T10:16:43.125Z
- Services Audited: 21
- Integration Tests Found: 25
- Location Violations: 0
- Internal Mock Violations: 0
- Assertion Violations: 0
- Services Missing Integration Tests: 0
- Priority 1 Coverage Failures: 0

## Service Coverage Matrix

| Service | Integration Test Count |
|---|---:|
| analytics-service | 1 |
| auth-service | 1 |
| business-registry-service | 1 |
| catalog-service | 1 |
| checkout-service | 1 |
| commission-service | 1 |
| community-service | 1 |
| compliance-service | 1 |
| enabler-service | 1 |
| inventory-service | 1 |
| logistics-service | 2 |
| maps-service | 1 |
| notification-service | 1 |
| order-service | 1 |
| payment-service | 3 |
| payout-service | 1 |
| production-service | 1 |
| support-service | 1 |
| training-service | 1 |
| user-service | 1 |
| wallet-service | 1 |

## Violations - Integration Test Location

| File | Reason |
|---|---|
| (none) | - |

## Violations - Internal Mocks in Integration Tests

| File | Mock Target | Reason |
|---|---|---|
| (none) | - | - |

## Violations - Missing Assertions

| File | Reason |
|---|---|
| (none) | - |

## Services Missing Integration Tests

- (none)

## Priority 1 Coverage Checks (INTEGRATION_TEST_CATALOG.md)

| Check | Required | Passed |
|---|---|---|
| Order -> Payment -> Inventory -> Delivery integration flow coverage exists | Yes | Yes |
| User registration/auth verification flow has integration coverage | Yes | Yes |
| Pesapal payment gateway integration is covered | Yes | Yes |
| Wallet credit/debit/freeze integration is covered | Yes | Yes |
| Outbox pattern integration is covered | Yes | Yes |
| Order fulfillment saga integration/compensation is covered | Yes | Yes |

## Warnings - No Real I/O Signal Detected

| File | Note |
|---|---|
| (none) | - |
