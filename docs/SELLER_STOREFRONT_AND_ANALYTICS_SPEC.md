# Seller Storefront & Analytics — Evidence-Based Design Specification

> **Audience:** Product and frontend engineers building the Seller Storefront page and the Seller Analytics page.
> **Design reference:** The existing Seller Dashboard (verified implementation at `GET /api/analytics/sellers/:sellerId/dashboard`).
> **Currency:** All monetary values are in Tanzanian Shilling (TZS) unless a `currency` field says otherwise.

---

## 1 — Seller Storefront Page

### 1.1 Purpose

The Seller Storefront is a public-facing page that gives a shop its own identity on Maysar. Buyers discover it through search, a share link, or a QR code. The seller manages it to present their brand, showcase their catalog, and control how their shop appears to customers. It is not the same as the internal Seller Dashboard — it is what buyers see.

### 1.2 What the system can provide

The storefront endpoint at `GET /api/catalog/:sellerId/storefront` (and `GET /api/catalog/:slug/storefront` via slug) returns:

| Field | Source | Notes |
|---|---|---|
| `id` | `Business.ownerId` | Seller's user ID |
| `name` | `Business.name` | Shop display name |
| `description` | `Business.description` | Optional shop bio |
| `logo` | `Business.attributes.logoUrl` or `.logo` | Optional; `string` or `undefined` |
| `shareUrl` | Computed | `https://maysar.co.tz/seller/{slug}` |
| `shortUrl` | Computed | `https://maysar.co.tz/s/{slug}` |
| `qrCode` | Generated server-side | Base64 PNG data URL, 300×300, error correction M |
| `stats.totalProducts` | `Product.count` where `status = published AND visibility = public` | Live count of active listings |
| `stats.rating` | Hard-coded `0` | **No seller-rating source is currently modelled.** See §1.9. |

A seller has a storefront only when their business registration is `ACTIVE`, `VERIFIED`, and not `NON_COMPLIANT`. An unverified or suspended seller has no public storefront.

Product listings for the storefront come from `GET /api/catalog/v1/sellers/:sellerId/products?status=published`. Each product includes name, price, images, stock status, and buy-box position. Campaigns with `status = ACTIVE` automatically reduce the displayed price and populate `compareAtPrice` — the frontend does not calculate campaign prices.

### 1.3 Page structure

```
┌─────────────────────────────────────────────┐
│  Shop header                                │
│  [Logo]  Shop name               [Share ↗]  │
│          Short description                  │
│          ★ rating   •  N products           │
│          [Copy link]  [QR code]             │
├─────────────────────────────────────────────┤
│  Filter / sort bar                          │
│  All  •  Category A  •  Category B   ↕ Sort │
├─────────────────────────────────────────────┤
│  Product grid                               │
│  [Card] [Card] [Card]                       │
│  [Card] [Card] [Card]                       │
└─────────────────────────────────────────────┘
```

**Shop header** — uses the business `name` as the shop title, `description` as a single-line bio (truncated at ~120 characters with a "more" toggle), and `logo` as the shop avatar. If no logo is present, show the initial letter of the shop name in a filled circle, using a colour derived from the name (consistent across visits, not random). Display `stats.totalProducts` as "N products available". The rating chip remains hidden until the rating source is implemented (§1.9).

**Share actions** — a secondary action area with two choices: "Copy link" (copies `shortUrl` to clipboard with a toast "Link copied") and "QR code" (opens a modal showing the QR code image with a download button). These are always available to any visitor. The "Generate custom link" action is available only to the authenticated seller who owns the shop (roles check: `userId === sellerId` or `admin`). Calling `POST /api/catalog/:sellerId/share-url` with `{ customSlug, includeQR: true }` updates the slug and returns new URLs. A slug collision returns `409 SLUG_UNAVAILABLE` — tell the seller "That link is already taken. Try a different one."

**Filter bar** — client-side category filter built from the `categoryId` values in the returned product list. Sort options: "Newest", "Price: Low to High", "Price: High to Low", "Best selling" (sort by `analytics_SellerProductPerformance.orders` descending, available when analytics data exists).

**Product grid** — responsive card grid: 4 columns on desktop, 2 on tablet, 1 on mobile. Each card shows the primary product image, product name, price (with `compareAtPrice` strikethrough when a campaign is active), stock badge ("In stock" / "Low stock" / "Out of stock"), and an "Add to cart" or "Order" action. Products with `status !== published` or `visibility !== public` are never shown on the public storefront.

### 1.4 Product cards

Each card uses the same card component as product search results in the buyer app. Verified fields:

- `price.amount` in TZS formatted as `TZS 25,000`
- `compareAtPrice` shown only when present and higher than `price` (active campaign)
- Stock badge: `IN_STOCK` → green "In stock"; `LOW_STOCK` (≤7 days of stock) → amber "Low stock"; `OUT_OF_STOCK` → red "Out of stock"
- Campaign badge: when a campaign is active, show a percentage discount label (e.g. "−20%") in the card corner

### 1.5 Empty state

When `stats.totalProducts === 0` (verified seller, no published listings):

> **This shop is getting ready**
> The seller hasn't published any products yet. Check back soon.

Do not show the filter bar or sort controls in this state.

### 1.6 Seller management view

When the authenticated seller is viewing their own storefront (or a seller accesses it through the dashboard), a management banner appears above the product grid:

> "This is how buyers see your shop." + \[Edit shop details\] + \[Add product\]

"Edit shop details" links to the business profile editing screen. "Add product" triggers `POST /api/catalog/v1/products`.

The seller can also see draft or suspended products in a separate "Hidden from buyers" section visible only to them, each with status chips and quick actions: Publish, Edit, Archive.

### 1.7 Loading and error states

- **Loading:** Skeleton layout — header block skeleton + 8 card skeletons in a 4-column grid.
- **Storefront not found (404):** "This shop isn't available. The seller may be inactive or their account is under review." No empty product grid — do not render the page chrome at all.
- **Products load failure (5xx):** Show the shop header successfully (cached or freshly loaded) and replace the product grid with "We couldn't load products right now. Try refreshing."

### 1.8 Responsive behaviour

The page follows the same 12-column grid used in the Seller Dashboard. The shop header stacks vertically on mobile: logo centered, name below, description below that, share actions as icon-only buttons. Product grid collapses from 4 → 2 → 1 column using the same breakpoints as the search results page.

### 1.9 Unresolved dependencies

| Gap | Current state | Required for |
|---|---|---|
| Seller rating | `stats.rating` is always `0` — no review aggregation is modelled for seller-level ratings | Rating chip in shop header |
| Review count | No endpoint aggregates review count at seller level | "N reviews" in header |
| Seller-level categories | Category filter is derived client-side from product listings — no server-side category aggregation endpoint exists | Category filter (low risk, client-side is sufficient) |
| Follower / wishlist count | Not modelled | Social proof signals |

---

## 2 — Seller Analytics Page

### 2.1 Purpose

The Seller Analytics page is a private, seller-authenticated view of business health. It gives the seller a single place to understand how their shop is performing, where money is moving, which products to act on, and whether they are meeting platform standards. It is denser and more detailed than the Seller Dashboard — it is where a seller goes to investigate, not just to get a summary.

### 2.2 What the system can provide

The analytics data is spread across several verified endpoints, all under `/api/analytics/sellers/:sellerId/`. The full dashboard snapshot is available from `/dashboard`; individual sections can be fetched independently for lazy loading.

**Money Snapshot** (`/dashboard/money-snapshot`)

| Field | Calculation |
|---|---|
| `todaySales.amount` | Sum of `order_Order.totalAmount` where `sellerId`, `status = DELIVERED`, `createdAt ≥ today midnight` |
| `todaySales.orderCount` | Count of those orders |
| `thisMonthRevenue.amount` | Sum of `totalAmount` for DELIVERED orders since 1st of current month |
| `thisMonthRevenue.growth` | `((thisMonth − lastMonth) / lastMonth) × 100`; 100% if last month was zero and this month is positive |
| `walletBalance.available` | `wallet_Wallet.balance` for this seller |
| `walletBalance.pending` | `wallet_Wallet.frozenAmount` |
| `netPayout` | `thisMonthRevenue.amount − thisMonthCommissions.amount` |
| `nextPayoutDate` | Next `payout` record with `status = PENDING` ordered by `createdAt` ascending |

**Performance Insights** (derived from the same `/dashboard` call)

| Field | Calculation |
|---|---|
| `salesTrend.data` | 7 days of `analytics_SellerDailySales` entries (date, revenue). Upserted by the nightly `GenerateSalesTrend` job from DELIVERED orders |
| `salesTrend.trend` | Compares average revenue of last 3 days vs preceding days: `>110%` → `up`, `<90%` → `down`, else `flat` |
| `repeatCustomers.rate` | `(buyers with >1 order this month) / (total unique buyers this month) × 100` |
| `bestProduct.name` | Product with highest cumulative units sold in DELIVERED orders (by `order_OrderItem.quantity` sum) |
| `bestProduct.unitsSold` | Units sold for that product |
| `bestProduct.revenue` | `avg(price) × units sold` for that product |

**Orders counts** — live from `order_Order.groupBy(status)`. Status mapping:
- `new` ← `PENDING`
- `processing` ← `CONFIRMED`
- `shipped` ← `IN_TRANSIT`
- `completed` ← `DELIVERED`
- `disputed` ← `CANCELLED` *(see §2.9 — the mapping of CANCELLED to "disputed" is a naming inconsistency in the current implementation)*

**Payout Transparency** — same month's delivered order sum minus commission, with `feeBreakdown` array containing one entry of type `Commission`.

**Inventory Health** — from `analytics_SellerInventoryHealth`. Three counts: `inStock` / `lowStock` / `outOfStock`. Stock status thresholds:
- `OUT_OF_STOCK`: `currentStock === 0`
- `LOW_STOCK`: `daysUntilStockout ≤ 7` (velocity-based)
- `IN_STOCK`: everything else

Velocity: `totalSold / 30 days`. Days until stockout: `currentStock / velocity`.

**Action Center** — unresolved `analytics_SellerActionItem` records. Three action types are generated by the system:
- `RESTOCK` (HIGH) — products where `daysUntilStockout ≤ 3`
- `RESPOND_INQUIRY` (HIGH if >5, MEDIUM otherwise) — count of `support_Ticket.status = OPEN` for this seller
- `PRICE_ADJUSTMENT` (MEDIUM) — products where `conversionRate < 5%`

Actions can be resolved by the seller via `PATCH /api/analytics/action-items/:actionId/resolve`. Resolved items disappear from the center.

**Profitability Score** (`/dashboard/profitability-score`)

Composite score out of 100, calculated across five dimensions:

| Dimension | Weight | Source |
|---|---|---|
| Sales growth | 30 pts | MoM revenue growth from DELIVERED orders; capped at 30, floored at 0. 100% growth = 15 pts; 200% = 30 pts (linear `growth × 150`) |
| Repeat buyers | 20 pts | Repeat buyer rate this month × 20 |
| Response time | 15 pts | Avg hours to resolve support tickets: <1h → 15, <24h → 10, ≥24h → 5. Defaults to 15 when no tickets exist |
| Order completion | 20 pts | `DELIVERED / total orders × 20` |
| Inventory stability | 15 pts | `IN_STOCK products / total products × 15` |

Score status labels: ≥80 "Excellent", ≥60 "Good", ≥40 "Fair", <40 "Needs Improvement".

**Sales Trend** (`/dashboard/sales-trend`)

Independent endpoint returning the same 7-day daily data with trend direction. Can be fetched separately for the chart component.

**SLA Report** (`/api/analytics/sellers/:sellerId/sla?lookbackDays=30`)

Eleven compliance metrics grouped under clauses (Order Processing, Inventory, Customer Communication, Packaging & Delivery, Product Quality, Returns & Refunds, Support & Escalation, Business Compliance). Each metric has:
- `actual` (measured value or `null` if no data)
- `target` (threshold)
- `score` (0–100, weighted)
- `status`: `compliant` (score ≥ 100) / `at_risk` (≥ 85) / `breached` (<85) / `manual` (null data)
- `confidence`: `direct` / `derived` / `manual`
- `weight` (contribution to overall score)

Overall SLA status: `healthy` / `watch` / `critical` / `manual`. Report status of `manual` appears when data coverage is below 40% — it means the platform cannot make a reliable assessment yet.

Go-live readiness: 7 gates (signed agreement, payment setup, catalog live, response tested, returns understood, Maysar confirmation, business compliance). Three gates remain `manual` (signed agreement, payment setup, Maysar confirmation) — these require off-platform verification and will always show as requiring human review.

### 2.3 Page structure

```
┌─────────────────────────────────────────────────────┐
│  Page header: "Analytics"    [Last updated: today]  │
│  Date filter: [This month ▾]                        │
├────────────┬────────────┬───────────┬───────────────┤
│ Today's    │ This month │  Net      │ Wallet        │
│ sales      │ revenue    │  payout   │ balance       │
│ TZS 42,000 │ TZS 840K   │ TZS 756K  │ TZS 120K      │
│ 3 orders   │ ↑ 18%      │           │ TZS 40K hold  │
├────────────┴────────────┴───────────┴───────────────┤
│  Revenue trend (7-day bar chart)      [↑ Trending]  │
├──────────────────────────┬──────────────────────────┤
│  Action center           │  Order pipeline           │
│  ● HIGH  Restock Shoe X  │  New: 5  Processing: 3   │
│    3 days of stock left  │  Shipped: 2  Done: 47    │
│  ● MED   12 products     │  Cancelled: 1             │
│    low conversion        │                          │
│  [Resolve] each item     │                          │
├──────────────────────────┴──────────────────────────┤
│  Profitability score                                │
│  82 / 100  ●  Excellent                             │
│  [Sales growth 28] [Repeat buyers 16]               │
│  [Response time 15] [Order completion 18]           │
│  [Inventory stability 5]                            │
├──────────────────────────┬──────────────────────────┤
│  Inventory health        │  Best performing product  │
│  In stock: 24            │  Kikoi Beach Shirt        │
│  Low stock: 3  ⚠         │  142 units sold           │
│  Out of stock: 1  ✕      │  TZS 568,000 revenue      │
├──────────────────────────┴──────────────────────────┤
│  Payout transparency                                │
│  Earned: TZS 840K   Commission: TZS 84K             │
│  Net: TZS 756K      Next payout: Nov 15             │
├─────────────────────────────────────────────────────┤
│  SLA compliance                                     │
│  Overall: 87.4 / 100   Status: Watch                │
│  [See full SLA report →]                            │
└─────────────────────────────────────────────────────┘
```

### 2.4 KPI summary row

Four metric tiles in a single horizontal row at the top:

- **Today's sales** — `moneySnapshot.todaySales.amount` with `orderCount` below ("3 orders")
- **Month revenue** — `thisMonthRevenue.amount` with growth arrow and percentage change. Green arrow + value when `growth > 0`, red arrow when `growth < 0`, grey em-dash when `growth = 0`. Formatted: "↑ 18%" or "↓ 4%"
- **Net payout** — `payoutTransparency.netPayout` — the amount the seller will receive after commission, for the current month
- **Wallet balance** — `walletBalance.available` with `pending` shown as "TZS X on hold" in a subdued style below

All tiles use the same card component as the Seller Dashboard. Tiles are tappable — tapping "Month revenue" scrolls to the revenue trend chart; tapping "Wallet balance" opens the Wallet page.

### 2.5 Revenue trend chart

A 7-day bar chart of daily revenue. Each bar is the `revenue` value from `analytics_SellerDailySales`. Days with no data appear as zero-height bars, not missing bars (the x-axis always shows 7 full days). The chart title includes the trend direction tag: "↑ Trending up", "↓ Trending down", or "Stable" mapped from the `trend` field (`up` / `down` / `flat`).

The chart uses the same chart component and color palette as the Seller Dashboard. Bars use the brand green for positive trend, amber for down, neutral grey for flat. Hovering (desktop) or tapping (mobile) a bar shows a tooltip: "Date: TZS 42,000 | 3 orders".

A date filter at the top of the page defaults to "This month". Options: "Today", "This week", "This month", "Last 30 days". Changing the filter re-fetches the sales trend endpoint. **Important:** the `/dashboard/sales-trend` endpoint currently hardcodes a 7-day lookback; wider date range support requires a backend change. Show only "Last 7 days" and "Last 30 days" until the endpoint accepts a date range parameter.

### 2.6 Action center

A card on the left side of a two-column layout (right side: Order pipeline). Lists unresolved action items from `analytics_SellerActionItem` ordered by priority then creation date (HIGH first, then MEDIUM, then LOW).

Each action item displays:
- A priority dot: RED for HIGH, AMBER for MEDIUM, BLUE for LOW
- Title from `actionItem.title`
- Description from `actionItem.description` (single line, truncated at ~80 chars)
- A "Resolve" button — calls `PATCH /api/analytics/action-items/:actionId/resolve`. On success, the item disappears with a fade-out animation. On 404 (item already resolved), remove it silently. On 500, show a toast "Couldn't mark as done. Try again."

When the action center is empty, show: "All caught up — no actions required right now." with a small checkmark illustration.

Maximum of 5 items visible; show "View N more" button when the list exceeds 5. Clicking expands the list in-place.

### 2.7 Order pipeline

A compact summary card showing the five order status counts. Each count is a tappable number that links to the Orders page with the relevant status filter pre-applied. The "Cancelled" count is labelled "Cancelled" in the UI — not "Disputed" — since cancelled orders are a distinct concept from disputes. (See §2.9.)

When all counts are zero, show "No orders yet" with a prompt to share their storefront.

### 2.8 Profitability score

A score card showing the total score as a large number (e.g. "82 / 100") with the status label ("Excellent", "Good", "Fair", or "Needs Improvement") and a colour-coded indicator (green / teal / amber / red).

Below the score, five small sub-score chips show the breakdown:
- Sales growth: X / 30
- Repeat buyers: X / 20
- Response time: X / 15
- Order completion: X / 20
- Inventory stability: X / 15

Each chip has a label and value. Chips with zero or near-zero values are styled in amber to draw attention.

A "What affects my score?" expandable section below the chips explains each dimension in plain language.

### 2.9 Inventory health & best product

Two cards in a two-column layout:

**Inventory health** — Three counts (In stock, Low stock, Out of stock) styled as a horizontal bar showing the proportion of each. "Low stock" items have a yellow warning icon; "Out of stock" items have a red X. If `lowStock + outOfStock > 0`, show a prompt: "Restock now to avoid missed sales" linking to the product list filtered by low/out-of-stock.

**Best performing product** — Shows the product name, total units sold, and total revenue. If `bestProduct.name === 'N/A'` or no orders exist yet, show "No sales data available yet. Once you start selling, your best product will appear here."

### 2.10 Payout transparency

A card showing four fields in two columns:
- Total earned this month (gross)
- Commission deducted
- Net payout
- Next payout date (formatted as "Nov 15" or "Pending" if null)

A fee breakdown row below shows each entry in `feeBreakdown` as "Commission: TZS 84,000". If the breakdown array has only one entry (the current state), show it as a single line. The design accommodates future fee types (delivery, platform fee) without layout changes.

### 2.11 SLA compliance summary

A compact card at the bottom showing:
- Overall compliance score (to one decimal place)
- Status badge: "Healthy" (green), "Watch" (amber), "Critical" (red), "Manual" (grey)
- A "See full SLA report →" link that opens a dedicated SLA detail view

The SLA detail view shows all 11 metrics in a list grouped by clause, each with its status chip, actual vs target values, and evidence notes. Breaches are listed first within each group. The confidence indicator ("Derived", "Direct", "Manual") appears as a small label beside each metric — "Manual" means the platform could not measure this metric automatically and a human assessment is needed.

The three manual go-live readiness gates (signed agreement, payment setup, Maysar confirmation) are shown greyed out with the note "Requires offline verification".

### 2.12 Loading, skeleton, and error states

- **Initial load:** All six sections show skeleton cards simultaneously. The page makes one call to `/dashboard` for the main snapshot (money, orders, actions, inventory, profitability, payout) and two independent calls for `/sla` and `/dashboard/sales-trend`. None of the three calls block the others.
- **Partial failure:** If the `/sla` call fails, the SLA card shows "SLA data unavailable right now" with a "Retry" button — the rest of the page renders normally. Same pattern for any individual section failure.
- **Empty state (new seller, no data):** All numeric values show "—". The chart shows seven empty bars. The action center shows "All caught up." The page is still fully usable.
- **Auth failure (403):** "You don't have permission to view this seller's analytics." Do not render the page data — show this message in place of the main content.

### 2.13 Responsive behaviour

On mobile, all sections stack vertically in this order: KPI tiles (2×2 grid), trend chart (full width), action center, order pipeline, profitability score, inventory + best product, payout transparency, SLA summary. The two-column layouts collapse to single-column below the tablet breakpoint (768px), matching the Seller Dashboard's existing collapse behaviour.

### 2.14 Unresolved dependencies

| Gap | Current state | Impact |
|---|---|---|
| "Disputed" vs "Cancelled" | The dashboard maps `CANCELLED` orders to `orders.disputed` — a naming collision. Cancellations are not disputes | Medium: misleading metric label. Rename to "Cancelled" in the UI; the backend groupBy needs a separate fix to distinguish true disputes (COD disputes) from cancellations |
| Date range filtering | `/dashboard/sales-trend` hardcodes 7 days; wider ranges need a backend query parameter | Medium: limits historical view |
| Seller-level average rating | `reputation.averageRating` is hardcoded `4.5` and `recentReviews` is always `[]` | High: the reputation section cannot be shipped as designed until product review aggregation at seller level is implemented |
| Seller response rate | `reputation.responseRate` is hardcoded `95` | Medium: misleading. Should be derived from support ticket response data |
| `nextPayoutDate` precision | `nextPayout?.createdAt` (creation timestamp of the payout record) is used, not an actual scheduled payout date | Low: the date shown may not match what the payout service intends as the payout schedule |
| Refund data | The SLA refund metrics (`refundsTotal`, `refundsCompletedWithin48h`) are measured from the refund table — refund records need to exist before this metric is meaningful | Low: shows `manual` status until refund flow is live |
| Three SLA readiness gates | "Signed agreement", "payment setup", and "Maysar confirmation" are always `manual` and always fail | Low: expected — these are human-verified steps |

---

## 3 — Design consistency

Both pages are built on the same design system as the existing Seller Dashboard.

**Typography:** Dashboard section headings (16px semi-bold), metric values (24–32px bold), sub-labels (12px regular, subdued colour).

**Colour tokens:** Brand green for positive indicators, amber for warnings, red for critical states, neutral grey for empty or manual states. Status badges follow the same four-state pattern used in the Dashboard (Excellent/Good/Fair/Needs Improvement; Compliant/At risk/Breached/Manual).

**Card component:** White background, 8px border radius, 16px internal padding, 1px light border. Cards take full column width and do not have fixed heights — they expand to fit content.

**Spacing:** 16px gap between cards on desktop, 12px on mobile. Section headings have 24px top margin.

**Loading states:** Skeleton shimmer animation matching the Dashboard, not spinner-based, to avoid layout shift when content arrives.

**Icons:** Same icon set as the Dashboard. Status icons: ✓ (compliant), ⚠ (at-risk / low-stock), ✕ (breached / out-of-stock), ○ (manual).

**Actions:** Primary actions use the filled brand-coloured button. Secondary actions (Resolve, View more, See report) use the outlined variant. Destructive or irreversible actions are not present on these pages.

---

## 4 — Implementation priorities

### Tier 1 — Build immediately (all data available)
1. Seller Storefront: shop header, product grid, share/QR actions
2. Analytics KPI tiles (today's sales, month revenue, net payout, wallet)
3. Revenue trend chart (7-day)
4. Action center with resolve capability
5. Order pipeline counts
6. Profitability score with sub-score breakdown
7. Inventory health counts
8. Best performing product card
9. Payout transparency card

### Tier 2 — Build with known limits, label accordingly
10. SLA compliance summary and detail view (three gates will always show as manual; label them clearly)
11. SLA status badges and breach list
12. Date filter UI (7-day and 30-day toggle; disable wider ranges until backend supports them)

### Tier 3 — Defer until backend capability is confirmed
13. Seller-level average rating and review count in Storefront header (backend does not model this yet)
14. Reputation section in Analytics (hardcoded values — do not ship misleading metrics)
15. Date range filter beyond 30 days on the trend chart

### Do not ship
- Any calculation or aggregation performed client-side that duplicates or shadows server calculations. All monetary and metric values must come from the API as-is.
- The "Disputed" label for the cancelled order count — this is a naming bug, not a feature. Label it "Cancelled" until the server-side groupBy is corrected.
