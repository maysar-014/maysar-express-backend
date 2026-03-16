# shared/validation

Zod and Joi ID validators that enforce the platform's prefixed ULID ID format.

## Purpose

Provides reusable validators for entity IDs in both Zod schemas (used in newer services) and Joi schemas (used in older services). Both validators delegate to `isSystemId` from `shared/ids`, which accepts prefixed ULIDs, UUIDs, and CUIDs for backward compatibility.

## Exports

| Export | Description |
|--------|-------------|
| `zodId(message?)` | Zod string schema that validates via `isSystemId` |
| `joiId(message?)` | Joi string schema with custom `isSystemId` validator |
| `isSystemId` | Re-exported from `shared/ids/id` |

## Usage

### With Zod

```typescript
import { zodId } from '@shared/validation/id';
import { z } from 'zod';

const CreateOrderSchema = z.object({
  userId: zodId('Invalid user ID'),
  productId: zodId(),
  quantity: z.number().int().positive()
});

const parsed = CreateOrderSchema.parse(req.body);
```

### With Joi

```typescript
import { joiId } from '@shared/validation/id';
import Joi from 'joi';

const schema = Joi.object({
  orderId: joiId('Invalid order ID').required(),
  paymentMethod: Joi.string().valid('COD', 'CARD', 'MOBILE_MONEY')
});
```

## Valid ID Formats

| Format | Example | Notes |
|--------|---------|-------|
| Prefixed ULID | `ord_01JXYZ...` | Preferred — new entities |
| UUID v1–v5 | `550e8400-e29b-41d4-a716-...` | Legacy support |
| CUID | `cjld2cjxh0000qzrmn831i7rn` | Legacy support |

## Dependencies

- `shared/ids/id` — `isSystemId` validation logic
- `zod` — Zod schema integration
- `joi` — Joi schema integration
