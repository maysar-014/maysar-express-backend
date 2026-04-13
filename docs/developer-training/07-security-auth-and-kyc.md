# Security, Auth, And KYC

This tutorial covers the most visible business policy in the platform: auth and KYC gating.

## Auth Context

The platform supports several identity shapes:

- end user
- service
- contract test context

The shared auth middleware resolves that context before routes run.

## Role Checks

Role checks answer:

- Is the caller authenticated?
- Is the caller allowed to access this resource?
- Is a specific service allowed to act here?

## KYC Levels

KYC is progressive:

- level 0: no verification
- level 1: basic verification
- level 2: funds and revenue related actions
- level 3: high-volume seller actions

## Why Progressive KYC Matters

It lets the platform:

- allow early engagement
- delay heavy verification until it is actually needed
- enforce limits based on risk and business activity

## Example Gate

```ts
router.post(
  '/:userId/payout',
  AuthorizationMiddleware.authorizeWalletAccess(),
  AuthorizationMiddleware.authorizeRole(['enabler']),
  requireKycLevel(2),
  asyncHandler(controller.initiatePayout.bind(controller))
);
```

The important idea is order:

1. authenticate
2. authorize role
3. enforce KYC
4. process business logic

## KYC Submission Flow

The submission endpoint:

- validates the payload
- checks pending state
- stores identity data
- records an audit log

That gives you traceability and safe resubmission behavior.

## KYC Approval Flow

The admin approval endpoint:

- verifies the user is pending
- updates the user to verified
- sets the new level and limits
- records audit history
- publishes a status event

## Exercise

Think through three scenarios:

1. user with KYC level 0 tries to withdraw funds
2. user with KYC level 1 tries to place a high-volume order
3. admin rejects a KYC submission

For each one, write what should happen and which layer should enforce it.
