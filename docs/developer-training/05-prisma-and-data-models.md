# Prisma And Data Modeling

This tutorial explains how database schema changes flow through the application.

## What Prisma Is Doing Here

Prisma is the bridge between TypeScript and PostgreSQL.

It gives us:

- a typed client
- schema migrations
- model relations
- enum mapping
- transactional data access

## Schema Changes

When you add a field, think about:

- default values
- nullability
- uniqueness
- backfill requirements
- how existing code will read it

### Example: KYC Fields

The KYC work added fields like:

- `kycStatus`
- `kycLevel`
- `kycSubmittedAt`
- `kycVerifiedAt`
- `kycData`
- `kycNationalId`

That gives the system room to store both state and evidence.

## Example Migration Mindset

Good migration questions:

1. Can this be added without breaking old rows?
2. Do we need a default?
3. Do we need a unique index?
4. Do we need a backfill?
5. Do we need to update the application before or after the migration?

## Reading And Writing With Prisma

```ts
const user = await prisma.user_User.findUnique({
  where: { id: userId },
  select: {
    id: true,
    kycStatus: true,
    kycLevel: true
  }
});
```

```ts
await prisma.user_User.update({
  where: { id: userId },
  data: {
    kycStatus: 'verified',
    kycLevel: 1
  }
});
```

## Uniqueness And Safety

If a field should not be duplicated, prefer a DB-level unique constraint.

The KYC national ID field is a good example:

- application code checks for duplicates
- Prisma catches race conditions
- the database guarantees integrity

## JSON Fields

JSON fields are useful when the shape is semi-structured.

Example:

```ts
kycData: {
  fullName: 'Ada Lovelace',
  nationalId: 'A1234567',
  documents: ['https://example.com/id-front.pdf']
}
```

Use JSON when the structure is flexible, but do not use it to hide core relational data.

## Exercise

Pick one model in `prisma/schema.prisma` and answer:

- which fields are required?
- which fields are optional?
- which fields need indexes?
- which fields should be unique?
