# Wallet Service Modeling Docs

This directory contains the software modeling documentation for the Wallet Service, following the project's modeling constitution.

## Role-Based Access Control (RBAC)

The wallet service enforces role-based access control for financial operations:

| Operation | Allowed Roles | Description |
|-----------|---------------|-------------|
| Top-up Wallet | BUYER, SELLER | Add funds to wallet via payment providers |
| Initiate Payout | ENABLER | Withdraw funds from wallet to bank account |
| View Balance | All authenticated | View own wallet balance |
| View Transaction History | All authenticated | View own transaction history |
| Freeze/Unfreeze | ADMIN, SYSTEM | Lock/unlock wallet funds |

## Use Case Diagrams
- [wallet-management.mmd](./use-cases/wallet-management.mmd): Core wallet operations with role-based actors (Buyer, Seller, Enabler, Admin, System).

## State Machine Diagrams
- [wallet-status.mmd](./state-machines/wallet-status.mmd): Lifecycle of a wallet (Active, Frozen, Suspended, Closed).
- [transaction-lifecycle.mmd](./state-machines/transaction-lifecycle.mmd): States and types of financial transactions.

## Sequence Diagrams
- [wallet-transaction-saga.mmd](./sequence/wallet-transaction-saga.mmd): Transaction coordination and consistency.

---
*Last Updated: 2026-02-09*
