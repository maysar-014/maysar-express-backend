# Maysar Development Test Users

Registered by `scripts/seed-e2e-users.ts` through the live auth API. Re-run the script at any time — it is idempotent for the canonical seeded emails/IDs.

```bash
npx ts-node scripts/seed-e2e-users.ts
```

---

## Credentials

All accounts share the same password: **`Maysar@2024!`**

| Role | Email | User ID | KYC Level | Wallet Balance | Notes |
|------|-------|---------|-----------|----------------|-------|
| **system** (admin) | admin@maysar.co.tz | `usr_ADMIN000000000000000000001` | 3 | — | Full platform access. Use for admin operations, bypasses rate limits. |
| **buyer** | buyer@maysar.co.tz | `usr_01KRFXQZC36NK3CDEWJJS21RP8` | 3 | 100,000 TZS | Verified buyer. COD trust score: 0 (NEW_BUYER tier). Funded wallet for order testing. |
| **seller** | seller@maysar.co.tz | `usr_01KRFZ1E5G6CWAQ4BXKVNPYG3Z` | 2 | 50,000 TZS | Verified seller. Use as `sellerId` when placing test orders. |
| **supplier** | supplier@maysar.co.tz | `usr_01KRFZ1E73P67T886TR2QDY0VT` | 2 | — | Verified supplier. |
| **courier** | courier@maysar.co.tz | `usr_01KRFZ1E7W4JDR9N9PMGYDD77S` | 2 | — | Verified courier. Use for delivery confirmation testing. |
| **enabler** | enabler@maysar.co.tz | `usr_01KRFZ1E8HMAE7MMH175PJ9337` | 2 | 0 TZS | Verified enabler. |

---

## JWT Token Generation

All test scripts generate tokens using `JWT_SECRET` from `.env`. Example:

```js
const token = signJwt({
  userId: 'usr_01KRFXQZC36NK3CDEWJJS21RP8',
  email: 'buyer@maysar.co.tz',
  roles: ['buyer'],
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 86400
}, process.env.JWT_SECRET);
```

---

## COD Trust Tiers (Buyer)

| Score Range | Tier | COD Limit | Geographic Constraint | Max Active COD Orders |
|-------------|------|-----------|-----------------------|----------------------|
| 0–20 | NEW_BUYER | TZS 30,000 | Same city as seller only | 1 |
| 21–40 | TRUSTED_BEGINNER | TZS 150,000 | None | Unlimited |
| 41–100 | TRUSTED_BUYER | Unlimited | None | Unlimited |

The seeded buyer starts at score **0** (NEW_BUYER). Trust score increases automatically as the buyer completes successful COD deliveries.

---

## Notes

- The buyer's wallet balance decreases as test orders are placed. Re-run the seed script or use the admin credit endpoint to top up.
- Rate limiting is disabled in development via `DISABLE_RATE_LIMITING=true` in `.env`.
- To top up the buyer's wallet manually:

```bash
node -e "
require('dotenv').config();
const crypto = require('crypto');
// ... (see scripts/seed-e2e-users.ts for full example)
"
```

Or use the admin token to call `POST /api/wallet/wallets/{userId}/credit` directly.
