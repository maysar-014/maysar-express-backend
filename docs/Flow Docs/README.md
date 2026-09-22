> ## ⚠️ DEPRECATED — LEGACY ARCHIVE
>
> **This directory (`docs/Flow Docs/`) is now a legacy archive. No new documents will be added here.**
>
> The canonical source for all user flow documentation and frontend guides is:
> **[`docs/FLOWS/`](../FLOWS/README.md)**
>
> The files in this directory are preserved for historical reference only. They may contain conflicts,
> obsolete diagrams, or flows that predate the verified system behavior documented in `docs/FLOWS/`.
> Do not use these files as implementation references — always defer to `docs/FLOWS/`.
>
> *Deprecated: September 2026 — service-flow-documentation spec*

---

# Flow Docs

Persona-first journey maps for the Maysar platform.

This folder translates the service catalog and cross-service modeling docs into execution-level flows that show:

- who is involved
- which platform services are concerned
- what the happy path looks like
- which unhappy paths must be handled
- how compensations, retries, and notifications behave

The diagrams in this folder reflect the current modular monolith runtime and the shared in-process EventBus.

## How To Read These Docs

- `Happy path` means the expected, successful end-to-end journey.
- `Unhappy path` means validation failure, authorization failure, dependency outage, or a business-rule rejection.
- `Concerned services` lists every backend system that is affected by the flow.
- `Compensation` describes what the platform reverses or repairs after a failure.

## Folder Map

| File | Scope | Primary users | Primary services |
|------|-------|---------------|------------------|
| [01-auth-and-access.md](./01-auth-and-access.md) | Login, session, password reset, 2FA | All users, admins | `auth-service`, `user-service`, `notification-service` |
| [02-customer-journeys.md](./02-customer-journeys.md) | Browse, checkout, payment, tracking, refund | Buyers / customers | `catalog-service`, `checkout-service`, `order-service`, `payment-service`, `wallet-service` |
| [03-seller-journeys.md](./03-seller-journeys.md) | Seller onboarding, catalog, pricing, campaigns, payouts | Sellers, business owners | `business-registry-service`, `compliance-service`, `catalog-service`, `order-service`, `payout-service` |
| [04-supplier-journeys.md](./04-supplier-journeys.md) | Production, quality control, bulk fulfillment | Suppliers | `production-service`, `inventory-service`, `logistics-service` |
| [05-courier-journeys.md](./05-courier-journeys.md) | Availability, assignment, delivery, COD, earnings | Couriers | `logistics-service`, `maps-service`, `wallet-service`, `payout-service` |
| [06-enabler-journeys.md](./06-enabler-journeys.md) | Enabler onboarding, training, assisted sales, commissions | Enablers | `enabler-service`, `training-service`, `commission-service`, `wallet-service` |
| [07-admin-support-compliance.md](./07-admin-support-compliance.md) | Admin actions, support tickets, KYC review, audits, disputes | Admins, support agents, compliance officers | `auth-service`, `user-service`, `support-service`, `compliance-service`, `order-service`, `payment-service`, `wallet-service` |
| [08-platform-operations.md](./08-platform-operations.md) | Wallet ledger, notifications, analytics, saga recovery | Platform operators, system processes | `wallet-service`, `notification-service`, `analytics-service`, `shared/outbox`, `shared/saga` |

## Persona Coverage

| Persona | What they care about |
|---------|----------------------|
| Guest / buyer | Account access, product discovery, checkout, payment, delivery, refund |
| Seller / business owner | Business setup, catalog publishing, pricing, campaigns, payouts, support |
| Supplier | Production planning, quality control, capacity, inventory sync, receivables |
| Courier | Availability, route assignment, delivery status, COD verification, earnings |
| Enabler | Onboarding, training, assisted sales attribution, commission settlement |
| Admin | User management, system controls, risk actions, dashboards, auditability |
| Support agent | Ticket triage, escalation, resolution, customer communication |
| Compliance officer | KYC/AML review, suspicious activity handling, regulatory reporting |
| Platform operator | Idempotency, retry behavior, wallet integrity, notifications, analytics, saga recovery |

## Design Rules

- Every flow names the human actor first and the backend services second.
- Every unhappy path must identify the compensating action, if one exists.
- Every diagram should expose the state transitions that matter to the user.
- When a flow touches money, stock, or identity, it should show the audit trail.

## Recommended Reading Order

1. [01-auth-and-access.md](./01-auth-and-access.md)
2. [02-customer-journeys.md](./02-customer-journeys.md)
3. [03-seller-journeys.md](./03-seller-journeys.md)
4. [04-supplier-journeys.md](./04-supplier-journeys.md)
5. [05-courier-journeys.md](./05-courier-journeys.md)
6. [06-enabler-journeys.md](./06-enabler-journeys.md)
7. [07-admin-support-compliance.md](./07-admin-support-compliance.md)
8. [08-platform-operations.md](./08-platform-operations.md)

