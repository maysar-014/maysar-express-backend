# Settings Page — Evidence-Based Design Specification

> A unified, role-aware Settings experience for all Maysar users (buyer, seller, courier, supplier, enabler, admin). The navigation should feel premium: smooth section transitions, clear visual hierarchy, contextual sections that appear and disappear based on the user's role and verification state, and zero dead ends.

---

## 1. Page Architecture

### Navigation Pattern: Left Rail with Scrollable Sections

The Settings page uses a persistent left sidebar (desktop) / collapsible accordion (mobile) with grouped navigation sections. The main content area renders the active section. This pattern mirrors how world-class platforms (Stripe, Shopify, Linear) handle settings — the rail stays visible so users always know where they are, and sections load inline without page transitions.

**Desktop (≥1024px):** Fixed left rail (260px) + content panel. Smooth scroll-to-section on nav click.

**Tablet (768–1023px):** Collapsible left rail that overlays content when expanded, dismisses on section select.

**Mobile (<768px):** Full-width accordion list. Tapping a section expands it inline. Only one section open at a time. A sticky header shows the current section name and a back chevron.

### Section Groups

The navigation is organized into four groups. Each group contains sections that may be visible to all users or gated by role, verification status, or KYC level.

| Group | Sections | Visible To |
|---|---|---|
| **Account** | Profile, Email & Phone, Password, Two-Factor Authentication, Active Sessions, Role & Roles | All authenticated users |
| **Preferences** | Language & Currency, Theme, Notification Preferences, Push Devices | All authenticated users |
| **Business & Identity** | KYC Verification, Business Profile, Payout Methods, COD Reputation | Role-dependent (see below) |
| **Danger Zone** | Deactivate Account, Delete Account, Report Security Issue | All authenticated users |

### Role-Dependent Visibility

| Section | Buyer | Seller | Courier | Supplier | Enabler | Admin |
|---|---|---|---|---|---|---|
| Profile | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Email & Phone | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Password | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Two-Factor Auth | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Active Sessions | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Role & Roles | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (admin sees user management) |
| Language & Currency | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Theme | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Notification Preferences | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Push Devices | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| KYC Verification | — | ✓ | ✓ | ✓ | ✓ | — (admin manages separately) |
| Business Profile | — | ✓ | — | ✓ | — | — |
| Payout Methods | — | ✓ | ✓ | ✓ | ✓ | — |
| COD Reputation | ✓ | — | — | — | — | — |
| Deactivate Account | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Delete Account | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Report Security Issue | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## 2. Section Narratives

### 2.1 Profile

**What it shows:** The user's personal identity fields — first name, last name, date of birth, profile picture, and public code (read-only display field, e.g. `MYS-SLR-01`).

**Data source:** `GET /api/user/profile` returns `{ firstName, lastName, fullName, dateOfBirth, publicCode, profilePicture, role, status, email, phoneNumber, emailVerified, phoneVerified }`.

**What the user can edit:** First name, last name, date of birth, profile picture. Email is not editable here (it has its own section). Phone number redirects to the Email & Phone section.

**Save behavior:** `PUT /api/user/profile` with `{ firstName?, lastName?, dateOfBirth?, profilePicture? }`. The endpoint rejects updates when the user's status is `suspended`, `deactivated`, or `inactive`. `pending_verification` and `locked` users can still update their profile. Minimum age is 13 if `dateOfBirth` is provided.

**Empty/error states:** If the profile fetch fails, show a retry card with a friendly message. If the save fails due to validation (e.g. name too short), inline field errors appear below the relevant input. If the save fails due to account status (suspended), show a non-dismissable banner explaining the account must be reactivated first.

**Premium touches:**
- Avatar upload with drag-and-drop zone and circular crop preview
- Full name preview that updates live as the user types first/last name
- Public code displayed as a monospace badge with a copy-to-clipboard button

### 2.2 Email & Phone

**What it shows:** Current email address (read-only, with a "verified" or "unverified" badge), current phone number (editable, with a "verified" or "unverified" badge).

**Email:** Email cannot be changed through the profile update endpoint. The system explicitly rejects email changes with `{ allowed: false, reason: 'Email updates not allowed through profile update' }`. This section should display the email as read-only with a note: "Contact support to change your email address."

**Phone:** The user can update their phone number. Changing the phone number resets `isPhoneVerified` to `false` and triggers a new OTP flow.

**OTP flow:**
1. User enters a new phone number (E.164 format, Tanzanian mobile: `+255[67]XXXXXXXX`)
2. `POST /api/auth/phone/send-otp` sends an OTP via Firebase (rate limited: 5 requests per 15 minutes)
3. User enters the 6-digit OTP
4. `POST /api/auth/phone/verify-otp` verifies the Firebase ID token and sets `isPhoneVerified = true` (rate limited: 10 requests per 15 minutes)

**Premium touches:**
- Phone input with country code selector (defaulting to Tanzania +255)
- Inline OTP entry with 6 separate digit boxes, auto-advancing
- Resend OTP button with a countdown timer (disabled for 60 seconds after each send)
- Visual badge transitions: unverified (amber) → verified (green) with a subtle animation

### 2.3 Password

**What it shows:** A simple change-password form — current password, new password, confirm new password.

**Endpoints:**
- Self-change: `POST /api/user/:id/password` with `{ currentPassword, newPassword }`
- Reset flow (if forgot): `POST /api/auth/forgot-password` (sends reset link) → `POST /api/auth/reset-password` (with token + new password)

**Business rules:** Passwords must be at least 8 characters. After a successful password change, all existing sessions are invalidated — the user is logged out and must re-authenticate. Password changes are blocked for `suspended`, `deactivated`, and `inactive` users.

**Premium touches:**
- Password strength meter that updates in real time (weak / fair / strong / very strong)
- Show/hide toggle for each password field
- Warning callout: "You'll be logged out of all devices after changing your password"
- Confirm button is disabled until all three fields are valid and new === confirm

### 2.4 Two-Factor Authentication

**What it shows:** Current 2FA status (enabled/disabled), and the setup or disable flow.

**Setup flow:**
1. User initiates setup → `POST /api/user/:id/2fa/setup` returns a QR code URL and secret
2. User scans the QR code with an authenticator app (Google Authenticator, Authy)
3. User enters a 6-digit TOTP code → `POST /api/auth/2fa/verify` confirms the setup
4. User enters password + TOTP code → `POST /api/auth/2fa/enable` enables 2FA

**Disable flow:** `POST /api/auth/2fa/disable` with `{ password }` — requires the user's password as confirmation.

**2FA backup codes:** 10 single-use codes are generated at setup. Each is 10 hex characters displayed in groups (e.g. `ABCD-1234-EF`). The user should be prompted to save these codes securely. Codes are consumed on use.

**Premium touches:**
- QR code rendered in a clean card with the secret key below it in monospace (for manual entry)
- Step-by-step wizard with progress indicator (1. Scan → 2. Verify → 3. Enable → 4. Save backup codes)
- Backup codes displayed in a downloadable text file and printable format
- Status badge: "2FA Enabled" (green shield icon) vs "2FA Not Enabled" (amber warning icon)
- Disable flow requires password re-entry with a confirmation modal: "Are you sure? Disabling 2FA reduces your account security."

### 2.5 Active Sessions

**What it shows:** A list of the user's active sessions — device info, IP address, last activity, and role context (which role the session was created under).

**Data source:** The auth service tracks sessions with `userId`, `token`, `ipAddress`, `userAgent`, `expiresAt`, and `createdAt`. Max 5 sessions per standard user, 10 for system role. Session TTL is 1 hour with a 5-minute refresh threshold.

**Actions:** The user can terminate individual sessions (logout from a specific device) or terminate all sessions. Admin users can view and terminate any user's sessions via `GET /api/auth/admin/users/:userId/sessions` and `DELETE /api/auth/admin/users/:userId/sessions`.

**Premium touches:**
- Session cards with device type icon (phone, laptop, tablet) parsed from user-agent
- "Current session" badge on the active session
- "Terminate" button per session and "Terminate All" button at the bottom
- Confirmation modal before termination: "This will log you out of [device]. Continue?"

### 2.6 Role & Roles

**What it shows:** The user's current active role, all assigned roles, and the ability to switch roles or request a new role.

**Role switching:** `POST /api/auth/switch-role` with `{ role, deviceInfo? }`. The requested role must be in the user's assigned roles list. On success, a new session is created with the selected role.

**Role requests:** A user can request a new role if it's not already assigned. Requestable roles: `seller`, `supplier`, `courier`, `enabler`. `POST /api/auth/role-requests` with `{ role, justification? }`. If a pending request already exists for the same role, the system returns 409 with `ROLE_REQUEST_EXISTS`.

**Viewing requests:** `GET /api/auth/requests` returns the user's role request history (status: PENDING, APPROVED, REJECTED, WITHDRAWN).

**Role transition rules (admin-enforced, not self-service):**

| From | To |
|---|---|
| buyer | seller, supplier |
| seller | buyer, supplier |
| supplier | seller |
| courier | — (locked) |
| enabler | — (locked) |

**Premium touches:**
- Role cards with icons (buyer = shopping bag, seller = storefront, courier = delivery bike, supplier = factory, enabler = handshake, admin = shield)
- Active role highlighted with a "Current" badge
- Role switch is a one-tap action with a smooth transition animation — no page reload
- Role request form with a justification textarea (10–1000 chars), submit button disabled until valid
- Pending requests shown as a timeline with status badges (amber = pending, green = approved, red = rejected)
- If a role is locked (courier, enabler cannot transition), show a subtle lock icon and tooltip: "This role cannot be changed. Contact support if you need to switch."

### 2.7 Language & Currency

**What it shows:** Preferred language selector and preferred currency selector.

**Data source:** `UserPreferences` stored on the user entity. Languages: `en`, `sw`, `fr`. Currency: ISO 4217 codes (default `TZS`).

**Save behavior:** Updated via `PUT /api/user/profile` with `{ preferredLanguage, preferredCurrency }`.

**Premium touches:**
- Language selector with flag icons (Tanzania flag for Swahili, UK flag for English, France flag for French)
- Currency selector as a dropdown with currency code + symbol preview
- Changes apply immediately on save with a toast: "Preferences updated"

### 2.8 Theme

**What it shows:** Theme selector — light, dark, system.

**Data source:** `UserPreferences.theme` field (`light`, `dark`, `system`).

**Premium touches:**
- Three-card selector with live preview thumbnails (light mode, dark mode, auto)
- "System" option follows the OS preference via `prefers-color-scheme`
- Theme applies instantly without a page reload — CSS variables swap with a smooth transition

### 2.9 Notification Preferences

**What it shows:** Per-channel notification toggles and frequency settings.

**Data source:** `GET /api/notification/preferences/:userId` returns the current preferences per channel. Channels: `email`, `sms`, `push`, `in-app`. Frequency options: `realtime`, `hourly`, `daily`, `weekly`.

**Save behavior:** `PUT /api/notification/preferences/:userId` with `{ channel, enabled?, frequency? }`. Opt-out of a channel via `POST /api/notification/preferences/:userId/opt-out` with `{ channel }`.

**Premium touches:**
- Channel cards with icons (email, SMS, push notification, in-app)
- Toggle switches with smooth on/off animation
- Frequency selector as a segmented control (Realtime | Hourly | Daily | Weekly)
- "Opt out of all" quick action at the bottom with a confirmation modal
- Changes save automatically on toggle (no save button needed) with a subtle "Saved" indicator

### 2.10 Push Devices

**What it shows:** Registered push notification devices (browser push, mobile app).

**Data source:** Push tokens registered via `POST /api/notification/push-tokens` and unregistered via `DELETE /api/notification/push-tokens/:token`.

**Premium touches:**
- Device list with device name, browser/app type, and last active timestamp
- "Register this device" button (if not already registered)
- "Remove" button per device with confirmation: "This device will stop receiving push notifications."

### 2.11 KYC Verification (Seller, Courier, Supplier, Enabler)

**What it shows:** Current KYC status, verification level, submitted documents, and limits.

**Data source:** User entity fields: `kycStatus` (none, pending, verified, rejected), `kycLevel` (0–3), `kycSubmittedAt`, `kycVerifiedAt`, `kycData` (full name, national ID, business name, documents), `kycNationalId`, `kycLimitMaxListings`, `kycLimitMaxTransactions`, `kycLimitMaxEarnings`.

**KYC gating:** Payouts require `requireKycLevel(2)`. Enabler listing capacity is gated by KYC level.

**Premium touches:**
- Progress stepper showing KYC levels: Level 0 (unverified) → Level 1 (basic) → Level 2 (identity verified) → Level 3 (business verified)
- Current level highlighted with a checkmark
- Limits displayed as cards: "Max listings: {n}", "Max transactions: {n}", "Max earnings: {amount}"
- "Submit verification" button (when status is `none` or `rejected`)
- Document upload area with drag-and-drop, file preview, and upload progress
- Rejection reason shown in a red callout if `kycStatus === 'rejected'`

### 2.12 Business Profile (Seller, Supplier)

**What it shows:** Business registration details — business name, type, registration number, tax ID, industry tags, description, website, email, phone, address, verification status, compliance status.

**Data source:** Business Registry service. Business model fields: `name`, `businessType`, `registrationNumber` (unique), `taxId` (unique, optional), `status` (PENDING, ACTIVE, etc.), `verificationStatus` (UNVERIFIED, VERIFIED), `complianceStatus` (UNDER_REVIEW, COMPLIANT), `ownerId`, `description`, `industry[]`, `website`, `email`, `phoneNumber`, `addresses[]`, `documents[]`.

**Actions:** Register a business, update business details, upload compliance documents, view compliance records.

**Premium touches:**
- Business profile card with verification badge (verified = green checkmark, unverified = amber clock)
- Industry tags as removable chips with an "Add industry" autocomplete input
- Business address form using the Tanzania geographic hierarchy (ward → district → region) with optional legacy fields
- Compliance documents section with upload, preview, and verification status per document
- "Update" button with inline save and toast confirmation

### 2.13 Payout Methods (Seller, Courier, Supplier, Enabler)

**What it shows:** Configured payout methods and payout history.

**Data source:** Payout service. Payout methods: `BANK_TRANSFER`, `MOBILE_MONEY`, `WALLET`. Bank details: `bankName`, `bankCode`, `accountNumber`, `accountName`, `branchCode`. Mobile money details: `provider`, `phoneNumber`, `accountName`.

**Payout history:** `GET /api/payout/user/:userId` returns the user's payout records. `GET /api/payout/:id` returns a specific payout. `POST /api/payout/:id/cancel` cancels a pending payout.

**Business rules:** Payouts require KYC level 2. Eligible roles: seller, supplier, courier, enabler, system. Wallet balance must cover the payout amount.

**Premium touches:**
- Payout method tabs: "Bank Transfer" and "Mobile Money"
- Bank details form with Tanzanian bank selector (autocomplete with bank codes)
- Mobile money form with provider selector (Vodacom M-Pesa, Airtel Money, Halotel, Tigo Pesa)
- Saved methods displayed as cards with a "Default" badge and "Edit" / "Remove" actions
- Payout history table with date, amount, method, status, and actions (view, cancel if pending)
- "Initiate Payout" button that opens a modal with amount input and method selection
- Wallet balance shown as context: "Available balance: TZS {amount}"

### 2.14 COD Reputation (Buyer only)

**What it shows:** The buyer's Cash-on-Delivery trust score and eligibility.

**Data source:** `GET /api/user/:userId/cod-reputation` returns the COD reputation data.

**COD reputation engine rules:**

| Threshold | Effect |
|---|---|
| Score < 10 | `permanentlyDisabled = true` |
| Score < 30 | `suspendedUntil = now + 30 days` |
| Score < 50 | COD ineligible (MIN_ELIGIBILITY_SCORE) |
| `successfulOrders < 3` | COD ineligible (MIN_SUCCESSFUL_ORDERS) |

**Score changes:**
- First successful delivery: +25 (SUCCESS_BONUS 5 + INITIAL_UNLOCK_BONUS 20)
- Subsequent successful delivery: +5
- Delivery refused: -10
- Fraud detected: -20
- Manual penalty: -10

**Premium touches:**
- Circular score gauge (0–100) with color zones: red (0–29), amber (30–49), green (50–100)
- "COD Eligible" / "COD Ineligible" badge with explanation tooltip
- Score history timeline showing each score change event with date, event type, and delta
- If suspended: show the suspension end date and a countdown
- If permanently disabled: show a red card with "Contact support to appeal"

### 2.15 Deactivate Account

**What it shows:** A warning and confirmation flow for account deactivation.

**Business rules:** Deactivation sets the user status to `deactivated`. A deactivated account cannot be reactivated (`DEACTIVATED → ACTIVE` is invalid). The user must confirm they understand this is irreversible.

**Premium touches:**
- Full-width red-bordered card with a clear warning: "Deactivating your account is permanent. You will not be able to log in or recover your account."
- Checkbox: "I understand this action cannot be undone"
- Confirm button disabled until checkbox is checked
- Modal confirmation with password re-entry: "Enter your password to confirm deactivation"

### 2.16 Delete Account

**What it shows:** Account deletion flow with PII anonymization.

**Business rules:** Only `SYSTEM` role can delete users. `ACTIVE` users cannot be deleted (must deactivate first). Users with activity in the last 90 days cannot be deleted. Deletion triggers a PII anonymization saga.

**Premium touches:**
- Explainer card: "Deleting your account permanently removes your personal data. This action cannot be undone."
- Data preview: what will be anonymized (name, email, phone, addresses, KYC data)
- Two-step confirmation: checkbox + password re-entry
- If the user is active or has recent activity, the delete button is disabled with a tooltip: "Deactivate your account first, then wait 90 days before deletion."

### 2.17 Report Security Issue

**What it shows:** A form to report suspicious activity or security breaches.

**Data source:** `POST /api/auth/report-suspicious` with `{ activity, details? }`. Security breach reporting via `POST /api/user/security/breaches/report` with `{ breachType, severity, details }`. Breach types: `suspicious_login`, `multiple_failed_attempts`, `unusual_activity`, `location_anomaly`. Severity levels: `low`, `medium`, `high`, `critical`.

**Premium touches:**
- Form card with breach type selector (dropdown), severity selector (color-coded: low=blue, medium=amber, high=orange, critical=red), and a details textarea
- "Submit Report" button with loading state
- Success toast: "Your report has been submitted. Our security team will review it."
- Link to view past reports (if any exist)

---

## 3. Admin Settings (Admin role only)

When an admin user is in Settings, an additional group appears in the left rail: **Administration**.

### 3.1 User Management

**What it shows:** User search and management interface.

**Endpoints:**
- `GET /api/auth/admin/users/search?query=&role=&status=&limit=&offset=` — search users by name, email, role, or status
- `GET /api/auth/admin/users/:userId` — get user details
- `PATCH /api/auth/admin/users/:userId/status` — update user status (active, suspended, deactivated, locked)
- `PATCH /api/auth/admin/users/:userId/role` — update user role (buyer, seller, supplier, courier, enabler)
- `GET /api/auth/admin/users/:userId/sessions` — view any user's sessions
- `DELETE /api/auth/admin/users/:userId/sessions` — terminate any user's sessions

**Premium touches:**
- Search bar with role and status filter dropdowns
- User results table: name, email, role, status, last login, actions (view, suspend, change role)
- User detail drawer: slides in from the right, showing full user profile + admin actions
- Status change modal with reason field (optional but recommended)
- Role change modal showing valid transitions (prevents invalid transitions like courier → enabler)

---

## 4. Verified Capabilities vs. Proposed Enhancements

### Verified (backed by existing endpoints and data)

| Capability | Evidence |
|---|---|
| Profile update (firstName, lastName, DOB, picture) | `PUT /api/user/profile` — user-service |
| Email display (read-only) | Profile update explicitly rejects email changes |
| Phone number update + OTP verification | `POST /api/auth/phone/send-otp`, `POST /api/auth/phone/verify-otp` — auth-service |
| Password change | `POST /api/user/:id/password` — user-service |
| Password reset flow | `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` — auth-service |
| 2FA setup/verify/enable/disable | `POST /api/auth/2fa/*` — auth-service, `POST /api/user/:id/2fa/setup` — user-service |
| Active sessions (view + terminate) | Auth-service session model, admin routes for cross-user |
| Role switching | `POST /api/auth/switch-role` — auth-service |
| Role requests | `POST /api/auth/role-requests`, `GET /api/auth/role-requests` — auth-service |
| Language + currency preferences | `UserPreferences`, `PUT /api/user/profile` — user-service |
| Theme (light/dark/system) | `UserPreferences.theme` — user-service |
| Notification preferences (per channel + frequency) | `GET/PUT /api/notification/preferences/:userId` — notification-service |
| Push device registration | `POST/DELETE /api/notification/push-tokens` — notification-service |
| KYC status + limits | User entity KYC fields, `requireKycLevel` middleware — KYC service |
| Business profile (register, update, verify) | Business Registry service routes |
| Payout methods + history | `POST /api/payout`, `GET /api/payout/user/:userId` — payout-service |
| COD reputation | `GET /api/user/:userId/cod-reputation` — user-service |
| Account deactivation | User status transition to `deactivated` |
| Account deletion (PII anonymization) | `DELETE /api/user/:id` — user-service, triggers saga |
| Security breach reporting | `POST /api/user/security/breaches/report` — user-service |
| Admin user management | `GET /api/auth/admin/users/*` — auth-service admin routes |

### Proposed enhancements (require additional capabilities)

| Enhancement | What's needed |
|---|---|
| Email change flow | No endpoint exists to change email. Would need a verification flow similar to phone OTP. Currently must contact support. |
| Session device naming | Sessions store `userAgent` but not a user-friendly device name. Would need a `deviceName` field on session creation. |
| Login alerts (email on new device) | No endpoint for configuring login alerts. Would need a notification preference type for security alerts. |
| Account activity log | No endpoint returns a unified activity log. Audit logs exist (`AuditLog` model) but are admin-scoped, not user-facing. |
| Connected accounts (Google OAuth) | Google OAuth exists (`google-oauth.controller.ts`) but no settings UI for managing connected accounts. Would need a "Connected Accounts" section. |
| Data export (GDPR) | `exportUserData` exists on the repository interface but is not exposed as a user-facing endpoint. Would need a route + download flow. |
| Wallet default payout method | No "default method" concept exists in the payout service. Would need a `isDefault` flag on saved payout methods. |

---

## 5. Interaction & State Design

### Loading States
- Each section loads independently with a skeleton placeholder matching the section's layout
- The left rail renders immediately (static content) — only the right panel loads data
- Save buttons show a loading spinner and disable during submission

### Error States
- Network errors: full-section error card with retry button
- Validation errors: inline field errors with red border + helper text
- Permission errors (403): section replaced with "You don't have permission to access this section"
- Account status errors (suspended/deactivated): non-dismissable banner at the top of the Settings page

### Success States
- Save success: toast notification "Saved" with green checkmark, auto-dismiss after 3 seconds
- Toggle success (notifications, theme): subtle "Saved" indicator that fades in/out
- Destructive actions: success toast + redirect to relevant state (e.g. logout after password change)

### Responsive Behavior
- **Desktop ≥1024px:** Two-column layout (260px rail + flexible content)
- **Tablet 768–1023px:** Collapsible rail (hamburger toggle), full-width content
- **Mobile <768px:** Single-column accordion, one section open at a time, sticky section header

### Premium Navigation Details
- Section transitions use a 200ms ease-in-out fade between sections (no full page reload)
- Active section in the left rail is highlighted with a left accent bar (3px, brand color)
- Group headers in the rail are uppercase, letter-spaced, muted color
- Hover states on nav items: subtle background tint, no border shift (no layout jitter)
- Keyboard navigation: arrow keys move between sections, Enter selects
- Settings page remembers the last active section in `localStorage` and restores it on return

---

## 6. Implementation Priority

### P0 — Core (ship first)
1. Profile (view + edit)
2. Password change
3. Email & Phone (display + phone OTP)
4. Language & Currency
5. Theme
6. Role & Roles (switch + request)

### P1 — Security (ship next)
7. Two-Factor Authentication
8. Active Sessions
9. Notification Preferences
10. Push Devices

### P2 — Role-specific (ship per role rollout)
11. KYC Verification
12. Business Profile (seller/supplier)
13. Payout Methods (seller/courier/supplier/enabler)
14. COD Reputation (buyer)

### P3 — Administration
15. Admin User Management
16. Report Security Issue

### P4 — Danger Zone
17. Deactivate Account
18. Delete Account

---

## 7. Unresolved Technical Dependencies

| Dependency | Impact | Resolution |
|---|---|---|
| No email change endpoint | Email section is read-only | Add a verification flow (send OTP to new email, confirm, then update) — requires user-service + auth-service coordination |
| Session device naming | Sessions show raw user-agent, not friendly names | Add `deviceName` to session creation payload in auth-service |
| No user-facing audit log | No activity history for the user | Expose a filtered `GET /api/user/activity` endpoint backed by existing `AuditLog` records |
| No saved payout method persistence | Payout details are entered per-request, not saved | Add a `SavedPayoutMethod` model to payout-service or user-service |
| Data export endpoint missing | GDPR self-service export unavailable | Wire the existing `exportUserData` repository method to a `GET /api/user/export` route with async generation |
| Notification preferences vs. user preferences duplication | Two preference systems exist (user-service `UserPreferences` and notification-service preferences) | Align or merge into a single source of truth; the notification-service endpoints are more granular (per-channel + frequency) and should be the primary system |

---

## Related Documentation

- `docs/user/USER_SERVICE_FRONTEND_GUIDE.md` — user-service API reference
- `docs/auth/AUTH_SERVICE_FRONTEND_GUIDE.md` — auth-service API reference
- `docs/wallet/WALLET_SERVICE_FRONTEND_GUIDE.md` — wallet-service API reference
- `docs/user/FETCH_NAME_BY_ID.md` — bulk name resolution endpoint
- `shared-contracts/user-service-contracts.ts` — shared user service contracts
