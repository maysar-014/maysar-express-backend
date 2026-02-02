# Payout Service Modeling Docs

This directory contains the software modeling documentation for the Payout Service, following the project's modeling constitution.

## Use Case Diagrams
- [payout-management.mmd](./use-cases/payout-management.mmd): Payout operations for sellers, admins, and payment providers.

## State Machine Diagrams
- [payout-status.mmd](./state-machines/payout-status.mmd): Lifecycle of a payout request (Pending, Processing, Completed, Failed, Cancelled).

## Sequence Diagrams
- [payout-processing-saga.mmd](./sequence/payout-processing-saga.mmd): Coordination between payouts, wallets, and payment providers.
- [initiate-payout-flow.mmd](./sequence/initiate-payout-flow.mmd): Process for creating a new payout request.
- [complete-payout-flow.mmd](./sequence/complete-payout-flow.mmd): Finalizing a successful payout.

---
*Last Updated: 2026-02-02*
