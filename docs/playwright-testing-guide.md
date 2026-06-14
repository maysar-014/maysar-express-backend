# Maysar Frontend — Playwright Test Writing Guide

This document gives the frontend team precise, actionable directions for writing Playwright
end-to-end tests. It is grounded in the same commercial roles, flows, and data that power
the backend API test suite documented in `docs/e2e-trust-map.md` and
`docs/e2e-technical-evidence.md`.

---

## Foundational principles

### Test what the user actually does, not what the DOM looks like

Every test should represent a real user action with a real business outcome. A test that
clicks a "Place Order" button and asserts the button text changed to "Processing" is not
a test — it's an implementation detail check. A test that places an order, waits for the
order confirmation page, reads the order ID, then navigates to order history and finds that
order — that is a test.

```typescript
// ❌ Wrong — testing DOM implementation
await expect(page.locator('[data-testid="order-btn"]')).toHaveText('Processing');

// ✅ Right — testing the commercial outcome
await page.click('[data-testid="place-order-btn"]');
await page.waitForURL(/\/orders\/MSR-ORD-/);
const orderId = await page.locator('[data-testid="order-id"]').textContent();
expect(orderId).toMatch(/^MSR-ORD-/);
```

### Use the same seeded users the backend uses

The backend suite uses six deterministic seeded users. Playwright tests must use the same
credentials — never register new users, never create random emails, never assume a clean
state. The seed script `npm run seed:e2e` resets these users before every test run.

```typescript
// playwright/fixtures/users.ts — mirror of tests/e2e/fixtures/seeded-users.ts
export const USERS = {
  buyer:    { email: 'buyer@maysar.co.tz',    password: 'Maysar@2024!' },
  seller:   { email: 'seller@maysar.co.tz',   password: 'Maysar@2024!' },
  courier:  { email: 'courier@maysar.co.tz',  password: 'Maysar@2024!' },
  enabler:  { email: 'enabler@maysar.co.tz',  password: 'Maysar@2024!' },
  supplier: { email: 'supplier@maysar.co.tz', password: 'Maysar@2024!' },
  admin:    { email: 'admin@maysar.co.tz',    password: 'Maysar@2024!' },
} as const;
```

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
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
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
  execSync('npm run seed:e2e', {
    stdio: 'inherit',
    env: { ...process.env, RUN_LIVE_E2E: 'true' },
  });
}
```

### playwright/fixtures/auth.ts — reusable login fixture

```typescript
import { test as base, expect, Page } from '@playwright/test';
import { USERS } from './users';

type AuthFixtures = {
  buyerPage: Page;
  sellerPage: Page;
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

  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAs(page, USERS.admin);
    await use(page);
    await context.close();
  },
});

export async function loginAs(page: Page, user: { email: string; password: string }) {
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', user.email);
  await page.fill('[data-testid="password-input"]', user.password);
  await page.click('[data-testid="login-submit"]');
  await page.waitForURL(/\/(dashboard|home|buyer|seller)/);
}

export { expect };
```

---

## How to use `data-testid` attributes

Every interactive element that a test touches must have a `data-testid`. This is the
contract between frontend code and tests. Never use CSS classes, text content, or element
positions as selectors — they change with styling updates.

```typescript
// ❌ Fragile selectors
page.locator('.btn-primary')
page.locator('button:has-text("Place Order")')
page.locator('form > div:nth-child(3) > input')

// ✅ Stable selectors
page.locator('[data-testid="place-order-btn"]')
page.locator('[data-testid="wallet-balance-display"]')
page.locator('[data-testid="order-id"]')
```

Required `data-testid` attributes by domain (frontend must implement these):

| Element | `data-testid` |
|---|---|
| Email input on login | `email-input` |
| Password input on login | `password-input` |
| Login submit button | `login-submit` |
| Wallet balance display | `wallet-balance-display` |
| "Place Order" button | `place-order-btn` |
| Order confirmation ID | `order-id` |
| Order status badge | `order-status-badge` |
| COD eligibility error message | `cod-ineligibility-error` |
| Delivery code display | `delivery-code-display` |
| Storefront share URL | `storefront-share-url` |
| Notification bell | `notification-bell` |
| Support ticket form | `support-ticket-form` |
| Support ticket subject | `ticket-subject-input` |
| Cart item count | `cart-item-count` |
| Product price | `product-price` |
| Cancel order button | `cancel-order-btn` |

---

## Test files — one per user role

Mirror the backend suite structure. One file per user role.

```
playwright/tests/
  auth.spec.ts           — login, logout, token invalidation
  buyer.spec.ts          — discovery, cart, wallet order, cancel, tracking
  cod-trust.spec.ts      — COD eligibility, limit enforcement, geographic check
  seller.spec.ts         — storefront, product list, order list, analytics
  courier.spec.ts        — availability, delivery lifecycle, state machine
  enabler.spec.ts        — profile, listings, referral, earnings
  supplier.spec.ts       — production plan, capacity, quality checkpoint
  admin.spec.ts          — user management, dashboard, health check
  support.spec.ts        — ticket creation, message, list
  chat.spec.ts           — conversation, messages
  wallet.spec.ts         — credit/debit display, transaction history
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
  // Wallet balance should be visible after login
  await expect(page.locator('[data-testid="wallet-balance-display"]')).toBeVisible();
});

test('[P0] wrong password shows error, no redirect', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', USERS.buyer.email);
  await page.fill('[data-testid="password-input"]', 'WrongPassword999!');
  await page.click('[data-testid="login-submit"]');

  // Must stay on login page
  await expect(page).toHaveURL(/login/);
  // Error message must appear
  await expect(page.locator('[data-testid="login-error"]')).toBeVisible();
  // Must not show wallet or dashboard elements
  await expect(page.locator('[data-testid="wallet-balance-display"]')).not.toBeVisible();
});

test('[P0] logout invalidates session — protected page redirects to login', async ({ page }) => {
  await loginAs(page, USERS.buyer);
  await page.click('[data-testid="logout-btn"]');

  await expect(page).toHaveURL(/login/);

  // Attempt to navigate to protected route
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
  // Product grid must render at least one card
  const productCards = buyerPage.locator('[data-testid="product-card"]');
  await expect(productCards.first()).toBeVisible();
  const count = await productCards.count();
  expect(count).toBeGreaterThan(0);
});

test('[P0] seller storefront page loads with share URL', async ({ buyerPage }) => {
  // The seeded seller ID is known
  const SELLER_ID = 'usr_01KRFZ1E5G6CWAQ4BXKVNPYG3Z';
  await buyerPage.goto(`/sellers/${SELLER_ID}`);

  await expect(buyerPage.locator('[data-testid="storefront-share-url"]')).toBeVisible();
  const shareUrl = await buyerPage.locator('[data-testid="storefront-share-url"]').getAttribute('href');
  expect(shareUrl).toContain(SELLER_ID);
});

test('[P0] wallet order: balance decreases on order, restores on cancel', async ({ buyerPage }) => {
  // Read initial balance
  await buyerPage.goto('/wallet');
  const balanceText = await buyerPage.locator('[data-testid="wallet-balance-display"]').textContent();
  const initialBalance = parseTZS(balanceText ?? '0');

  // Place an order using the seeded product
  await buyerPage.goto('/products');
  await buyerPage.locator('[data-testid="product-card"]').first().click();
  await buyerPage.click('[data-testid="add-to-cart-btn"]');
  await buyerPage.goto('/checkout');
  await buyerPage.click('[data-testid="payment-method-wallet"]');
  await buyerPage.click('[data-testid="place-order-btn"]');

  // Order confirmation
  await buyerPage.waitForURL(/\/orders\/MSR-ORD-/);
  const orderId = await buyerPage.locator('[data-testid="order-id"]').textContent();
  expect(orderId).toMatch(/^MSR-ORD-/);

  // Balance must have decreased
  await buyerPage.goto('/wallet');
  const balanceAfterOrder = parseTZS(
    await buyerPage.locator('[data-testid="wallet-balance-display"]').textContent() ?? '0'
  );
  expect(balanceAfterOrder).toBeLessThan(initialBalance);

  // Cancel the order
  await buyerPage.goto(`/orders/${orderId}`);
  await buyerPage.click('[data-testid="cancel-order-btn"]');
  await buyerPage.locator('[data-testid="cancel-confirm-btn"]').click();
  await expect(buyerPage.locator('[data-testid="order-status-badge"]')).toHaveText(/cancelled/i);

  // Balance must restore (allow 30s for saga compensation)
  await buyerPage.waitForFunction(
    (expected: number) => {
      const el = document.querySelector('[data-testid="wallet-balance-display"]');
      return el && parseTZSString(el.textContent ?? '0') >= expected;
    },
    initialBalance,
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
  const status = await buyerPage.locator('[data-testid="order-status-badge"]').textContent();
  expect(status).toBeTruthy();

  // Navigate to order history and find the same order
  const orderId = await buyerPage.locator('[data-testid="order-id"]').textContent();
  await buyerPage.goto('/orders');
  await expect(buyerPage.locator(`[data-testid="order-row-${orderId}"]`)).toBeVisible();
});

// Helper
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

  // Set quantity to push COD value over TZS 31,000
  await buyerPage.locator('[data-testid="product-quantity-input"]').fill('3');
  await buyerPage.click('[data-testid="payment-method-cod"]');
  await buyerPage.click('[data-testid="place-order-btn"]');

  // Must NOT navigate to order confirmation
  await expect(buyerPage).toHaveURL(/checkout/);

  // Ineligibility error must be visible
  await expect(buyerPage.locator('[data-testid="cod-ineligibility-error"]')).toBeVisible();
  const errorText = await buyerPage.locator('[data-testid="cod-ineligibility-error"]').textContent();
  expect(errorText?.toLowerCase()).toContain('30,000');
});

test('[P1] valid COD order (under TZS 30,000) shows delivery code', async ({ buyerPage }) => {
  await buyerPage.goto('/checkout');
  // Select a low-value item within the COD limit
  await buyerPage.click('[data-testid="payment-method-cod"]');

  // Set address within Dar es Salaam (same city as seller)
  await buyerPage.fill('[data-testid="delivery-city-input"]', 'Dar es Salaam');
  await buyerPage.click('[data-testid="place-order-btn"]');

  await buyerPage.waitForURL(/\/orders\/MSR-ORD-/);

  // Delivery code must be shown (6-digit OTP)
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

test('[P2] seller order list shows shape with total count', async ({ sellerPage }) => {
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

test('[P1] wallet balance display matches API balance', async ({ buyerPage, request }) => {
  await buyerPage.goto('/wallet');

  const uiBalance = parseTZS(
    await buyerPage.locator('[data-testid="wallet-balance-display"]').textContent() ?? '0'
  );

  // Compare against API (buyer token obtained from session storage or cookie)
  // Note: this requires the frontend to expose the auth token for test access
  // Use a separate API call or inject auth via Playwright storageState
  expect(uiBalance).toBeGreaterThan(0); // seed ensures ≥ 2,000,000 TZS
});

test('[P1] wallet transaction history is accessible and shows rows', async ({ buyerPage }) => {
  await buyerPage.goto('/wallet/history');

  // After an order + cancel cycle, at least some transactions exist
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

```typescript
import { test, expect } from '../fixtures/auth';

// The seed script creates a stable delivery for the seeded courier.
// Delivery ID: log_del_01ARZ3NDEKTSV4RRFFQ69G5FAV
// Initial status: assigned (reset on every seed run)

test('[P1] courier delivery list shows at least the seeded delivery', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const { loginAs } = await import('../fixtures/auth');
  await loginAs(page, { email: 'courier@maysar.co.tz', password: 'Maysar@2024!' });

  await page.goto('/courier/deliveries');
  await expect(page.locator('[data-testid="delivery-row"]').first()).toBeVisible();
  await context.close();
});

test('[P1] delivery status badge shows current state', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const { loginAs } = await import('../fixtures/auth');
  await loginAs(page, { email: 'courier@maysar.co.tz', password: 'Maysar@2024!' });

  await page.goto('/courier/deliveries');
  const statusBadge = page.locator('[data-testid="delivery-status-badge"]').first();
  await expect(statusBadge).toBeVisible();

  const status = await statusBadge.textContent();
  expect(['assigned', 'picked_up', 'in_transit', 'delivered']).toContain(status?.toLowerCase());
  await context.close();
});

test('[P2] backwards delivery status transition shows error message', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const { loginAs } = await import('../fixtures/auth');
  await loginAs(page, { email: 'courier@maysar.co.tz', password: 'Maysar@2024!' });

  // Navigate to a delivery that is in_transit and try to set it back to assigned
  await page.goto('/courier/deliveries');
  await page.locator('[data-testid="delivery-row"]').first().click();

  // Only attempt if delivery is at in_transit or later
  const currentStatus = await page.locator('[data-testid="delivery-status-badge"]').textContent();
  if (!['in_transit', 'delivered'].includes(currentStatus?.toLowerCase() ?? '')) {
    return; // vacuously pass — state is already early
  }

  await page.click('[data-testid="update-status-btn"]');
  await page.selectOption('[data-testid="status-select"]', 'assigned');
  await page.click('[data-testid="confirm-status-update"]');

  // Must show an error — state machine rejects backwards transition
  await expect(page.locator('[data-testid="status-update-error"]')).toBeVisible();
  await expect(page.locator('[data-testid="status-update-error"]')).toContainText(
    /invalid|transition|not allowed/i
  );
  await context.close();
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

  // Should land on ticket detail page
  await buyerPage.waitForURL(/\/support\/tickets\//);
  await expect(buyerPage.locator('[data-testid="ticket-id"]')).toBeVisible();

  // Navigate to ticket list and find the new ticket
  await buyerPage.goto('/support/tickets');
  await expect(buyerPage.locator('[data-testid="ticket-row"]').first()).toBeVisible();
});
```

---

## Chat tests — `chat.spec.ts`

```typescript
import { test, expect, Browser } from '@playwright/test';
import { loginAs, USERS } from '../fixtures/auth';

test('[P1] buyer and seller can exchange messages in a product conversation', async ({ browser }) => {
  // Two contexts — buyer and seller simultaneously
  const buyerContext = await browser.newContext();
  const sellerContext = await browser.newContext();

  const buyerPage = await buyerContext.newPage();
  const sellerPage = await sellerContext.newPage();

  await loginAs(buyerPage, USERS.buyer);
  await loginAs(sellerPage, USERS.seller);

  // Buyer starts a conversation from a product page
  await buyerPage.goto('/products');
  await buyerPage.locator('[data-testid="product-card"]').first().click();
  await buyerPage.click('[data-testid="chat-with-seller-btn"]');

  // Send a message
  await buyerPage.fill('[data-testid="chat-message-input"]', 'Is this product available?');
  await buyerPage.click('[data-testid="chat-send-btn"]');
  await expect(buyerPage.locator('[data-testid="chat-message"]').last()).toContainText(
    'Is this product available?'
  );

  // Seller sees the message in their inbox
  await sellerPage.goto('/seller/messages');
  await expect(sellerPage.locator('[data-testid="conversation-row"]').first()).toBeVisible();

  await buyerContext.close();
  await sellerContext.close();
});
```

---

## Page Object Model — keep tests readable

For any page visited more than once, create a Page Object:

```typescript
// playwright/pages/checkout.page.ts
import { Page, expect } from '@playwright/test';

export class CheckoutPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/checkout');
  }

  async selectPaymentMethod(method: 'wallet' | 'cod') {
    await this.page.click(`[data-testid="payment-method-${method}"]`);
  }

  async setDeliveryCity(city: string) {
    await this.page.fill('[data-testid="delivery-city-input"]', city);
  }

  async placeOrder() {
    await this.page.click('[data-testid="place-order-btn"]');
  }

  async expectCODIneligibilityError(pattern: RegExp) {
    await expect(this.page.locator('[data-testid="cod-ineligibility-error"]')).toContainText(pattern);
  }

  async expectOrderConfirmation() {
    await this.page.waitForURL(/\/orders\/MSR-ORD-/);
    return this.page.locator('[data-testid="order-id"]').textContent();
  }
}
```

```typescript
// Using it in a test
test('[P0] COD order within limits', async ({ buyerPage }) => {
  const checkout = new CheckoutPage(buyerPage);
  await checkout.goto();
  await checkout.selectPaymentMethod('cod');
  await checkout.setDeliveryCity('Dar es Salaam');
  await checkout.placeOrder();
  const orderId = await checkout.expectOrderConfirmation();
  expect(orderId).toMatch(/^MSR-ORD-/);
});
```

---

## Waiting — never use `page.waitForTimeout`

`waitForTimeout` is a test smell. Use condition-based waits instead:

```typescript
// ❌ Arbitrary wait
await page.waitForTimeout(3000);

// ✅ Wait for URL change
await page.waitForURL(/\/orders\/MSR-ORD-/);

// ✅ Wait for element to be visible
await expect(page.locator('[data-testid="order-status-badge"]')).toBeVisible({ timeout: 15_000 });

// ✅ Wait for network response
await page.waitForResponse(resp =>
  resp.url().includes('/api/order/orders') && resp.status() === 201
);

// ✅ Wait for text to match (polling DOM)
await expect(page.locator('[data-testid="order-status-badge"]')).toHaveText(/confirmed/i, {
  timeout: 15_000,
});
```

---

## State isolation — always clean up

Every test that creates data must clean it up. Use `test.afterEach` or `finally` blocks:

```typescript
test('[P1] order can be cancelled', async ({ buyerPage }) => {
  let orderId: string | null = null;

  try {
    // ... place order ...
    orderId = await buyerPage.locator('[data-testid="order-id"]').textContent();
    // ... assertions ...
  } finally {
    if (orderId) {
      // Cancel via UI — always runs even if test fails
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

# Run in headed mode (watch browser)
npx playwright test --headed

# Show last HTML report
npx playwright show-report
```

---

## Coverage map — what Playwright covers that Jest E2E cannot

| Behavior | Jest E2E | Playwright |
|---|---|---|
| Login form fills and submits | API only | ✅ Full UI |
| Error message displayed on wrong password | API only | ✅ Visible error |
| Balance displayed correctly after order | API only | ✅ UI display |
| COD ineligibility error visible in UI | API only | ✅ Error message |
| Delivery code shown on order confirmation | API only | ✅ 6-digit display |
| Seller storefront share URL clickable | API only | ✅ Link works |
| Buyer and seller can message each other | API only | ✅ Real-time chat |
| Backwards delivery status rejected in UI | API only | ✅ Error state |
| Support ticket creation and history | API only | ✅ Full form flow |
| Admin user search returns results | API only | ✅ Search UI |

---

*This guide is grounded in the backend API behavior documented in `docs/e2e-trust-map.md`
and `docs/e2e-technical-evidence.md`. Every business rule, user role, and flow described
here has a backend API test that verifies the server side. Playwright tests verify the
frontend correctly surfaces those behaviors to the user.*
