# Maysar Seed Scripts — Master Reference

> **Last updated:** September 2026
> **Purpose:** Single authoritative reference for every seed script in the platform. Categorized by environment, execution order for production setup, and safety characteristics.

---

## Quick Reference

| Script | Environment | Run Order | Safe to Re-run | Idempotent |
|---|---|---|---|---|
| [`seed-pricing-config.ts`](#1-seed-pricing-configts) | **Production** | 1st | ✅ Yes | ✅ Yes (upsert) |
| [`seed-category-attributes.ts`](#2-seed-category-attributests) | **Production** | 2nd | ✅ Yes | ✅ Yes (upsert) |
| [`seed-training.ts`](#3-seed-trainingts) | **Production** | 3rd | ✅ Yes | ✅ Yes (upsert) |
| [Chat Phrase Registry Bootstrap](#4-chat-suspicious-phrase-registry) | **Production** | 4th | ✅ Yes | ✅ Yes (insert-if-empty) |
| [`seed-dev-users.ts`](#5-seed-dev-usersts) | **Dev / Staging only** | After prod seeds | ✅ Yes | ✅ Yes (upsert) |
| [`seed-e2e-users.ts`](#6-seed-e2e-usersts) | **Dev / CI only** | Before E2E tests | ✅ Yes | ✅ Yes | 
| [`seed-products.ts`](#7-seed-productsts) | **Dev only** | After dev users | ✅ Yes | ⚠️ Partial (slug collision) |
| [`seed-playwright-wallets.ts`](#8-seed-playwright-walletsts) | **Dev / CI only** | After Playwright users | ✅ Yes | ✅ Yes |
| [`services/training-service/prisma/seed.ts`](#9-training-service-prisma-seed) | **Dev only** | Any time | ✅ Yes | ✅ Yes (upsert) |
| [`services/order-service/prisma/seed.ts`](#10-order-service-prisma-seed) | **Dev only** | Any time | ⚠️ No | ❌ No (creates new rows) |

---

## Environment Definitions

| Label | Meaning |
|---|---|
| **Production** | MUST run on every fresh production deployment. Platform is non-functional without these. |
| **Dev / Staging** | Convenience data for manual testing and local development. Never run in production. |
| **Dev / CI** | Automated test infrastructure. Used by Playwright and Jest E2E suites. Never run in production. |
| **Dev only** | Local development exploration data. Useful but not required. |

---

## Production Seeds (run in this exact order)

These four seeds are **required** before the platform can function correctly. Run them in sequence on every fresh deployment.

---

### 1. `seed-pricing-config.ts`

**File:** [`scripts/seed-pricing-config.ts`](../scripts/seed-pricing-config.ts)
**Environment:** 🟢 **Production**
**Command:**
```bash
npx tsx scripts/seed-pricing-config.ts
```

**What it seeds:**
- Delivery pricing configuration v2 (`logistics_PricingConfig` table)
- Distance bands for LOCAL_URBAN (0–20 km), METROPOLITAN (20–80 km)
- Intercity corridor pricing for 7 major Tanzanian routes (Dar–Morogoro, Dar–Dodoma, Dar–Arusha, Dar–Mwanza, Dar–Mbeya, Dar–Tanga, Arusha–Kilimanjaro)
- Platform margin (20%), COD policy (TZS 500 flat + 0.5% value surcharge), weight bands
- Quote validity (15 min), consolidation parameters

**Why it's required:** The logistics service cannot generate any delivery quotes without an active pricing config. All checkouts will fail with `PRICING_CONFIG_UNAVAILABLE` without this.

**Idempotency:** Safe — updates existing v2 config in-place. Does not create duplicates. Deactivates previous versions.

**Dependencies:** None.

---

### 2. `seed-category-attributes.ts`

**File:** [`scripts/seed-category-attributes.ts`](../scripts/seed-category-attributes.ts)
**Environment:** 🟢 **Production**
**Command:**
```bash
npx tsx scripts/seed-category-attributes.ts
```

**What it seeds:**
- 10 top-level product categories with Tanzania-specific taxonomy:
  - Electronics & Electrical, Energy & Solar, Food & Beverages, Agriculture & Farming, Construction & Building, Clothing & Fashion, Office & Business, Automotive & Transport, Industrial & Commercial, Household & General
- 100+ structured category attributes with type, validation rules, filter/search flags
- Category aliases to prevent duplicate entries on re-runs

**Why it's required:** Sellers cannot create products without categories. The catalog service's product creation form and buy-box ranking both depend on category-attribute schemas.

**Idempotency:** Safe — uses stable UUIDs derived from slugs. Updates attributes in-place. Deactivates removed legacy categories.

**Dependencies:** None.

---

### 3. `seed-training.ts`

**File:** [`scripts/seed-training.ts`](../scripts/seed-training.ts)
**Environment:** 🟢 **Production**
**Command:**
```bash
npx tsx scripts/seed-training.ts
# or: npm run seed:training
```

**What it seeds:**
- 8 training modules covering courier onboarding (4 modules) and enabler onboarding (3 modules), plus 1 shared platform overview
- Certification requirements for each module (minimum score, validity period, max attempts)
- All content in English; Swahili-friendly tone throughout

**Courier modules:**
  1. Welcome to the Maysar Courier Network (10 min, beginner)
  2. How Deliveries Work on Maysar (15 min, beginner)
  3. Safety, Professionalism & Customer Experience (20 min, beginner)
  4. Your Earnings & Maysar Wallet (12 min, beginner)

**Enabler modules:**
  1. Welcome to the Maysar Enabler Network (10 min, beginner)
  2. Mastering the Referral & Attribution System (15 min, beginner)
  3. Commission Structure & Growing Your Income (12 min, intermediate)

**Shared modules:**
  1. Understanding the Maysar Platform (10 min, beginner)

**Why it's required:** Couriers and enablers cannot pass certification and become active without training modules. The `GenerateReferralLinkUseCase` checks `certificationStatus === 'PASSED'` before allowing referral link generation.

**Idempotency:** Safe — upserts by module ID. Running again updates content without creating duplicates.

**Dependencies:** None.

---

### 4. Chat Suspicious Phrase Registry

**Not a standalone script** — this seed is bootstrapped automatically at chat service startup.

**File:** [`services/chat-service/src/domain/risk/suspicious-phrases.ts`](../services/chat-service/src/domain/risk/suspicious-phrases.ts) (seed data + bootstrap logic in [`services/chat-service/index.ts`](../services/chat-service/index.ts))

**Environment:** 🟢 **Production**

**Trigger:** On `ChatModule.initialize()`, if `COUNT(community_SuspiciousPhrase) === 0`, the service automatically calls `SuspiciousPhraseUseCase.seedDefaults()` which inserts the full built-in catalog. This means: **deploy the chat service and the seed happens automatically**. No manual step required on first deployment.

**Can also be triggered manually via API (e.g. after wiping the phrase table):**
```bash
curl -X POST /api/chat/v1/admin/moderation/phrases/seed \
  -H "Authorization: Bearer <adminJWT>"
```

Response:
```jsonc
{ "data": { "phrasesInserted": 100, "regexInserted": 12, "alreadyPresent": 0 } }
```

---

**What it seeds — 112 entries total:**

**100 phrase entries (SUBSTRING matching)**

| Category | Language | Count | Examples |
|---|---|---|---|
| `off_platform_payment` | EN + SW | 25 | "send me money", "pay outside the app", "tuma pesa moja kwa moja", "malipo nje ya mfumo" |
| `tanzania_mobile_money` | EN + SW | 27 | "send via m-pesa", "tuma kwa tigo pesa", "namba ya m-pesa", "mpesa", "tigo pesa", "airtel money", "halopesa", "m-pawa", "azam pesa", "selcom pesa", "tilipanimero", "mixx by yas" |
| `advance_fee` | EN + SW | 18 | "advance fee", "clearance fee", "customs tax", "kodi ya forodha", "ada ya awali", "malipo ya awali", "deposit ya kwanza" |
| `phishing` | EN + SW | 14 | "mpesa pin", "verify your account", "pin yako", "thibitisha akaunti yako", "akaunti yako imefungwa" |
| `prize_scam` | EN + SW | 15 | "you have won", "claim your prize", "lucky winner", "umeshinda tuzo", "bahati nasibu" |
| `investment_scam` | EN + SW | 11 | "double your money", "guaranteed returns", "ongeza pesa mara mbili", "uwekezaji wa haraka", "faida ya papo hapo" |
| `off_platform_contact` | EN + SW | 14 | "whatsapp me", "telegram me", "namba yangu ya whatsapp", "tumia telegram", "piga simu kwa hii namba" |
| `urgency_pressure` | EN + SW | 6 | "urgent action required", "act now", "hatua ya dharura", "wakati unaisha" |
| `bait_pricing` | SW | 2 | "bei ya kuchekesha", "bei ya kushangaza" |

**12 regex patterns (REGEX matching — catches obfuscated variants)**

| Pattern | Category | Action | What it catches |
|---|---|---|---|
| `wa\.me/\d+` | `off_platform_contact` | BLOCK | WhatsApp direct-chat links (wa.me/255...) |
| `api\.whatsapp\.com` | `off_platform_contact` | BLOCK | WhatsApp click-to-chat URLs |
| `t\.me/\w+` | `off_platform_contact` | FLAG | Telegram channel/user links |
| `m[\s._-]*p[\s._-]*e[\s._-]*s[\s._-]*a` | `tanzania_mobile_money` | FLAG | Obfuscated "M-Pesa" (m.p.e.s.a, m_p_e_s_a etc.) |
| `tigo[\s._-]*pesa` | `tanzania_mobile_money` | FLAG | Obfuscated "Tigo Pesa" |
| `airtel[\s._-]*money` | `tanzania_mobile_money` | FLAG | Obfuscated "Airtel Money" |
| `\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b` | `card_fraud` | BLOCK | 16-digit card numbers |
| `bit\.ly\|tinyurl\.com\|cutt\.us\|...` | `link_shortener` | FLAG | URL shorteners hiding real destination |
| `\b(?:\+?255\|0)\s?[67]\d{2}[\s.-]?\d{3}[\s.-]?\d{3}\b` | `phone_number` | FLAG | Tanzanian phone numbers (+255 or 0[67]...) |
| `\b\d{10,}\b` | `financial_details` | FLAG | Long digit sequences (bank account numbers) |
| `\b[A-Za-z0-9+/]{40,}={0,2}\b` | `obfuscation` | FLAG | Base64-like encoded blobs |
| `pay\s+\d+\s*%\s+deposit` | `advance_fee` | FLAG | Percentage deposit demands ("pay 50% deposit") |

---

**Weight scale:**
- Weight 100 + action BLOCK → immediate block, message never delivered
- Weight 70–99 + action FLAG → message delivered with `flagged: true`, queued for admin review
- Weight 25–69 + action FLAG → lighter flag, logged but may not surface to admin queue

**Language coverage:** English (EN) and Swahili (SW), with language-agnostic regex patterns (OTHER). The Swahili phrases cover Tanzania-specific scam language including all major mobile money providers (M-Pesa, Tigo Pesa, Airtel Money, HaloPesa, M-Pawa, Azam Pesa, Selcom Pesa, Tilipanimero, Mixx by Yas).

**Why it's required:** Without phrase seeds, the risk engine falls back to in-memory seed catalog only (no DB persistence, no admin customizations possible). Any admin-added or auto-mined phrases require the DB-backed registry to exist.

**Idempotency:** Safe — only inserts missing entries (checked by phrase + category + language). Existing SEED phrases and all ADMIN-created phrases are never overwritten. Re-triggering via API after partial failure is safe.

**Dependencies:** Chat service must be running with DB connectivity. Requires admin JWT for the API trigger. Auto-bootstrap on startup requires no auth.

---

## Dev / Staging Seeds

These seeds create convenience data for manual testing. **Never run in production.**

---

### 5. `seed-dev-users.ts`

**File:** [`scripts/seed-dev-users.ts`](../scripts/seed-dev-users.ts)
**Environment:** 🟡 **Dev / Staging only**
**Command:**
```bash
npx ts-node -r tsconfig-paths/register scripts/seed-dev-users.ts
```

**What it seeds:**
- 6 deterministic user accounts (one per role) with fixed IDs and passwords
- All users: verified email, verified phone, `ACTIVE` status
- Auth records (`auth_users`), user-service records (`user_User`), and search indexes
- Wallets for buyer (TZS 100,000), seller (TZS 50,000)
- COD trust score for buyer (score: 0, tier: NEW_BUYER)

**User accounts created:**

| Role | Email | Password | KYC | Wallet |
|---|---|---|---|---|
| `system` (admin) | admin@maysar.co.tz | Maysar@2024! | Level 3 | — |
| `buyer` | buyer@maysar.co.tz | Maysar@2024! | Level 3 | TZS 100,000 |
| `seller` | seller@maysar.co.tz | Maysar@2024! | Level 2 | TZS 50,000 |
| `supplier` | supplier@maysar.co.tz | Maysar@2024! | Level 2 | — |
| `courier` | courier@maysar.co.tz | Maysar@2024! | Level 2 | — |
| `enabler` | enabler@maysar.co.tz | Maysar@2024! | Level 2 | — |

**Fixed IDs (canonical for dev):**

| Role | ID |
|---|---|
| buyer | `usr_01KRFXQZC36NK3CDEWJJS21RP8` |
| seller | `usr_01KRFZ1E5G6CWAQ4BXKVNPYG3Z` |
| courier | `usr_01KRFZ1E7W4JDR9N9PMGYDD77S` |
| enabler | `usr_01KRFZ1E8HMAE7MMH175PJ9337` |
| supplier | `usr_01KRFZ1E73P67T886TR2QDY0VT` |
| admin | `usr_ADMIN000000000000000000001` |

**⚠️ Production risk:** Creating users with known passwords and fixed IDs in production is a security vulnerability. This script must never be run against a production database.

**Idempotency:** Safe — upserts on email. Re-runs update password hash and reset any lockouts.

**Dependencies:** Requires `DATABASE_URL` in `.env`.

---

### 6. `seed-e2e-users.ts`

**File:** [`scripts/seed-e2e-users.ts`](../scripts/seed-e2e-users.ts)
**Environment:** 🟡 **Dev / CI only**
**Command:**
```bash
npx tsx scripts/seed-e2e-users.ts
```

**What it seeds:**
- Same 6 role-based accounts as `seed-dev-users.ts`, but through the **live HTTP API** rather than direct DB writes
- Writes `seed-output.json` at repo root with real system-assigned IDs
- Seller product (`Maysar Seeded Demo Product`, TZS 250,000)
- Courier profile in logistics service (online status, rating 4.8, completedDeliveries: 10)
- Logistics delivery record (`log_del_01ARZ3NDEKTSV4RRFFQ69G5FAV`, status: assigned)
- Enabler profile (APPROVED status)
- Cancels stale open orders for buyer (COD eligibility reset)
- Clears wallet transaction history for velocity reset

**Output file:** `seed-output.json` (gitignored) — consumed by Playwright tests via `tests/e2e/fixtures/seeded-users.ts`

**Difference from `seed-dev-users.ts`:** Uses HTTP API instead of direct Prisma, so it tests the actual registration flow and captures system-assigned IDs. Required for E2E testing where hardcoded IDs are unreliable.

**⚠️ Production risk:** Same as `seed-dev-users.ts`. Creates known-password accounts.

**Idempotency:** Safe — handles 409 (already exists) gracefully. Cancels stale orders and clears velocity locks on re-run.

**Dependencies:** Requires running backend at `E2E_BASE_URL` (default `http://localhost:3000`).

---

### 7. `seed-products.ts`

**File:** [`scripts/seed-products.ts`](../scripts/seed-products.ts)
**Environment:** 🟡 **Dev only**
**Command:**
```bash
npx ts-node -r tsconfig-paths/register scripts/seed-products.ts
```

**What it seeds:**
- 8 Swahili-language product categories (covers Tanzania market segments)
- 22 realistic Tanzanian marketplace products across all categories
- Product variants with pricing, inventory counts, weight data
- Stock items linked to a seed warehouse (`DSM-SEED-01`)
- Media references (Unsplash placeholder images)
- Mix of COD, free delivery, and standard delivery configurations

**Products include:** Samsung Galaxy A15, HP Laptop, Kanzu ya Kiswahili, Kitenge ya Tanzania, Mchele wa Kilimo (25kg), Viungo vya Pilau, Asali ya Asili, Kahawa ya Kilimanjaro, and 14 more.

**Requires:** Seller `usr_01KRFZ1E5G6CWAQ4BXKVNPYG3Z` to exist (from `seed-dev-users.ts`).

**⚠️ Idempotency warning:** Products are created with random slug suffixes. Re-running creates new product records with different slugs. This is intentional (products can have different slugs) but means you'll accumulate products on repeated runs. Use `WHERE title = 'X'` to clean up if needed.

**Dependencies:** `seed-dev-users.ts` must have run first to create the seller account.

---

### 8. `seed-playwright-wallets.ts`

**File:** [`scripts/seed-playwright-wallets.ts`](../scripts/seed-playwright-wallets.ts)
**Environment:** 🟡 **Dev / CI only**
**Command:**
```bash
npx ts-node -r tsconfig-paths/register scripts/seed-playwright-wallets.ts
```

**What it seeds:**
- Wallets for 6 hardcoded Playwright test user IDs (different from dev-users IDs)
- Buyer wallet: TZS 100,000 | Seller: TZS 50,000 | Enabler: TZS 10,000 | Others: TZS 0

**⚠️ Note:** These IDs are different from the `seed-dev-users.ts` canonical IDs. This script is specifically for the Playwright test suite which uses a separate set of IDs. If migrating to `seed-e2e-users.ts`, this script may no longer be needed.

**Idempotency:** Safe — skips if wallet already exists.

**Dependencies:** Users with these exact IDs must already exist in the database.

---

## Dev-Only Service-Specific Prisma Seeds

These live inside individual service `prisma/` directories and are invoked by `prisma db seed`.

---

### 9. Training Service Prisma Seed

**File:** [`services/training-service/prisma/seed.ts`](../services/training-service/prisma/seed.ts)
**Environment:** 🟡 **Dev only**
**Command:**
```bash
cd services/training-service && npx prisma db seed
```

**What it seeds:**
- 2 basic training modules (`safety-basics`, `customer-service`) with minimal content
- Certification requirements for both modules (mandatory: true, 3 max attempts)

**⚠️ Superseded:** This is an older, minimal seed. For production and staging, use `scripts/seed-training.ts` instead — it has the full 8-module onboarding curriculum. This Prisma seed is kept for backward compatibility with `prisma db seed` workflows.

**Idempotency:** Safe — upserts.

---

### 10. Order Service Prisma Seed

**File:** [`services/order-service/prisma/seed.ts`](../services/order-service/prisma/seed.ts)
**Environment:** 🟡 **Dev only**
**Command:**
```bash
cd services/order-service && npx prisma db seed
```

**What it seeds:**
- 3 sample orders in various statuses (PENDING, CONFIRMED, DELIVERED) with random IDs
- 3 sample payments
- 2 sample settlements

**⚠️ NOT idempotent:** Each run creates new records with new random IDs. Running multiple times accumulates duplicate test data. Use only for initial local setup exploration, then clear the data manually.

**⚠️ Not for staging/production:** Creates orders with random buyer/seller IDs that don't correspond to real users.

---

## Execution Guides

### Fresh Production Deployment

Run in this exact order:

```bash
# 1. Apply all DB migrations first
npx prisma migrate deploy

# 2. Seed delivery pricing (logistics cannot work without this)
npx tsx scripts/seed-pricing-config.ts

# 3. Seed product categories and attributes
npx tsx scripts/seed-category-attributes.ts

# 4. Seed training modules for couriers and enablers
npx tsx scripts/seed-training.ts

# 5. Chat phrase registry seeds automatically on first startup — no manual step needed
#    Verify via: POST /api/chat/v1/admin/moderation/phrases/seed (will return "alreadyPresent" if done)
```

---

### Fresh Dev / Local Setup

```bash
# Step 1: Apply migrations
npx prisma migrate dev

# Step 2: Production data (required)
npx tsx scripts/seed-pricing-config.ts
npx tsx scripts/seed-category-attributes.ts
npx tsx scripts/seed-training.ts

# Step 3: Dev users (optional but recommended for manual testing)
npx ts-node -r tsconfig-paths/register scripts/seed-dev-users.ts

# Step 4: Sample products (optional — useful for browsing the catalog)
npx ts-node -r tsconfig-paths/register scripts/seed-products.ts
```

---

### Before Running E2E / Playwright Tests

```bash
# Start the backend first, then:
npx tsx scripts/seed-e2e-users.ts

# The above also creates the seller product and delivery record.
# seed-output.json will contain real IDs for Playwright to consume.
```

---

## Seed Output Files

| File | Created by | Consumed by | Gitignored |
|---|---|---|---|
| `seed-output.json` | `seed-e2e-users.ts` | Playwright tests via `tests/e2e/fixtures/seeded-users.ts` | ✅ Yes |
| `tmp-seed-legacy-auth.sql` | Manual migration scripts | One-time PII re-encryption | ✅ Yes |

The schema for `seed-output.json` is documented in [`scripts/seed-output.schema.md`](../scripts/seed-output.schema.md).

---

## Safety Rules

1. **Never run `seed-dev-users.ts`, `seed-e2e-users.ts`, or `seed-playwright-wallets.ts` in production.** These create accounts with known passwords.

2. **Production seeds are all idempotent.** Safe to re-run after schema changes or to update pricing/category data.

3. **`seed-products.ts` accumulates data on re-run.** If you need a clean product catalog, truncate the `products` and `product_variants` tables first.

4. **The order-service Prisma seed is not idempotent.** Treat it as a one-time local setup tool only.

5. **Chat phrase registry auto-seeds on startup.** If you delete all phrases from the DB, restarting the chat service will re-seed the built-in catalog automatically.

6. **Always run `seed-pricing-config.ts` after schema changes to the `logistics_PricingConfig` table.** The service will fail to generate quotes if the config structure is stale.

---

## Package.json Commands

```jsonc
// Check package.json for these convenience commands:
"seed:pricing"    → npx tsx scripts/seed-pricing-config.ts
"seed:categories" → npx tsx scripts/seed-category-attributes.ts
"seed:training"   → npx tsx scripts/seed-training.ts
"seed:dev"        → npx ts-node -r tsconfig-paths/register scripts/seed-dev-users.ts
"seed:e2e"        → npx tsx scripts/seed-e2e-users.ts
"seed:products"   → npx ts-node -r tsconfig-paths/register scripts/seed-products.ts
```

> **Tip:** Check `package.json` at the repo root for the exact `scripts` entries — the commands above are the canonical invocations.
