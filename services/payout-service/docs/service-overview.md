# Payout Service - Service Overview

## Purpose
Manages seller and enabler payouts to bank accounts and mobile money. Handles payout scheduling, batching, and reconciliation.

## Key Domain Concepts

### Payout Methods
- Bank transfer
- Mobile money (M-Pesa, Airtel Money)
- Wallet balance

### Payout Schedule
- Daily payouts for high-volume sellers
- Weekly payouts for standard sellers
- On-demand payouts (with fee)

### Reconciliation
- Matches wallet debits to bank credits
- Handles failed payouts
- Retry logic for transient failures

## Primary Dependencies
- **wallet-service**: Payout source
- **bank-integration**: Bank transfer API
- **mobile-money-provider**: M-Pesa/Airtel API

## Entry Point
`services/payout-service/src/index.ts`

## Database Schema
- `Payout_Payout`: Payout records
- `Payout_BankAccount`: Seller bank details (encrypted)
- `Payout_ReconciliationLog`: Reconciliation tracking
