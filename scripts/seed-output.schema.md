# seed-output.json Schema

The `seed-output.json` file is written by `scripts/seed-e2e-users.ts` after every seed run.
Playwright tests should read this file to get the real system-assigned IDs — **never use hardcoded IDs**.

## File location

```
seed-output.json   (repo root)
```

## Schema

```json
{
  "generatedAt": "2026-07-07T12:00:00.000Z",
  "users": [
    {
      "role": "system",
      "email": "admin@maysar.co.tz",
      "id": "<system-assigned-id>",
      "phoneNumber": "+255700000001"
    },
    {
      "role": "buyer",
      "email": "buyer@maysar.co.tz",
      "id": "<system-assigned-id>",
      "phoneNumber": "+255700000002"
    },
    {
      "role": "seller",
      "email": "seller@maysar.co.tz",
      "id": "<system-assigned-id>",
      "phoneNumber": "+255700000003"
    },
    {
      "role": "supplier",
      "email": "supplier@maysar.co.tz",
      "id": "<system-assigned-id>",
      "phoneNumber": "+255700000004"
    },
    {
      "role": "courier",
      "email": "courier@maysar.co.tz",
      "id": "<system-assigned-id>",
      "phoneNumber": "+255700000005"
    },
    {
      "role": "enabler",
      "email": "enabler@maysar.co.tz",
      "id": "<system-assigned-id>",
      "phoneNumber": "+255700000006"
    }
  ],
  "product": {
    "id": "<system-assigned-product-id>",
    "title": "Maysar Seeded Demo Product",
    "price": 250000,
    "sellerId": "<system-assigned-seller-id>",
    "categoryId": "<system-assigned-category-id>",
    "variantId": "<system-assigned-variant-id>"
  },
  "delivery": {
    "id": "<system-assigned-delivery-id>"
  }
}
```

## Usage in Playwright

```typescript
// tests/playwright/helpers/seeded-users.ts
import seedOutput from '../../../seed-output.json';

export function getSeededUser(role: string) {
  return seedOutput.users.find(u => u.role === role)!;
}

export const SEEDED_USERS = {
  admin:    getSeededUser('system'),
  buyer:    getSeededUser('buyer'),
  seller:   getSeededUser('seller'),
  supplier: getSeededUser('supplier'),
  courier:  getSeededUser('courier'),
  enabler:  getSeededUser('enabler'),
};

export const SEEDED_PRODUCT = seedOutput.product;
export const SEEDED_DELIVERY = seedOutput.delivery;
```

## Important

- `seed-output.json` is **gitignored** — it is generated fresh on every seed run
- IDs change between fresh DB setups — always read from this file, never hardcode
- Run the seed before Playwright: `npx tsx scripts/seed-e2e-users.ts`
