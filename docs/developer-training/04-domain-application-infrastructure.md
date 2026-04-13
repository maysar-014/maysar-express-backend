# Domain, Application, And Infrastructure

This tutorial goes deeper into the separation of concerns.

## Domain

The domain layer should answer:

- What is allowed?
- What is required?
- What state transitions exist?

Domain code should be as pure as possible.

### Example

The KYC milestone engine is a good domain service:

```ts
const trigger = evaluationService.evaluateKycRequirement({
  totalOrders: 10,
  totalListings: 0,
  walletBalance: 5000,
  totalTransactions: 2,
  role: 'buyer',
  currentKycLevel: 0
});
```

That function cares about business facts, not HTTP or database code.

## Application

The application layer answers:

- What steps happen?
- In what order?
- What do we do if a step fails?

### Example

The KYC approval flow:

1. Load the user snapshot
2. Confirm the status is pending
3. Update the user record
4. Write an audit log
5. Publish a status change event
6. Create a notification, if possible

This is orchestration logic, so it belongs in application code.

## Infrastructure

Infrastructure answers:

- How do we talk to the database?
- How do we call Redis?
- How do we emit events?

### Example Repository Pattern

```ts
const snapshot = await prisma.user_User.findUnique({
  where: { id: userId },
  select: {
    id: true,
    kycStatus: true,
    kycLevel: true
  }
});
```

The repository hides this Prisma query behind a friendly method like `findUserSnapshot()`.

## Common Mistake

Do not put this kind of code in a controller:

```ts
if (body.action === 'approve') {
  await prisma.user_User.update(...)
}
```

That makes the controller too smart and too hard to test.

Instead:

```ts
await adminVerifyKycUseCase.execute({
  userId: req.params.userId,
  action: req.body.action,
  adminUserId
});
```

## Good Rule Of Thumb

- If the code is about business meaning, keep it in domain or application
- If the code is about persistence or integration, keep it in infrastructure
- If the code is about HTTP details, keep it in api

## Exercise

Find a feature in the codebase that currently mixes responsibilities.

Ask:

- what should move to a use case?
- what should stay in the controller?
- what should move into a repository?
