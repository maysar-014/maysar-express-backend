# shared/ids

Prefixed ULID generation and domain prefix registry for all entity IDs in the platform.

## Purpose

All entity IDs are prefixed ULIDs — sortable, URL-safe, and domain-traceable. A prefix like `ord_` or `pay_` makes IDs self-describing in logs, database queries, and API responses. The prefix registry maps domain names to 3-character codes used by the Prisma ID middleware.

## Exports

| Export | Description |
|--------|-------------|
| `makeId(prefix)` | Generates `{prefix}_{ulid26chars}` |
| `createUlid()` | Generates a raw 26-character ULID |
| `getModelPrefix(modelName)` | Resolves prefix from Prisma model name (e.g., `Order_Order` → `ord`) |
| `isPrefixedUlid(value)` | Validates prefixed ULID format |
| `isSystemId(value)` | Accepts prefixed ULIDs, UUIDs, and CUIDs (backward compat) |
| `registerModelIds(models)` | Registers model names that support auto-ID generation |
| `modelSupportsId(modelName)` | Checks if a model is registered for auto-ID |

## Domain Prefix Registry

| Domain | Prefix | Example ID |
|--------|--------|-----------|
| Auth | `ath` | `ath_01J...` |
| Analytics | `ana` | `ana_01J...` |
| BusinessRegistry | `biz` | `biz_01J...` |
| Catalog | `cat` | `cat_01J...` |
| Checkout | `chk` | `chk_01J...` |
| Commission | `com` | `com_01J...` |
| Community | `cmm` | `cmm_01J...` |
| Compliance | `cmp` | `cmp_01J...` |
| Enabler | `enb` | `enb_01J...` |
| Inventory | `inv` | `inv_01J...` |
| Logistics | `log` | `log_01J...` |
| Maps | `map` | `map_01J...` |
| Notification | `ntf` | `ntf_01J...` |
| Order | `ord` | `ord_01J...` |
| Payment | `pay` | `pay_01J...` |
| Payout | `pyo` | `pyo_01J...` |
| Production | `prd` | `prd_01J...` |
| Support | `sup` | `sup_01J...` |
| Training | `trn` | `trn_01J...` |
| User | `usr` | `usr_01J...` |
| Wallet | `wal` | `wal_01J...` |

## Usage

```typescript
import { makeId, isSystemId } from '@shared/ids/id';

// Generate a new ID
const orderId = makeId('ord');  // → "ord_01JXYZ..."

// Validate an ID from user input
if (!isSystemId(req.params.id)) {
  throw new ValidationError('Invalid ID format');
}
```

## Dependencies

- Node.js built-in `crypto` — random bytes for ULID entropy
