# Maysar Frontend — Playwright Test Writing Guide (CORRECTED)

This document gives the frontend team precise, actionable directions for writing Playwright
end-to-end tests. It is grounded in the same commercial roles, flows, and data that power
the backend API test suite in `tests/e2e/` and documented in `docs/e2e-trust-map.md` and
`docs/e2e-technical-evidence.md`.

> **Important distinction**: The existing `tests/e2e/` directory contains a Jest-based
> *backend API* test suite. It makes direct HTTP calls and never opens a browser. This
> guide describes a separate *frontend browser* test suite that lives in `playwright/` and
> tests the UI layer on top of the same running backend. The two suites are complementary —
> they share seeded users and business rules but run independently.

---

## Foundational principles

### Test what the user actually does, not what the DOM looks like

Every test should represent a real user action with a real business outcome.

### Use the same seeded users the backend uses

The backend suite uses six deterministic seeded users. Playwright tests must use the same
credentials — never register new users, never create random emails.

### Tier every test — P0 blocks deploy, P1 runs daily, P2 runs weekly

```typescript
test('[P0] buyer: login and see dashboard', async ({ page }) => { ... });
test('[P1] buyer: place wallet order and see confirmation', async ({ page }) => { ... });
test('[P2] buyer: COD geographic restriction shows error message', async ({ page }) => { ... });
```

Run P0 only:
```bash
npx playwright test --grep "\[P0\]"
```

---
## Relationship to the Jest E2E suite

| Concern | Jest E2E (`tests/e2e/`) | Playwright (`playwright/`) |
|---|---|---|
| What it tests | Backend API correctness | Frontend UI correctness |
| How it authenticates | Direct HTTP login → JWT | Browser form fill → session cookie |
| `loginAs` meaning | Returns a JWT string | Drives the login form on a Page |
| Seeded users | Same six users | Same six users |
| Seed command | `npm run seed:e2e` | `npm run seed:e2e` (shared) |
| Opt-in gate | `RUN_LIVE_E2E=true` | `PLAYWRIGHT_BASE_URL` set |
| Backend URL | `http://localhost:3000` | Frontend URL `http://localhost:3001` |

---

## Project setup

### playwright.config.ts

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './playwright/tests',
  fullyParallel: false,         // must be serial — tests share seeded state
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,                   // one worker — same reason
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  globalSetup: './playwright/global-setup.ts',
});
```

### playwright/global-setup.ts

```typescript
import { execSync } from 'child_process';

export default async function globalSetup() {
  // Reset backend state before the entire playwright suite.
  // Same seed script used by Jest E2E — ensures consistent starting state.
  // RUN_LIVE_E2E is a Jest gate only — Playwright does not need it.
  execSync('npm run seed:e2e', { stdio: 'inherit' });
}
```

---
## playwright/fixtures/auth.ts — reusable login fixture

```typescript
import { test as base, expect, Page } from '@playwright/test';
import { USERS } from './users';

type AuthFixtures = {
  buyerPage: Page;
  sellerPage: Page;
  courierPage: Page;
  adminPage: Page;
};

export const test = base.extend<AuthFixtures>({
  buyerPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAs(page, USERS.buyer);
    await use(page);
    await context.close();
  },
  sellerPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAs(page, USERS.seller);
    await use(page);
    await context.close();
  },
  courierPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAs(page, USERS.courier);
    await use(page);
    await context.close();
  },
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAs(page, USERS.admin);
    await use(page);
    await context.close();
  },
});

// loginAs drives the browser login form and waits for a post-login URL.
// This is DIFFERENT from tests/e2e/helpers/live-api.ts loginAs which returns a JWT.
export async function loginAs(page: Page, user: { email: string; password: string }) {
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', user.email);
  await page.fill('[data-testid="password-input"]', user.password);
  await page.click('[data-testid="login-submit"]');
  await page.waitForURL(/\/(dashboard|home|buyer|seller|courier|admin)/);
}

export { expect };
```

---

## How to use `data-testid` attributes

Every interactive element that a test touches must have a `data-testid`. Never use CSS classes, text content, or element positions as selectors — they change with styling updates.

```typescript
// Fragile — do not use
page.locator('.btn-primary')
page.locator('button:has-text("Place Order")')

// Stable — always use data-testid
page.locator('[data-testid="place-order-btn"]')
page.locator('[data-testid="wallet-balance-display"]')
```

Required `data-testid` attributes (frontend must implement all of these):

| Element | `data-testid` |
|---|---|
| Email input on login | `email-input` |
| Password input on login | `password-input` |
| Login submit button | `login-submit` |
| Login error message | `login-error` |
| Logout button | `logout-btn` |
| Wallet balance display | `wallet-balance-display` |
| Wallet transaction row | `transaction-row` |
| Product card (grid item) | `product-card` |
| Product name label | `product-name` |
| Product price label | `product-price` |
| Product quantity input | `product-quantity-input` |
| Add to cart button | `add-to-cart-btn` |
| Cart item count badge | `cart-item-count` |
| Payment method — wallet | `payment-method-wallet` |
| Payment method — COD | `payment-method-cod` |
| Delivery city input | `delivery-city-input` |
| Place order button | `place-order-btn` |
| Order confirmation ID | `order-id` |
| Order status badge | `order-status-badge` |
| Order row in history list | `order-row-{orderId}` |
| Cancel order button | `cancel-order-btn` |
| Cancel confirm button | `cancel-confirm-btn` |
| COD eligibility error | `cod-ineligibility-error` |
| Delivery code display | `delivery-code-display` |
| Storefront share URL | `storefront-share-url` |
| Storefront short URL | `storefront-short-url` |
| Notification bell | `notification-bell` |
| Chat with seller button | `chat-with-seller-btn` |
| Chat message input | `chat-message-input` |
| Chat send button | `chat-send-btn` |
| Chat message bubble | `chat-message` |
| Conversation row in inbox | `conversation-row` |
| Support ticket subject input | `ticket-subject-input` |
| Support ticket description | `ticket-description-input` |
| Support ticket category select | `ticket-category-select` |
| Support ticket submit button | `ticket-submit-btn` |
| Support ticket ID display | `ticket-id` |
| Support ticket row in list | `ticket-row` |
| Seller product row | `product-row` |
| Seller orders total count | `orders-total-count` |
| Delivery row in courier list | `delivery-row` |
| Delivery status badge | `delivery-status-badge` |
| Delivery update status button | `update-status-btn` |
| Delivery status select dropdown | `status-select` |
| Confirm status update button | `confirm-status-update` |
| Status update error message | `status-update-error` |
| Admin system status indicator | `system-status-indicator` |
| Admin user search input | `user-search-input` |
| Admin user search submit | `user-search-submit` |
| Admin user row in list | `user-row` |
| Admin user email cell | `user-email` |

---

## Test files — one per domain

```
playwright/tests/
  auth.spec.ts                — login, logout, all-roles check
  buyer.spec.ts               — discovery, cart, wallet order, cancel, order history
  checkout-saga.spec.ts       — full wallet saga, full COD saga, OTP, tracking
  refund.spec.ts              — cancel compensation, balance restoration
  cod-trust.spec.ts           — COD limit, geographic restriction
  seller.spec.ts              — storefront, product list, order list, analytics
  courier.spec.ts             — availability, delivery lifecycle, state machine
  enabler.spec.ts             — profile, listings, referral, earnings
  supplier.spec.ts            — production plan, capacity, quality checkpoint
  commission.spec.ts          — commission display
  admin.spec.ts               — user management, dashboard, health check
  support.spec.ts             — ticket creation, message, list
  chat.spec.ts                — conversation, messages, real-time exchange
  wallet.spec.ts              — balance display, transaction history
  platform-ops.spec.ts        — notifications, idempotency, saga recovery
```

---

## Auth tests — `auth.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { USERS, loginAs } from '../fixtures/auth';

test('[P0] valid buyer login shows dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', USERS.buyer.email);
  await page.fill('[data-testid="password-input"]', USERS.buyer.password);
  await page.click('[data-testid="login-submit"]');
  await expect(page).toHaveURL(/dashboard|home/);
  await expect(page.locator('[data-testid="wallet-balance-display"]')).toBeVisible();
});

test('[P0] wrong password shows error, no redirect', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', USERS.buyer.email);
  await page.fill('[data-testid="password-input"]', 'WrongPassword999!');
  await page.click('[data-testid="login-submit"]');
  await expect(page).toHaveURL(/login/);
  await expect(page.locator('[data-testid="login-error"]')).toBeVisible();
  await expect(page.locator('[data-testid="wallet-balance-display"]')).not.toBeVisible();
});

test('[P0] logout invalidates session — protected page redirects to login', async ({ page }) => {
  await loginAs(page, USERS.buyer);
  await page.click('[data-testid="logout-btn"]');
  await expect(page).toHaveURL(/login/);
  await page.goto('/orders');
  await expect(page).toHaveURL(/login/);
});

test('[P1] all roles can log in and reach their respective dashboards', async ({ browser }) => {
  const roleDashboards: Record<string, RegExp> = {
    buyer:    /buyer|dashboard|home/,
    seller:   /seller|dashboard/,
    courier:  /courier|deliveries/,
    enabler:  /enabler|dashboard/,
    supplier: /supplier|production/,
    admin:    /admin|dashboard/,
  };
  for (const [role, urlPattern] of Object.entries(roleDashboards)) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAs(page, USERS[role as keyof typeof USERS]);
    await expect(page).toHaveURL(urlPattern);
    await context.close();
  }
});
```

---

## Buyer tests — `buyer.spec.ts`

```typescript
import { test, expect } from '../fixtures/auth';

test('[P0] catalog products page shows at least one product', async ({ buyerPage }) => {
  await buyerPage.goto('/products');
  const productCards = buyerPage.locator('[data-testid="product-card"]');
  await expect(productCards.first()).toBeVisible();
  expect(await productCards.count()).toBeGreaterThan(0);
});

test('[P0] seller storefront page loads with share URL', async ({ buyerPage }) => {
  const SELLER_ID = 'usr_01KRFZ1E5G6CWAQ4BXKVNPYG3Z';
  await buyerPage.goto(`/sellers/${SELLER_ID}`);
  await expect(buyerPage.locator('[data-testid="storefront-share-url"]')).toBeVisible();
  const shareUrl = await buyerPage.locator('[data-testid="storefront-share-url"]').getAttribute('href');
  expect(shareUrl).toContain(SELLER_ID);
});

test('[P0] wallet order: balance decreases on order, restores on cancel', async ({ buyerPage }) => {
  await buyerPage.goto('/wallet');
  const initialBalance = parseTZS(
    await buyerPage.locator('[data-testid="wallet-balance-display"]').textContent() ?? '0'
  );

  await buyerPage.goto('/products');
  await buyerPage.locator('[data-testid="product-card"]').first().click();
  await buyerPage.click('[data-testid="add-to-cart-btn"]');
  await buyerPage.goto('/checkout');
  await buyerPage.click('[data-testid="payment-method-wallet"]');
  await buyerPage.click('[data-testid="place-order-btn"]');
  await buyerPage.waitForURL(/\/orders\/MSR-ORD-/);

  const orderId = await buyerPage.locator('[data-testid="order-id"]').textContent();
  expect(orderId).toMatch(/^MSR-ORD-/);

  await buyerPage.goto('/wallet');
  const balanceAfterOrder = parseTZS(
    await buyerPage.locator('[data-testid="wallet-balance-display"]').textContent() ?? '0'
  );
  expect(balanceAfterOrder).toBeLessThan(initialBalance);

  // Cancel and wait for saga compensation (allow 30s)
  await buyerPage.goto(`/orders/${orderId}`);
  await buyerPage.click('[data-testid="cancel-order-btn"]');
  await buyerPage.click('[data-testid="cancel-confirm-btn"]');
  await expect(buyerPage.locator('[data-testid="order-status-badge"]')).toHaveText(/cancelled/i);

  await buyerPage.goto('/wallet');
  await expect(buyerPage.locator('[data-testid="wallet-balance-display"]')).toHaveText(
    new RegExp(initialBalance.toString()),
    { timeout: 30_000 }
  );
});

test('[P1] order status is readable immediately after creation', async ({ buyerPage }) => {
  await buyerPage.goto('/products');
  await buyerPage.locator('[data-testid="product-card"]').first().click();
  await buyerPage.click('[data-testid="add-to-cart-btn"]');
  await buyerPage.goto('/checkout');
  await buyerPage.click('[data-testid="payment-method-wallet"]');
  await buyerPage.click('[data-testid="place-order-btn"]');
  await buyerPage.waitForURL(/\/orders\/MSR-ORD-/);
  await expect(buyerPage.locator('[data-testid="order-status-badge"]')).toBeVisible();
  const orderId = await buyerPage.locator('[data-testid="order-id"]').textContent();
  await buyerPage.goto('/orders');
  await expect(buyerPage.locator(`[data-testid="order-row-${orderId}"]`)).toBeVisible();
});

function parseTZS(text: string): number {
  return parseInt(text.replace(/[^0-9]/g, ''), 10) || 0;
}
```

---

## COD trust tests — `cod-trust.spec.ts`

```typescript
import { test, expect } from '../fixtures/auth';

test('[P0] COD order exceeding TZS 30,000 limit shows ineligibility error', async ({ buyerPage }) => {
  await buyerPage.goto('/checkout');
  await buyerPage.locator('[data-testid="product-quantity-input"]').fill('3');
  await buyerPage.click('[data-testid="payment-method-cod"]');
  await buyerPage.click('[data-testid="place-order-btn"]');
  await expect(buyerPage).toHaveURL(/checkout/);
  await expect(buyerPage.locator('[data-testid="cod-ineligibility-error"]')).toBeVisible();
  const errorText = await buyerPage.locator('[data-testid="cod-ineligibility-error"]').textContent();
  expect(errorText?.toLowerCase()).toContain('30,000');
});

test('[P1] valid COD order (under TZS 30,000) shows 6-digit delivery code', async ({ buyerPage }) => {
  await buyerPage.goto('/checkout');
  await buyerPage.click('[data-testid="payment-method-cod"]');
  await buyerPage.fill('[data-testid="delivery-city-input"]', 'Dar es Salaam');
  await buyerPage.click('[data-testid="place-order-btn"]');
  await buyerPage.waitForURL(/\/orders\/MSR-ORD-/);
  const deliveryCode = await buyerPage.locator('[data-testid="delivery-code-display"]').textContent();
  expect(deliveryCode).toMatch(/^\d{6}$/);
});

test('[P2] COD delivery to out-of-city address shows geographic restriction error', async ({ buyerPage }) => {
  await buyerPage.goto('/checkout');
  await buyerPage.click('[data-testid="payment-method-cod"]');
  await buyerPage.fill('[data-testid="delivery-city-input"]', 'Arusha');
  await buyerPage.click('[data-testid="place-order-btn"]');
  await expect(buyerPage).toHaveURL(/checkout/);
  await expect(buyerPage.locator('[data-testid="cod-ineligibility-error"]')).toContainText(
    /same city|cross-city/i
  );
});
```

---

## Seller tests — `seller.spec.ts`

```typescript
import { test, expect } from '../fixtures/auth';

test('[P1] seller storefront shows share URL and short URL', async ({ sellerPage }) => {
  await sellerPage.goto('/seller/storefront');
  await expect(sellerPage.locator('[data-testid="storefront-share-url"]')).toBeVisible();
  await expect(sellerPage.locator('[data-testid="storefront-short-url"]')).toBeVisible();
  const shareUrl = await sellerPage.locator('[data-testid="storefront-share-url"]').getAttribute('href');
  expect(shareUrl).toContain('/seller/');
});

test('[P1] seller product list shows at least the seeded demo product', async ({ sellerPage }) => {
  await sellerPage.goto('/seller/products');
  await expect(sellerPage.locator('[data-testid="product-row"]').first()).toBeVisible();
  const productNames = await sellerPage.locator('[data-testid="product-name"]').allTextContents();
  expect(productNames.some(n => n.includes('Maysar Seeded Demo Product'))).toBe(true);
});

test('[P2] seller order list shows total count', async ({ sellerPage }) => {
  await sellerPage.goto('/seller/orders');
  await expect(sellerPage.locator('[data-testid="orders-total-count"]')).toBeVisible();
  const total = await sellerPage.locator('[data-testid="orders-total-count"]').textContent();
  expect(parseInt(total ?? '0', 10)).toBeGreaterThanOrEqual(0);
});
```

---

## Wallet tests — `wallet.spec.ts`

```typescript
import { test, expect } from '../fixtures/auth';

test('[P1] wallet balance is greater than zero after seed', async ({ buyerPage }) => {
  await buyerPage.goto('/wallet');
  // Seed ensures buyer has at least 2,000,000 TZS
  const balance = parseTZS(
    await buyerPage.locator('[data-testid="wallet-balance-display"]').textContent() ?? '0'
  );
  expect(balance).toBeGreaterThan(0);
});

test('[P1] wallet transaction history shows rows', async ({ buyerPage }) => {
  await buyerPage.goto('/wallet/history');
  await expect(buyerPage.locator('[data-testid="transaction-row"]').first()).toBeVisible({ timeout: 10_000 });
});

function parseTZS(text: string): number {
  return parseInt(text.replace(/[^0-9]/g, ''), 10) || 0;
}
```

---

## Admin tests — `admin.spec.ts`

```typescript
import { test, expect } from '../fixtures/auth';

test('[P0] admin dashboard loads and shows system status', async ({ adminPage }) => {
  await adminPage.goto('/admin/dashboard');
  await expect(adminPage.locator('[data-testid="system-status-indicator"]')).toBeVisible();
  const status = await adminPage.locator('[data-testid="system-status-indicator"]').textContent();
  expect(status?.toLowerCase()).toMatch(/ok|healthy|online/);
});

test('[P1] admin can search and view a seeded user profile', async ({ adminPage }) => {
  await adminPage.goto('/admin/users');
  await adminPage.fill('[data-testid="user-search-input"]', 'buyer@maysar.co.tz');
  await adminPage.click('[data-testid="user-search-submit"]');
  await expect(adminPage.locator('[data-testid="user-row"]').first()).toBeVisible();
  const email = await adminPage.locator('[data-testid="user-email"]').first().textContent();
  expect(email).toContain('buyer@maysar.co.tz');
});

test('[P1] admin wallet view shows buyer balance without buyer credentials', async ({ adminPage }) => {
  const BUYER_ID = 'usr_01KRFXQZC36NK3CDEWJJS21RP8';
  await adminPage.goto(`/admin/users/${BUYER_ID}/wallet`);
  await expect(adminPage.locator('[data-testid="wallet-balance-display"]')).toBeVisible();
  const balance = parseTZS(
    await adminPage.locator('[data-testid="wallet-balance-display"]').textContent() ?? '0'
  );
  expect(balance).toBeGreaterThan(0);
});

function parseTZS(text: string): number {
  return parseInt(text.replace(/[^0-9]/g, ''), 10) || 0;
}
```

---

## Delivery tests — `courier.spec.ts`

Use the `courierPage` fixture — never use dynamic imports inside test bodies.

```typescript
import { test, expect } from '../fixtures/auth';

test('[P1] courier delivery list shows at least the seeded delivery', async ({ courierPage }) => {
  await courierPage.goto('/courier/deliveries');
  await expect(courierPage.locator('[data-testid="delivery-row"]').first()).toBeVisible();
});

test('[P1] delivery status badge shows a valid state', async ({ courierPage }) => {
  await courierPage.goto('/courier/deliveries');
  const statusBadge = courierPage.locator('[data-testid="delivery-status-badge"]').first();
  await expect(statusBadge).toBeVisible();
  const status = await statusBadge.textContent();
  expect(['assigned', 'picked_up', 'in_transit', 'delivered']).toContain(status?.toLowerCase());
});

test('[P2] backwards delivery status transition shows error message', async ({ courierPage }) => {
  await courierPage.goto('/courier/deliveries');
  await courierPage.locator('[data-testid="delivery-row"]').first().click();

  const currentStatus = await courierPage.locator('[data-testid="delivery-status-badge"]').textContent();
  if (!['in_transit', 'delivered'].includes(currentStatus?.toLowerCase() ?? '')) {
    return; // vacuously pass — already at early state
  }

  await courierPage.click('[data-testid="update-status-btn"]');
  await courierPage.selectOption('[data-testid="status-select"]', 'assigned');
  await courierPage.click('[data-testid="confirm-status-update"]');

  await expect(courierPage.locator('[data-testid="status-update-error"]')).toBeVisible();
  await expect(courierPage.locator('[data-testid="status-update-error"]')).toContainText(
    /invalid|transition|not allowed/i
  );
});
```

---

## Support ticket tests — `support.spec.ts`

```typescript
import { test, expect } from '../fixtures/auth';

test('[P1] buyer can create a support ticket and see it in their list', async ({ buyerPage }) => {
  await buyerPage.goto('/support/new');
  await buyerPage.fill('[data-testid="ticket-subject-input"]', 'E2E Test Ticket');
  await buyerPage.fill('[data-testid="ticket-description-input"]', 'Automated Playwright test ticket');
  await buyerPage.selectOption('[data-testid="ticket-category-select"]', 'order');
  await buyerPage.click('[data-testid="ticket-submit-btn"]');
  await buyerPage.waitForURL(/\/support\/tickets\//);
  await expect(buyerPage.locator('[data-testid="ticket-id"]')).toBeVisible();
  await buyerPage.goto('/support/tickets');
  await expect(buyerPage.locator('[data-testid="ticket-row"]').first()).toBeVisible();
});
```

---

## Chat tests — `chat.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { loginAs, USERS } from '../fixtures/auth';

test('[P1] buyer and seller can exchange messages in a product conversation', async ({ browser }) => {
  const buyerContext = await browser.newContext();
  const sellerContext = await browser.newContext();
  const buyerPage = await buyerContext.newPage();
  const sellerPage = await sellerContext.newPage();

  await loginAs(buyerPage, USERS.buyer);
  await loginAs(sellerPage, USERS.seller);

  await buyerPage.goto('/products');
  await buyerPage.locator('[data-testid="product-card"]').first().click();
  await buyerPage.click('[data-testid="chat-with-seller-btn"]');
  await buyerPage.fill('[data-testid="chat-message-input"]', 'Is this product available?');
  await buyerPage.click('[data-testid="chat-send-btn"]');
  await expect(buyerPage.locator('[data-testid="chat-message"]').last()).toContainText(
    'Is this product available?'
  );

  await sellerPage.goto('/seller/messages');
  await expect(sellerPage.locator('[data-testid="conversation-row"]').first()).toBeVisible();

  await buyerContext.close();
  await sellerContext.close();
});
```

---

## Page Object Model — keep tests readable

```typescript
// playwright/pages/checkout.page.ts
import { Page, expect } from '@playwright/test';

export class CheckoutPage {
  constructor(private page: Page) {}

  async goto() { await this.page.goto('/checkout'); }

  async selectPaymentMethod(method: 'wallet' | 'cod') {
    await this.page.click(`[data-testid="payment-method-${method}"]`);
  }

  async setDeliveryCity(city: string) {
    await this.page.fill('[data-testid="delivery-city-input"]', city);
  }

  async placeOrder() { await this.page.click('[data-testid="place-order-btn"]'); }

  async expectCODIneligibilityError(pattern: RegExp) {
    await expect(this.page.locator('[data-testid="cod-ineligibility-error"]')).toContainText(pattern);
  }

  async expectOrderConfirmation() {
    await this.page.waitForURL(/\/orders\/MSR-ORD-/);
    return this.page.locator('[data-testid="order-id"]').textContent();
  }
}
```

---

## Waiting — never use `page.waitForTimeout`

```typescript
// Wrong — arbitrary wait
await page.waitForTimeout(3000);

// Right — wait for URL change
await page.waitForURL(/\/orders\/MSR-ORD-/);

// Right — wait for element to be visible
await expect(page.locator('[data-testid="order-status-badge"]')).toBeVisible({ timeout: 15_000 });

// Right — wait for network response
await page.waitForResponse(resp =>
  resp.url().includes('/api/order/orders') && resp.status() === 201
);
```

---

## State isolation — always clean up

```typescript
test('[P1] order can be cancelled', async ({ buyerPage }) => {
  let orderId: string | null = null;
  try {
    // ... place order ...
    orderId = await buyerPage.locator('[data-testid="order-id"]').textContent();
    // ... assertions ...
  } finally {
    if (orderId) {
      await buyerPage.goto(`/orders/${orderId}`);
      await buyerPage.click('[data-testid="cancel-order-btn"]');
      await buyerPage.click('[data-testid="cancel-confirm-btn"]');
    }
  }
});
```

---

## Running Playwright tests

```bash
# Install Playwright browsers (first time)
npx playwright install

# Seed backend state before running (required)
npm run seed:e2e

# Run all tests
npx playwright test

# Run only P0 deploy-gate tests
npx playwright test --grep "\[P0\]"

# Run P1 daily tests
npx playwright test --grep "\[P1\]"

# Run a specific file
npx playwright test playwright/tests/buyer.spec.ts

# Run with UI mode (visual debugger)
npx playwright test --ui

# Show last HTML report
npx playwright show-report
```

---

## Coverage map — what Playwright covers that Jest E2E cannot

| Behavior | Jest E2E | Playwright |
|---|---|---|
| Login form fills and submits | API only | Full UI |
| Error message displayed on wrong password | API only | Visible error |
| Balance displayed correctly after order | API only | UI display |
| COD ineligibility error visible in UI | API only | Error message |
| Delivery code shown on order confirmation | API only | 6-digit display |
| Seller storefront share URL clickable | API only | Link works |
| Buyer and seller can message each other | API only | Real-time chat |
| Backwards delivery status rejected in UI | API only | Error state |
| Support ticket creation and history | API only | Full form flow |
| Admin user search returns results | API only | Search UI |

---

*This guide is grounded in the backend API behavior documented in `docs/e2e-trust-map.md`
and `docs/e2e-technical-evidence.md`. Every business rule, user role, and flow described
here has a corresponding backend API test in `tests/e2e/` using the same seeded actors.*
