# Maysar Enabler Service — Implementation Reference (As-Built)

> **Status:** Live and verified — enabler profile management, capability lifecycle (terms/training-gated activation, admin enforcement), training gate enforcement, assisted-sale attribution via encoded product links, promotion jobs, tier management, earnings endpoints.
> **Last updated:** September 2026
> **Scope:** `services/enabler-service`

---

## 1. Guiding Principles Enforced by the Code

| Principle | Where it lives |
|---|---|
| **Capability is contextual, never role-based** | An enabler is not authorized by role alone — lifecycle status, activation requirements and (per-operation) additional gates are all evaluated server-side (`EnablerLifecyclePolicy`) |
| **Activation requires accepted terms + completed training** | An `APPROVED` enabler cannot become `ACTIVE` until the mandated terms version is accepted and the training domain certifies completion (`EnablerLifecyclePolicy.canActivate`, `EnablerTrainingGateService`) |
| **The frontend never decides what an enabler may do** | `GET /enablers/:enablerId/capabilities` returns the server-computed capability snapshot; every write re-enforces it. Frontend gating is UX only |
| **Enforcement touches capability state only** | Restrict/suspend/deactivate never touch the underlying Maysar user, wallet, orders or seller/courier duties — and every action is written to an immutable enforcement trail |
| **Training certification gates activation, and fails closed** | Training truth lives in the shared training domain; the enabler profile only mirrors the outcome. An infrastructure error marks the requirement unsatisfied — it can never activate an enabler |
| **Attribution is link-encoded** | Referral links embed the enabler's public `enablerCode` (`ENB-…`) / short code as the `enablerCode` URL parameter; the checkout service resolves the code, validates the enabler is operational and not the buyer, and records attribution on the checkout session and order |
| **Tiers are computed from performance** | `BRONZE → SILVER → GOLD → PLATINUM` based on totalSales, customerRating, daysActive (and disputeRate) |
| **Earnings are read-only from the enabler's perspective** | Enablers view earnings; the commission service writes them |

---

## 2. Domain Model

### 2.1 Enabler Entity

Fields as persisted in `enabler_profiles` via `EnablerEntity`:

`id`, `userId`, `enablerCode` (`ENB-XXXXXX`), `enablerCodeShort` (`EXXXXXX`), `businessName`, `contactEmail`, `contactPhone`, `businessDescription`, `status`, `verificationStatus`, `tier`, `commissionRate`, `totalSales`, `totalOrders`, `conversionRate`, `customerRating`, `totalCommissionEarned`, `businessAddress`, `taxId`, `bankAccountDetails`, `approvedBy`, `approvedAt`, `rejectionReason`, `metadata`, plus the lifecycle fields: `termsVersion`, `termsAcceptedAt`, `trainingStatus`, `trainingCompletedAt`, `activatedAt`, `restrictedAt`/`restrictedReason`, `suspendedAt`/`suspendedReason`, `deactivatedAt`/`deactivatedReason`, `createdAt`, `updatedAt`.

> There is **no** `certificationStatus` field — training state is `trainingStatus`, mirrored from the shared training domain.

### 2.2 Enums (`domain/types/enabler.types.ts`)

| Enum | Values |
|---|---|
| `Enabler_Status` | `PENDING`, `APPROVED`, `ACTIVE`, `RESTRICTED`, `SUSPENDED`, `REJECTED`, `DEACTIVATED` |
| `Enabler_TrainingStatus` | `not_started`, `in_progress`, `completed` (mirror values may also read `failed`, `expired`) |
| `Enabler_Tier` | `BRONZE`, `SILVER`, `GOLD`, `PLATINUM` |
| `Enabler_ListingStatus` | `ACTIVE`, `PAUSED`, `EXPIRED`, `REMOVED` |
| `Enabler_OrderStatus` | `PENDING`, `CONFIRMED`, `PROCESSING`, `COMPLETED`, `CANCELLED`, `DISPUTED` |

---

### 2.3 Capability Lifecycle (`EnablerLifecyclePolicy` — single source of truth)

**Status machine:**

```text
PENDING ──approve──► APPROVED ──activate──► ACTIVE ⇄ RESTRICTED
   │                                         │  ▲          │
   └─► REJECTED (approval refused)           ▼  │          │
                                          SUSPENDED ◄─────┘
                                                │  REACTIVATE → ACTIVE
                 any non-terminal status ──────► DEACTIVATED (terminal)
```

**Capability matrix** (mutating commercial state requires `ACTIVE`; `RESTRICTED` keeps read/sharing only):

| Status | VIEW_ELIGIBLE_PRODUCTS | SHARE_PRODUCT | BUILD_ORDER_DRAFT | GENERATE_CUSTOMER_LINK | ACCESS_PERMANENT_LINK | QUALIFY_EARNING |
|---|---|---|---|---|---|---|
| `PENDING` | – | – | – | – | – | – |
| `APPROVED` | ✓ | – | – | – | – | – |
| `ACTIVE` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `RESTRICTED` | ✓ | ✓ | – | – | – | – |
| `SUSPENDED` / `REJECTED` / `DEACTIVATED` | – | – | – | – | – | – |

`canPerform(status, capability)` denies with code `STATUS_NOT_PERMITTED`; denial responses carry `{ error, code, capability, status }`.

**Activation requirements (`canActivate`)** — all must hold:

1. Status is exactly `APPROVED` (any other status is refused).
2. Terms accepted (`termsAcceptedAt` set) and `termsVersion === requiredTermsVersion` (`ENABLER_REQUIRED_TERMS_VERSION`, default `2026-01`).
3. When `trainingRequired` (mandatory modules exist in the training domain), `trainingStatus` must be `completed`.

**Enforcement transitions (`canApplyEnforcement`):**

| Action | Permitted from | Resulting status |
|---|---|---|
| `RESTRICT` | `ACTIVE` | `RESTRICTED` |
| `SUSPEND` | `ACTIVE`, `RESTRICTED`, `APPROVED` | `SUSPENDED` |
| `REACTIVATE` | `SUSPENDED`, `RESTRICTED` | `ACTIVE` |
| `DEACTIVATE` | any status except `DEACTIVATED` | `DEACTIVATED` (terminal) |

Invalid transitions are refused **even for admins** (`409`).

---

## 3. API Surface & Middleware

### 3.1 Route groups (`api/routes/index.ts`)

| Group | Mount | Guard |
|---|---|---|
| Enabler | `router.use('/enablers', enablerRoutes)` | `requireAuth` applied inside |
| Hub | `router.use('/hub', hubRoutes)` | `requireAuth` applied inside |
| Maintenance | `router.use('/system/maintenance', requireRoleOrService(['admin','system']), createMaintenanceRoutes())` | additional `x-service-key` check against `ALLOWED_SERVICE_KEYS` |

### 3.2 Middleware chains (`api/routes/enabler.routes.ts`)

| Route | Chain after `requireAuth` |
|---|---|
| `POST /register` | `validateJoiRequest(registerBodySchema)` |
| `POST /:id/approve` | `validateJoiRequest(idParamsSchema, approveBodySchema)` |
| `GET /:id` | `validateJoiRequest(idParamsSchema)` |
| `GET /:enablerId/capabilities` | `validateJoiRequest(enablerIdParamsSchema)` → `authorizeEnablerIdentity` |
| `POST /:enablerId/terms` | `validateJoiRequest(params, acceptEnablerTermsBodySchema)` → `authorizeEnablerIdentity` |
| `POST /:enablerId/activation` | `validateJoiRequest(params, activateEnablerBodySchema)` → `authorizeEnablerIdentity` |
| `GET /:enablerId/enforcement-history` | `requireRoleOrService(['admin','system'])` → `validateJoiRequest(params, enforcementHistoryQuerySchema)` |
| `POST /:enablerId/enforcement` | `requireRoleOrService(['admin','system'])` → `validateJoiRequest(params, enforcementBodySchema)` |
| `router.use('/:enablerId', …)` | `validateJoiRequest(enablerIdParamsSchema)` → `authorizeEnabler` — applied to everything below |
| `POST /:enablerId/listings` | + `requireKycLevel(1)` → `requireKycListingCapacity(count of enabler_ProductListing)` |
| All other `/:enablerId/*` routes | `validateJoiRequest` for body/query/params as applicable |

**Route-ordering note:** capability/enforcement routes are registered **before** the operational-only `authorizeEnabler` guard, so a RESTRICTED/SUSPENDED enabler can still read why it was cut off and admins can always enforce.

**Identity resolution:** `authorizeEnablerIdentity` resolves the enabler from the authenticated user (`req.user`), never from a client-supplied `enablerId`; a mismatched `:enablerId` param returns `403`. It deliberately does not require an operational status — capability enforcement is the separate job of `requireEnablerCapability(capability)`.

**Contract-test escape hatch:** both `authorizeEnabler` and `authorizeEnablerIdentity` accept an `x-contract-test: 1|true` header to fall back to the requested `:enablerId` **only when `NODE_ENV !== 'production'`**. The hatch is inert in production.

### 3.3 Lifecycle wiring

```text
enablerLifecycleController = new EnablerLifecycleController(
  AcceptEnablerTermsUseCase, ActivateEnablerCapabilityUseCase,
  GetEnablerCapabilityStatusUseCase, ApplyEnablerEnforcementUseCase,
  PrismaEnablerEnforcementRepository, EnablerTrainingGateService,
  { requiredTermsVersion }   // ENABLER_REQUIRED_TERMS_VERSION || '2026-01'
)
```

`GetEnablerCapabilityStatusUseCase` is constructed with `{ requiredTermsVersion, trainingRequired: true }`.

---

## 4. Application Layer

### 4.1 Use Cases

| Use case | Purpose |
|---|---|
| `RegisterEnablerUseCase` | Creates the `PENDING` profile (no code yet) |
| `ApproveEnablerUseCase` | Assigns `enablerCode`/`enablerCodeShort`, moves to `APPROVED` |
| `ListProductUseCase` | Creates an enabler product listing (catalog-backed) |
| `FacilitateOrderUseCase` | Creates an assisted order (inventory + order services) |
| `CalculateEnablerCommissionUseCase` | Commission breakdown per order (`CommissionCalculationEngine`, total capped at 25 %) |
| `GetEnablerEarningsSummaryUseCase` / `GetEnablerEarningsLedgerUseCase` | Read-only earnings KPIs and paginated ledger |
| `ListPromotionJobsUseCase` / `AcceptPromotionJobUseCase` | Promotion job marketplace |
| `GenerateEnablerReferralLinkUseCase` / `GetEnablerReferralLinkUseCase` / `TrackEnablerReferralEventUseCase` | Attribution links + funnel events |
| `AcceptEnablerTermsUseCase` | Records `termsVersion` + server timestamp (idempotent) |
| `ActivateEnablerCapabilityUseCase` | `APPROVED → ACTIVE` after the `canActivate` policy check |
| `GetEnablerCapabilityStatusUseCase` | Builds the capability snapshot DTO |
| `ApplyEnablerEnforcementUseCase` | Admin restrict/suspend/reactivate/deactivate |

### 4.2 `ApplyEnablerEnforcementUseCase`

1. Loads the enabler (`404`-class error when missing).
2. Asks the **policy** whether `previousStatus → action` is permitted; refusals propagate as `cannot apply …` errors (mapped to `409`).
3. Applies the entity transition — a `REACTIVATE` from `RESTRICTED` uses `enabler.reactivate()`, others use `restrict/suspend/reactivate/deactivate(reason)` with a default reason when omitted.
4. Persists via `enablerRepository.update`.
5. Writes an immutable record to the enforcement trail.
6. Publishes the matching lifecycle event (§5).

Returns `{ enablerId, previousStatus, status, action }`.

### 4.3 `EnablerTrainingGateService`

- Reads mandatory requirements from `training_CertificationRequirement` (`mandatory: true`) and the learner's `training_TrainingRecord` (`learnerId`, `learnerRole = 'enabler'`).
- A module qualifies only when its record is `COMPLETED` **and** not expired (`expiresAt` in the future).
- Produces `{ trainingRequired, satisfied, mirroredStatus, completedAt, mandatoryModules, missingModules }`; `mirroredStatus` aggregates to `completed` when nothing mandatory is missing, otherwise `in_progress` → `failed` → `expired` → `not_started`.
- **Fails closed:** any error reading the training domain returns `trainingRequired: true, satisfied: false, mirroredStatus: 'not_started'` — an infrastructure problem can never activate an enabler.

### 4.4 Capability snapshot (`EnablerCapabilityStatusDto`)

`{ enablerId, userId, status, isOperational, capabilities{…}, activation{…}, lifecycle{ restrictedAt/Reason, suspendedAt/Reason, deactivatedAt/Reason } }` — the exact shape is in `application/dto/enabler-lifecycle.dto.ts` and rendered verbatim by `GET /enablers/:enablerId/capabilities`. `isOperational` is true only for `ACTIVE`.

---

## 5. Events & Enforcement Trail

### 5.1 Published events

| Enforcement action | Event | Payload |
|---|---|---|
| `RESTRICT` | `EnablerRestrictedEvent` | `enablerId`, `reason` |
| `SUSPEND` | `EnablerSuspendedEvent` | `enablerId`, `reason` |
| `REACTIVATE` | `EnablerReactivatedEvent` | `enablerId` |
| `DEACTIVATE` | `EnablerDeactivatedEvent` | `enablerId`, `reason` |

### 5.2 Enforcement trail record

Every enforcement decision is written immutably: `{ enablerId, action, previousStatus, newStatus, reason (nullable), actorUserId (nullable) }`. `GET /enablers/:enablerId/enforcement-history?limit=N` (admin/system, `limit` 1–100 default 50) returns the trail.

---

## 6. Cross-Service Contracts

| Service | Contract |
|---|---|
| **KYC** | `requireKycLevel(1)` and `requireKycListingCapacity` (counting `enabler_ProductListing`) gate listing creation |
| **Training domain** | `training_CertificationRequirement` + `training_TrainingRecord` are the source of truth for activation's training gate; the enabler profile only mirrors the outcome |
| **Checkout** | Resolves the `enablerCode` URL parameter, validates the enabler is operational and not the buyer, records attribution on the checkout session and the resulting order |
| **Catalog / Inventory / Order** | Listing creation and order facilitation delegate to these services |
| **Commission service** | Writes earnings; enablers only read (`/earnings`, `/earnings/summary`) |
| **Auth** | `requireAuth` / `requireRoleOrService` from the shared `auth-context.middleware` |

---

## 7. Configuration

| Env var | Default | Purpose |
|---|---|---|
| `ENABLER_REQUIRED_TERMS_VERSION` | `2026-01` | Terms version mandated at activation; overridable so a rollout can pin a new version without a code change |
| `ALLOWED_SERVICE_KEYS` | – | Comma-separated keys accepted in the `x-service-key` header for maintenance routes |
| `CLEANUP_BATCH_SIZE` | `1000` | Outbox deletion batch size |
| `CLEANUP_MAX_RUNTIME_MS` | `20000` | Outbox cleanup wall-clock budget |
| `CLEANUP_SLEEP_MS` | `200` | Pause between batches |
| `CLEANUP_DRY_RUN` | `false` | Count without deleting (also per-request `dryRun` body flag) |
| `OUTBOX_SENT_RETENTION_DAYS` | `7` | Retention for `SENT`/`PROCESSED` outbox rows |
| `OUTBOX_FAILED_RETENTION_DAYS` | `30` | Retention for `FAILED` outbox rows |

**Maintenance endpoints** (`/api/enabler/system/maintenance`, admin/system role + service key):

- `POST /cleanup/outbox/report` — counts + estimated batches, no deletion
- `POST /cleanup/outbox` — batched delete of `SENT`/`PROCESSED` rows older than the sent retention and `FAILED` rows older than the failed retention; honors `maxRuntimeMs`, sleeps between batches, supports `dryRun`

Module init knobs (`ALLOW_MODULE_INIT_FAILURES`, `MODULE_INIT_TIMEOUT_MS`) are handled by the shared `ModuleRegistry`.

---

## 8. Error Semantics

Most enabler controllers return plain `{ "error": "<message>" }`; the lifecycle controller maps by message:

| Message contains | HTTP |
|---|---|
| `not found` | 404 |
| `activation requirements`, `cannot be accepted`, `cannot apply`, `already deactivated` | 409 |
| `required`, `invalid` | 422 |
| anything else | 400 |

Success responses use `{ "success": true, "data": … }`. Joi validation and the KYC middleware use the enveloped `{ "success": false, "error": { code, message, details? } }` shape (`VALIDATION_ERROR`, `KYC_LEVEL_REQUIRED`, `KYC_LISTING_CAP_REACHED`). `requireEnablerCapability` denials are 403 with `code: "STATUS_NOT_PERMITTED"`.

---

## 9. Known Caveats (as-built)

- **`contactEmail` domain restriction:** the register validator (`EXAMPLE_DOT_COM_EMAIL_PATTERN`) currently requires `@example.com` addresses — a contract-test accommodation. Real client domains are rejected with `400` until the pattern is relaxed. Flagged here so the behavior is not mistaken for intentional policy.
- **Route order is load-bearing:** moving the lifecycle/enforcement routes below the `authorizeEnabler` guard would lock restricted/suspended enablers out of their own status page.
- **Maintenance routes are double-guarded** (role **and** service key); missing either is `401`.
- **No** `/api/enabler/profile`, `/referral-links`, `/tier` or `/health/*` routes exist — earlier document revisions listed them; they were never part of the mounted router.

---

## 10. Related Documents

- `docs/enabler/ENABLER_SERVICE_FRONTEND_GUIDE.md` — client-facing API reference and integration patterns
- `docs/Flow Docs/06-enabler-journeys.md` — journey-level flows
- `docs/commission/COMMISSION_SERVICE_FRONTEND_GUIDE.md`, `docs/analytics/ANALYTICS_SERVICE_FRONTEND_GUIDE.md`, `docs/business-registry/BUSINESS_REGISTRY_SERVICE_FRONTEND_GUIDE.md` — adjacent service guides
