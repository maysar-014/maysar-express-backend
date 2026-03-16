# shared/database

Prisma client singleton with automatic prefixed-ULID ID generation middleware.

## Purpose

Provides a single `PrismaClient` instance shared across all service modules, with an ID middleware that auto-generates prefixed ULIDs for every model that has an `id` field. This ensures all entity IDs are human-readable and domain-traceable (e.g., `ord_01J...`, `pay_01J...`).

## Exports

| Export | Description |
|--------|-------------|
| `createPrismaClient(options?)` | Creates a new `PrismaClient` with ID middleware applied |

## Usage

```typescript
import { createPrismaClient } from '@shared/database/prisma-client';

const prisma = createPrismaClient();

// IDs are auto-generated — no need to set `id` manually
const order = await prisma.order_Order.create({
  data: { userId: 'usr_01J...', total: 5000 }
  // id is automatically set to 'ord_01J...'
});
```

## ID Middleware

The `applyIdMiddleware` function hooks into Prisma's `$use` middleware. On every `create` and `createMany` operation, it:

1. Looks up the model name in the domain prefix registry (`shared/ids/id.ts`)
2. Generates a prefixed ULID: `{prefix}_{ulid26chars}`
3. Sets `data.id` if not already provided

See [shared/ids/README.md](../ids/README.md) for the full prefix registry.

## Configuration

| Env Var | Description |
|---------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (required) |

## Dependencies

- `@prisma/client` — ORM client
- `shared/ids/id` — prefix registry and ULID generation
