# Wallet Service Modeling Docs

This directory contains the software modeling documentation for the Wallet Service, following the project's modeling constitution.

## Use Case Diagrams
- [wallet-management.mmd](./use-cases/wallet-management.mmd): Core wallet operations for customers, admins, and system processes.

## State Machine Diagrams
- [wallet-status.mmd](./state-machines/wallet-status.mmd): Lifecycle of a wallet (Active, Frozen, Suspended, Closed).
- [transaction-lifecycle.mmd](./state-machines/transaction-lifecycle.mmd): States and types of financial transactions.

## Sequence Diagrams
- [wallet-transaction-saga.mmd](./sequence/wallet-transaction-saga.mmd): Transaction coordination and consistency.
- [credit-wallet-flow.mmd](./sequence/credit-wallet-flow.mmd): Detailed flow for adding funds to a wallet.
- [debit-wallet-flow.mmd](./sequence/debit-wallet-flow.mmd): Detailed flow for spending funds from a wallet.
- [freeze-funds-flow.mmd](./sequence/freeze-funds-flow.mmd): Detailed flow for locking funds in a wallet.
- [wallet-topup-flow.mmd](./sequence/wallet-topup-flow.mmd): Multi-provider top-up integration with Payment Service.

---
*Last Updated: 2026-02-07*
