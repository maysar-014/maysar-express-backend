# MUVA/MSLE Frontend Implementation Guide

**Backend API:** `http://localhost:3000` (catalog-service routes under `/api/catalog`)
**Auth:** Bearer JWT in `Authorization` header
**Currency:** TZS (Tanzanian Shilling) — no decimals

---

## 1. API Service Layer — New Endpoints to Add

### 1.1 Configuration API

```typescript
// src/services/api/catalog.ts

/** GET /api/catalog/v1/products/:productId/configuration
 * Returns 200 with definition, or 404 if simple product (no configuration)
 */
async function getProductConfiguration(productId: string): Promise<ConfigurationDefinition | null>

/** POST /api/catalog/v1/products/:productId/validate-configuration
 * Body: { selections: Record<string, string[]> }
 * Returns: { valid: boolean, errors: { field, message }[] }
 */
async function validateConfiguration(productId: string, selections: Record<string, string[]>): Promise<ValidationResult>

/** POST /api/catalog/v1/products/:productId/resolve-configuration
 * Body: { selections: Record<string, string[]> }
 * Returns: { resolved, variantId, fingerprint, configurationDefinitionVersion,
 *            valid, errors, resolvedConfiguration, isSparseCombination, combinationExists }
 */
async function resolveConfiguration(productId: string, selections: Record<string, string[]>): Promise<ResolveResult>
```

### 1.2 Seller Offer API

```typescript
/** POST /api/catalog/v1/seller/offers — seller role only */
async function createSellerOffer(data: {
  productId: string; price: number; currency?: string; stockAvailable?: number;
  condition?: string; fulfillmentPolicy?: string; warranty?: string;
  returnConditions?: string; minimumOrderQuantity?: number; leadTimeDays?: number;
  sellerSku?: string; configurationCoverage?: string[] | null;
}): Promise<{ offerId: string; status: string }>

/** GET /api/catalog/v1/seller/offers — seller role only */
async function getMyOffers(): Promise<SellerOffer[]>

/** GET /api/catalog/v1/products/:productId/offers — public (no auth) */
async function getProductOffers(productId: string): Promise<SellerOffer[]>

/** PATCH /api/catalog/v1/seller/offers/:id/price */
async function updateOfferPrice(id: string, price: number, currency?: string): Promise<void>

/** PATCH /api/catalog/v1/seller/offers/:id/stock */
async function updateOfferStock(id: string, stockAvailable: number): Promise<void>

/** PATCH /api/catalog/v1/seller/offers/:id/status */
async function updateOfferStatus(id: string, status: 'draft' | 'active' | 'suspended' | 'archived'): Promise<void>
```

### 1.3 Seller Listing Workflow API

```typescript
/** POST /api/catalog/v1/seller/listing/start — seller role */
async function startListing(data: {
  entryPath: 'PATH_A' | 'PATH_B'; productId?: string;
}): Promise<{ draftId: string; currentStage: string; publicationState: string }>

/** PUT /api/catalog/v1/seller/listing/draft/:id — auto-save */
async function saveListingDraft(id: string, data: {
  productDraft?: any; configurationDraft?: any;
  offerDraft?: any; currentStage?: string;
}): Promise<{ draftId: string; currentStage: string; updatedAt: string }>

/** GET /api/catalog/v1/seller/listing/draft/:id — resume */
async function getListingDraft(id: string): Promise<ListingDraft>

/** GET /api/catalog/v1/seller/listing/drafts — list all drafts */
async function listListingDrafts(): Promise<ListingDraftSummary[]>

/** POST /api/catalog/v1/seller/listing/:id/validate — pre-publish validation */
async function validateListing(id: string): Promise<{
  valid: boolean; errors: { field: string; message: string; severity: string }[];
  warnings: { field: string; message: string; severity: string }[];
}>

/** POST /api/catalog/v1/seller/listing/:id/publish */
async function publishListing(id: string): Promise<{
  publicationState: string; publishedOfferId: string; publishedProductId?: string;
}>
```

### 1.4 Checkout Validation API

```typescript
/** POST /api/catalog/v1/checkout/validate — buyer role */
async function validateCheckout(data: {
  lineItem: {
    productId: string; productName: string; productImage: string | null;
    variantId: string | null; selectedOptionIds: Record<string, string[]> | null;
    quantity: number;
  };
  promotionDiscount?: number; promotionOriginalPrice?: number;
  deliveryMethod?: string; shippingCost?: number;
  estimatedDeliveryDate?: string; fulfillmentLocation?: string;
}): Promise<{
  valid: boolean; errors: string[];
  resolvedPrice: number | null; resolvedCurrency: string | null;
  priceSource: string | null; stockSufficient: boolean;
  availableStock: number; stockTracked: boolean;
  orderItemSnapshot: any | null;
}>
```

---

## 2. TypeScript Types

```typescript
// src/types/catalog.ts

interface ConfigurationDimension {
  id: string;
  name: string;
  displayLabel: string;
  selectionType: 'selectable' | 'customer_defined';
  selectionMode: 'single' | 'multiple';
  required: boolean;
  options: string[]; // option IDs
}

interface ConfigurationOption {
  id: string;
  dimensionId: string;
  displayValue: string;
  normalizedValue: string;
}

interface ConfigurationDefinition {
  id: string;
  productId: string;
  version: number;
  status: 'draft' | 'active' | 'archived';
  dimensions: ConfigurationDimension[];
  options: ConfigurationOption[];
  dependencies: any[];
  constraints: any[];
  combinations: {
    id: string;
    optionSelections: Record<string, string[]>;
    fingerprint: string;
    active: boolean;
  }[];
}

interface ResolveResult {
  resolved: boolean;
  variantId: string | null;
  fingerprint: string | null;
  configurationDefinitionVersion: number | null;
  valid: boolean;
  errors: { field: string; message: string }[];
  resolvedConfiguration: Record<string, string>; // human-readable display values
  isSparseCombination: boolean;
  combinationExists: boolean;
}

interface SellerOffer {
  id: string;
  sellerId?: string;
  productId?: string;
  sellerSku?: string;
  price: number;
  currency: string;
  stockAvailable: number;
  condition: 'new' | 'used' | 'refurbished' | 'damaged';
  fulfillmentPolicy: 'seller_fulfilled' | 'platform_fulfilled' | 'dropship';
  warranty?: string;
  returnConditions?: string;
  minimumOrderQuantity: number;
  leadTimeDays: number;
  status: 'draft' | 'active' | 'suspended' | 'archived';
  configurationCoverage?: string[] | null;
}

interface ListingDraft {
  id: string;
  entryPath: 'PATH_A' | 'PATH_B';
  currentStage: 'identify' | 'describe' | 'configure' | 'offer' | 'publish';
  productId: string | null;
  productDraft: any | null;
  configurationDraft: any | null;
  offerDraft: any | null;
  validationResults: any | null;
  publicationState: 'draft' | 'validating' | 'publishable' | 'published' | 'rejected';
  publishedOfferId: string | null;
  publishedProductId: string | null;
  createdAt: string;
  updatedAt: string;
}
```

---

## 3. Product Card Component

**Location:** Search results grid, category browse, related products, seller storefront

```
┌─────────────────────────────┐
│        [Product Image]      │
│                              │
│  Product Title (1-2 lines)   │
│  Brand · Model                │
│                              │
│  From TZS 42,000             │  ← buy-box winner price (or "from" if multiple offers)
│  3 sellers available         │  ← only if >1 offer (fetch lazily or from product detail)
│                              │
│  ● In stock                   │  ← stock status from buy-box winner
│  ⭐ 4.5 (23 reviews)         │  ← from product detail (optional on cards)
│                              │
│  [Options Available] pill    │  ← only if product has configuration definition
└─────────────────────────────┘
```

**Data source:** Search response already includes buy-box winner price, seller, and stock status per product.

**Implementation notes:**
- The "Options Available" pill should only show if the product has a configuration definition. You can either:
  - Eager: add a `hasConfiguration` flag to the search response (requires backend change)
  - Lazy: call `GET /products/:id/configuration` on first card render and cache the result (404 = no config)
- "N sellers available" comes from `GET /products/:id/offers` — only fetch on hover or when the buyer shows interest
- Price display: if the buy-box winner price is the only one, show "TZS X". If multiple offers exist, show "From TZS X"

**Link:** Card clicks navigate to `/products/:identifier` where `:identifier` is the product ID or slug (transparent resolution)

---

## 4. Product Detail Page

**Route:** `/products/:identifier`

```
┌──────────────────────────────────────────────────────────┐
│  Breadcrumb: Home > Category > Subcategory > Product     │
├──────────────────────────────────────────────────────────┤
│                    │                                       │
│   Image Gallery    │  Product Title                        │
│   (main + thumbs)  │  Brand · Model · GTIN                  │
│                    │                                       │
│   [img1] [img2]    │  ┌─────────────────────────────────┐  │
│   [img3] [img4]    │  │ TZS 42,000          ● In stock   │  │
│                    │  │ From TZS 42,000                  │  │
│                    │  │ ┌─ Compare sellers ───────────┐  │  │
│                    │  │ │ Seller A  TZS 42k  New       │  │  │
│                    │  │ │ Seller B  TZS 45k  Used      │  │  │
│                    │  │ │ Seller C  TZS 48k  Refurb    │  │  │
│                    │  │ └─────────────────────────────┘  │  │
│                    │  └─────────────────────────────────┘  │
│                    │                                       │
│                    │  ── Configuration Selector ──         │
│                    │  (only if configuration exists)       │
│                    │                                       │
│                    │  Colour: [Black] [Blue]               │
│                    │  Storage: [64GB] [128GB]              │
│                    │                                       │
│                    │  ⚠ This combination is not available  │  ← when combinationExists=false
│                    │  ✓ Selected: Black, 128 GB           │  ← resolvedConfiguration display
│                    │                                       │
│                    │  Quantity: [- 1 +]                    │
│                    │                                       │
│                    │  [Add to Cart]                         │
│                    │  [Buy Now]                             │
│                    │                                       │
│                    │  Seller: Seller Name (rating)          │
│                    │  Fulfillment: Seller-fulfilled        │
│                    │  Lead time: 2 days                    │
│                    │  Warranty: 12 months                   │
│                    │  Returns: 30-day returns               │
│                    │                                       │
├──────────────────────────────────────────────────────────┤
│  Description  |  Specifications  |  Reviews  |  Shipping   │
├──────────────────────────────────────────────────────────┤
│  Product description text...                              │
│  Category template attributes...                          │
│                                                            │
│  Reviews (avg 4.5, 23 reviews)                             │
│  [Review 1] [Review 2] [Review 3]...                      │
└──────────────────────────────────────────────────────────┘
```

### 4.1 Page Load Sequence

1. `GET /api/catalog/v1/products/:identifier` — fetch product detail (transparent ID/slug resolution)
2. In parallel:
   - `GET /api/catalog/v1/products/:productId/configuration` — if 200, render configuration selector; if 404, skip
   - `GET /api/catalog/v1/products/:productId/offers` — fetch all seller offers for "compare sellers"
3. Render buy-box winner price and seller info from product detail response

### 4.2 Configuration Selector Component

**Renders when:** `GET /products/:id/configuration` returns 200

```typescript
function ConfigurationSelector({ productId, onConfigurationChange }: Props) {
  const [definition, setDefinition] = useState<ConfigurationDefinition | null>(null);
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [resolveResult, setResolveResult] = useState<ResolveResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Load configuration definition on mount
  useEffect(() => {
    getProductConfiguration(productId).then(def => setDefinition(def));
  }, [productId]);

  // Validate + resolve on each selection change (debounced 300ms)
  useEffect(() => {
    if (!definition || Object.keys(selections).length === 0) return;
    const timer = setTimeout(async () => {
      setIsValidating(true);
      const [validation, resolution] = await Promise.all([
        validateConfiguration(productId, selections),
        resolveConfiguration(productId, selections),
      ]);
      setResolveResult(resolution);
      setIsValidating(false);
      onConfigurationChange({
        selectedOptionIds: selections,
        fingerprint: resolution.fingerprint,
        variantId: resolution.variantId,
        combinationExists: resolution.combinationExists,
        resolvedConfiguration: resolution.resolvedConfiguration,
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [selections, productId]);

  // Render dimensions as dropdowns or swatches
  // Show validation errors inline
  // Show "combination not available" when combinationExists === false
}
```

**UX rules:**
- Each dimension renders as a labeled selector (dropdown for single-select, chip buttons for small option sets)
- On each selection change, debounced validate + resolve runs
- If `valid: false`, show error messages per field in red
- If `valid: true` but `combinationExists: false`, show amber warning: "This combination is not available for purchase"
- If `valid: true` and `combinationExists: true`, show green checkmark with resolved display values
- The "Add to Cart" button is disabled until `valid && combinationExists`

### 4.3 Seller Offer Comparison Panel

**Renders when:** `GET /products/:id/offers` returns >1 offer

For each offer show:
- Seller name (resolve from seller ID — may need a seller lookup or use the buy-box winner's name as default)
- Price (TZS formatted)
- Condition (New, Used, Refurbished — human readable)
- Fulfillment policy (Seller-fulfilled, Platform-fulfilled)
- Lead time (e.g., "Ships in 2 days")
- Stock status ("In stock" / "Low stock" / "Out of stock")
- "Choose this seller" button that updates the selected offer

### 4.4 Add to Cart

When the buyer clicks "Add to Cart", send to the cart:

```typescript
{
  cartId: currentCartId,
  userId: buyerId,
  productId: product.id,
  variantId: resolveResult?.variantId || null,
  quantity: selectedQuantity,
  priceAtTime: currentPrice, // resolved price
  // If configurable:
  selectedOptionIds: selections, // Record<string, string[]>
  configurationFingerprint: resolveResult?.fingerprint || null,
  configurationDefinitionVersion: resolveResult?.configurationDefinitionVersion || null,
}
```

**The cart item should display the human-readable configuration** (from `resolveResult.resolvedConfiguration`), not raw option IDs. Example: "Black, 128 GB" not "opt_black, opt_128gb".

---

## 5. Checkout Pre-Validation

Before showing the "Confirm Order" button (or on the checkout review screen), call:

```typescript
const validationResult = await validateCheckout({
  lineItem: {
    productId: cartItem.productId,
    productName: cartItem.productName,
    productImage: cartItem.productImage,
    variantId: cartItem.variantId,
    selectedOptionIds: cartItem.selectedOptionIds || null,
    quantity: cartItem.quantity,
  },
});
```

**Display logic:**
- If `valid: true` — show resolved price, stock confirmed, enable confirm button
- If `valid: false` — show errors, disable confirm button
- If `priceSource === 'seller_offer'` — show "Price from seller offer"
- If `priceSource === 'promotion'` — show original price struck through + discounted price
- If `stockSufficient === false` — show "Only X available" and cap quantity selector

---

## 6. Seller Listing Workflow (MSLE)

**Route:** `/seller/listing/start` → progressive wizard

### 6.1 Stage Flow

```
Stage 1: Identify
├── Path A (Sell Existing): search for catalog product → select match
└── Path B (Introduce New): enter product name, brand, GTIN, category

Stage 2: Describe
├── Path A: verify/inherit catalog info (read-only, pre-filled)
└── Path B: enter description, specifications, upload images, brand, model

Stage 3: Configure
├── Question: "Does this product have options customers must choose?"
├── If NO → skip to Stage 4
└── If YES → define dimensions (Colour, Size, etc.) and options
    ├── "Do all combinations exist?" → if YES, system creates them
    ├── "Do prices differ?" → allow per-config price overrides
    └── "Do some choices depend on others?" → define dependencies

Stage 4: Offer
├── Selling price (required)
├── Stock or availability (required)
├── Condition (new, used, refurbished)
├── Seller SKU (optional)
├── Fulfillment method (seller-fulfilled, platform-fulfilled)
├── Lead time (days)
├── Warranty (optional)
├── Return conditions (optional)
└── Minimum order quantity (optional, default 1)

Stage 5: Review & Publish
├── Summary: product identity, details, configurations, price, stock, offer conditions
├── Missing required information (red)
├── Recommended improvements (amber)
└── [Publish] button → creates seller offer
```

### 6.2 Auto-Save & Recovery

- On every stage transition, call `PUT /seller/listing/draft/:id` with the current stage and draft data
- On page load, call `GET /seller/listing/drafts` to show "Resume listing" cards for in-progress drafts
- On draft click, call `GET /seller/listing/draft/:id` to restore full state

### 6.3 Validation Display

Before publish, call `POST /seller/listing/:id/validate`:
- `errors` (severity: error) — must fix before publish, show in red
- `warnings` (severity: warning) — recommended, show in amber
- Only enable the "Publish" button when `valid === true`

### 6.4 Publish

Call `POST /seller/listing/:id/publish`:
- On 200: show "Listing published!" with the offer ID, redirect to seller offers dashboard
- On 409: show "You already have an offer for this product" with link to manage existing offer
- On 422: show validation errors inline

---

## 7. Seller Offer Management Dashboard

**Route:** `/seller/offers`

Table view:
```
┌──────────────┬──────────┬────────┬───────┬──────────┬────────┬────────┐
│ Product      │ Price    │ Stock  │ Status│ Condition│ Lead    │ Actions │
├──────────────┼──────────┼────────┼───────┼──────────┼────────┼────────┤
│ Product A    │ TZS 42k  │ 25     │Active │ New      │ 2 days │ ⚙️ 📊  │
│ Product B    │ TZS 15k  │ 0      │Draft  │ Used     │ 5 days │ ⚙️ 📊  │
│ Product C    │ TZS 88k  │ 10     │Suspend│ Refurb   │ 1 day  │ ⚙️ 📊  │
└──────────────┴──────────┴────────┴───────┴──────────┴────────┴────────┘
```

**Actions per offer:**
- Edit price (inline or modal) → `PATCH /seller/offers/:id/price`
- Edit stock (inline or modal) → `PATCH /seller/offers/:id/stock`
- Activate/suspend/archive → `PATCH /seller/offers/:id/status`
- View product detail → link to `/products/:productId`

**Status badges:**
- `draft` — gray, "Draft"
- `active` — green, "Active"
- `suspended` — amber, "Suspended"
- `archived` — red, "Archived" (no actions available)

---

## 8. Order Display (Configurable Products)

**Cart and order history should show the human-readable configuration:**

```
Cart item:
┌──────────────────────────────────────────────┐
│ [img] Samsung Galaxy A10                       │
│       Black, 128 GB                            │  ← from resolveResult.resolvedConfiguration
│       TZS 42,000 × 1 = TZS 42,000             │
│       Seller: Seller Name                      │
│       [Remove]                                 │
└──────────────────────────────────────────────┘
```

**Order history detail:**
- The order item snapshot (captured at checkout time) preserves:
  - `selectedConfiguration` — human-readable display values
  - `configurationFingerprint` — canonical ID (for seller reference)
  - `configurationDefinitionVersion` — which version of the definition was used
  - `price.unitPrice`, `price.totalLinePrice`, `price.priceSource`
  - `fulfillment.fulfillmentPolicy`, `fulfillment.leadTimeDays`

The seller sees the same snapshot — they know exactly which configuration was purchased.

---

## 9. Key Implementation Principles

1. **Never expose raw IDs to users.** Configuration option IDs, dimension IDs, fingerprints — all are internal. The UI shows `displayValue` and `displayLabel` only.

2. **The backend is authoritative.** Never let the frontend compute prices, validate configurations, or determine stock. Always call the backend endpoints.

3. **Debounce configuration validation.** When the buyer is selecting options, debounce validate+resolve by 300ms to avoid spamming the API on rapid clicks.

4. **Handle 404 on configuration endpoint gracefully.** A 404 means "simple product, no configuration needed." Don't show an error — just skip the configuration selector entirely.

5. **Show resolved price, not list price.** The `resolveConfiguration` and `checkout/validate` endpoints return the actual resolved price. The product detail page shows the buy-box winner price, but after configuration selection, show the resolved price from the resolve endpoint.

6. **Drafts survive interruptions.** The listing workflow auto-saves on every stage transition. If the seller closes the browser, they can resume from `/seller/listing/drafts`.

7. **Don't block the product card on configuration check.** Use lazy loading or a separate flag. The search response should be fast — configuration checks are secondary.

8. **Price formatting:** TZS with thousands separator, no decimals. Example: `TZS 42,000` not `TZS 42000.00`.

---

## 10. Backend Endpoint Reference

All catalog endpoints are prefixed with `/api/catalog`:

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/v1/products/search` | None | Search products with filters |
| GET | `/v1/products/:identifier` | None | Product detail (ID or slug) |
| GET | `/v1/products/:id/configuration` | None | Configuration definition |
| POST | `/v1/products/:id/validate-configuration` | None | Validate selections |
| POST | `/v1/products/:id/resolve-configuration` | None | Resolve to fingerprint + display values |
| GET | `/v1/products/:id/offers` | None | Active seller offers for product |
| GET | `/v1/categories` | None | Category tree |
| GET | `/v1/categories/:id/products` | None | Products in category |
| POST | `/v1/seller/offers` | Seller | Create seller offer |
| GET | `/v1/seller/offers` | Seller | List own offers |
| PATCH | `/v1/seller/offers/:id/price` | Seller | Update price |
| PATCH | `/v1/seller/offers/:id/stock` | Seller | Update stock |
| PATCH | `/v1/seller/offers/:id/status` | Seller | Update status |
| POST | `/v1/seller/listing/start` | Seller | Start listing draft |
| PUT | `/v1/seller/listing/draft/:id` | Seller | Save/update draft |
| GET | `/v1/seller/listing/draft/:id` | Seller | Retrieve draft |
| GET | `/v1/seller/listing/drafts` | Seller | List all drafts |
| POST | `/v1/seller/listing/:id/validate` | Seller | Validate before publish |
| POST | `/v1/seller/listing/:id/publish` | Seller | Publish listing |
| POST | `/v1/checkout/validate` | Buyer | Pre-confirmation validation |
| POST | `/v1/products` | Seller | Create product (KYC-gated) |
| POST | `/v1/products/:id/publish` | Seller | Publish product |
| PUT | `/v1/products/:id` | Seller | Update product |
