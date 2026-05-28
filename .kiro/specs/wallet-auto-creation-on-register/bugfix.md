# Bugfix Requirements Document

## Introduction

When a user registers via `POST /api/auth/register`, the auth-service publishes a `UserRegistered.v1` event to the shared event bus. The wallet-service has no subscriber for this event, so it never creates a `Wallet_Wallet` record for the new user. As a result, every user registered after the pipeline broke has no wallet, causing wallet balance checks, wallet payments, and COD orders with commitment fees to fail with "wallet not found" errors.

The fix requires wiring a `UserRegistered.v1` event handler in the wallet-service that creates a wallet for the new user, with idempotency to handle duplicate event delivery safely.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user successfully registers via `POST /api/auth/register` THEN the wallet-service silently drops the `UserRegistered.v1` event and no `Wallet_Wallet` record is created for that user

1.2 WHEN a newly registered user attempts to check their wallet balance THEN the system returns a "wallet not found" error because no wallet record exists

1.3 WHEN a newly registered user attempts to make a wallet payment THEN the system fails because the wallet-service cannot find a wallet for that userId

1.4 WHEN a newly registered user attempts to place a COD order requiring a commitment fee THEN the system fails because no wallet exists to hold the commitment

### Expected Behavior (Correct)

2.1 WHEN a user successfully registers via `POST /api/auth/register` THEN the wallet-service SHALL create a `Wallet_Wallet` record for that user with zero balance, `ACTIVE` status, and `TZS` as the default currency

2.2 WHEN a newly registered user attempts to check their wallet balance THEN the system SHALL return a wallet with zero balance rather than a "not found" error

2.3 WHEN the `UserRegistered.v1` event is delivered more than once for the same userId THEN the wallet-service SHALL create only one wallet and SHALL NOT throw a duplicate-key error (idempotent handling)

2.4 WHEN the wallet-service processes a `UserRegistered.v1` event THEN the system SHALL log the outcome (success or failure) so that processing can be monitored

### Unchanged Behavior (Regression Prevention)

3.1 WHEN an existing user (registered before this fix) makes a wallet payment THEN the system SHALL CONTINUE TO process the payment using their existing wallet without modification

3.2 WHEN the `Payment.Success.v1` event is received THEN the system SHALL CONTINUE TO credit the user's wallet via `PaymentCompletedHandler` exactly as before

3.3 WHEN the `WalletTransaction.Command.v1` event is received THEN the system SHALL CONTINUE TO execute the `WalletTransactionSaga` exactly as before

3.4 WHEN the `PaymentInitiated` event is received for a WALLET-method payment THEN the system SHALL CONTINUE TO trigger the wallet debit saga exactly as before

3.5 WHEN the `SettleCODPayment` event is received THEN the system SHALL CONTINUE TO execute the `CODSettlementSaga` exactly as before

3.6 WHEN a wallet top-up is completed via `Payment.Success.v1` THEN the system SHALL CONTINUE TO credit the wallet using the existing `CreditWalletUseCase` logic

---

## Bug Condition

**Bug Condition Function:**

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type EventEnvelope
  OUTPUT: boolean

  // Returns true when the bug condition is met:
  // a UserRegistered.v1 event arrives but no wallet exists for that userId
  RETURN X.eventType = 'UserRegistered.v1'
     AND walletRepository.findByUserId(X.data.userId) = null
END FUNCTION
```

**Property: Fix Checking**

```pascal
// Property: Fix Checking — wallet is created for every new user registration
FOR ALL X WHERE isBugCondition(X) DO
  result ← handleUserRegistered'(X)
  ASSERT walletRepository.findByUserId(X.data.userId) ≠ null
  ASSERT wallet.status = ACTIVE
  ASSERT wallet.balance = 0
  ASSERT wallet.currency = 'TZS'
END FOR
```

**Property: Preservation Checking**

```pascal
// Property: Preservation Checking — non-registration events are unaffected
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT F(X) = F'(X)
END FOR
```
