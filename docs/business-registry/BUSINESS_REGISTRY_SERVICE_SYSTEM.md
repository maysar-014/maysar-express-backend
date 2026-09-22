# Maysar Business Registry Service — Implementation Reference (As-Built)

> **Status:** Live and verified — business registration, verification, compliance, public seller discovery.
> **Last updated:** September 2026
> **Scope:** `services/business-registry-service`

---

## 1. Guiding Principles Enforced by the Code

| Principle | Where it lives in code |
|---|---|
| **`canOperate()` is the triple gate** | `Business.canOperate()` returns `isActive() && isVerified() && complianceStatus !== NON_COMPLIANT` — enforced in `OperabilityGuard` before any seller action |
| **New registrations always start PENDING/UNVERIFIED** | `Business.register()` static factory hardcodes `status: PENDING`, `verificationStatus: UNVERIFIED`, `complianceStatus: UNDER_REVIEW` — no caller can override these |
| **Verify transitions status automatically** | `Business.verify()` transitions `verificationStatus → VERIFIED` and `status: PENDING → ACTIVE` atomically |
| **Industry values are normalized** | `Business.normalizeIndustries()` lowercases, trims, and deduplicates all industry values before storage |
| **Business entity is immutable** | All mutation methods return a new `Business` instance — the entity is never mutated in-place |
| **Registration number format is enforced** | `RegistrationNumber` value object validates `TZ-{REGION}-{NUMBER}` format |
| **Max 5 businesses per owner** | `BusinessRegistrationPolicy.canRegister()` counts existing businesses for the owner before allowing creation |

---

## 2. Domain Model

### 2.1 Business Entity (`domain/entities/business.entity.ts`)

```
BusinessStatus:      PENDING | ACTIVE | SUSPENDED | DEACTIVATED | CLOSED
VerificationStatus:  UNVERIFIED | PENDING_VERIFICATION | VERIFIED | REJECTED
ComplianceStatus:    UNDER_REVIEW | COMPLIANT | NON_COMPLIANT
BusinessType:        SOLE_PROPRIETORSHIP | PARTNERSHIP | LIMITED_LIABILITY | CORPORATION
AddressType:         MAIN | BRANCH | WAREHOUSE | OTHER
```

Key fields: `id`, `name`, `businessType`, `registrationNumber`, `taxId` (optional), `status`, `verificationStatus`, `complianceStatus`, `ownerId`, `industry[]` (lowercase, deduplicated), `addresses[]`, `verifiedAt`, `verifiedBy`, `createdAt`, `updatedAt`

Key domain methods:

| Method | Behavior |
|---|---|
| `Business.register(props)` | Creates new business with `PENDING/UNVERIFIED/UNDER_REVIEW` — invariants enforced |
| `verify(verifiedBy)` | Sets `VERIFIED` + transitions `PENDING → ACTIVE`; returns new instance |
| `suspend()` | Sets `SUSPENDED`; returns new instance |
| `reactivate()` | Sets `ACTIVE` (from `SUSPENDED` only); returns new instance |
| `updateDetails(props)` | Updates mutable fields (name, description, industry, website, email, phone, addresses) |
| `canOperate()` | `isActive() && isVerified() && complianceStatus !== NON_COMPLIANT` |
| `normalizeIndustries(industries)` | Lowercase, trim, deduplicate — called in constructor |

### 2.2 Value Objects

| Value Object | Enforces |
|---|---|
| `RegistrationNumber` | Format: `TZ-{REGION}-{NUMBER}` where region is 2–4 uppercase letters, number is 4–10 digits |
| `TaxId` | 9-digit pattern `\d{9}` |
| `BusinessAddress` | Required city + region + country |

### 2.3 Trust Score (`BusinessScoringAlgorithm`)

Score computed from status fields (0–100):

| Condition | Points |
|---|---|
| `verificationStatus === VERIFIED` | +40 |
| `verificationStatus === PENDING_VERIFICATION` | +20 |
| `complianceStatus === COMPLIANT` | +30 |
| `complianceStatus === UNDER_REVIEW` | +15 |
| `status === ACTIVE` | +20 |
| `status === PENDING` | +10 |
| Valid `taxId` present | +10 |

Score ≥ 90 → "Trusted Seller" badge.

---

## 3. Domain Policies

### BusinessRegistrationPolicy

- `canRegister(ownerId)` — checks count of existing businesses for owner. Maximum 5.
- `canUpdateDetails(business, callerId)` — `callerId` must match `ownerId`; blocks if `CLOSED` or `SUSPENDED`
- `canReactivate(business)` — only from `SUSPENDED` status

### BusinessVerificationPolicy

- `getRequiredDocuments(businessType)` — returns required document types per business type:

| Type | Required documents |
|---|---|
| `SOLE_PROPRIETORSHIP` | `REGISTRATION_CERTIFICATE`, `PROOF_OF_ADDRESS`, `OWNER_ID` |
| `PARTNERSHIP` | + `TAX_CERTIFICATE` |
| `LIMITED_LIABILITY` | + `TAX_CERTIFICATE`, `BUSINESS_LICENSE` |
| `CORPORATION` | + `TAX_CERTIFICATE`, `BUSINESS_LICENSE` |

- `REJECTED` businesses cannot be re-verified — error `VERIFICATION_REJECTED`
- `CLOSED` businesses cannot be verified — error `BUSINESS_CLOSED`
- `PENDING_VERIFICATION` means already in progress — error `VERIFICATION_IN_PROGRESS`

---

## 4. Application Layer (Use Cases)

| Use case | What it does |
|---|---|
| `RegisterBusinessUseCase` | Validates policy → creates `Business.register()` → persists → returns `BusinessResponseDto` |
| `VerifyBusinessUseCase` | Validates documents → `business.verify(verifiedBy)` → persists → emits `business.verified` |
| `SuspendBusinessUseCase` | `business.suspend()` → persists → emits `business.suspended` |
| `ReactivateBusinessUseCase` | `business.reactivate()` → persists |
| `UpdateBusinessUseCase` | Policy check → `business.updateDetails()` → persists |
| `GetBusinessUseCase` | Fetch by ID |
| `GetBusinessesByOwnerUseCase` | Returns most recently created business for owner (single object, not array) |
| `SearchBusinessesUseCase` | Full-text search by name/industry |
| `GetPublicSellersUseCase` | Paginated seller list (offset-based, max 100/page) |
| `AddDocumentUseCase` | Adds document record to business |
| `AddComplianceRecordUseCase` | Adds compliance record; updates `complianceStatus` |
| `CalculateTrustScoreUseCase` | Applies `BusinessScoringAlgorithm` to produce 0–100 score |

---

## 5. HTTP Surface

Mounted at `/api/business-registry` (module name `business-registry-service` → strip `-service` → `/api/business-registry`).

### Public routes (`/public/`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/business-registry/public/sellers` | none | List public sellers (offset pagination) |
| GET | `/api/business-registry/public/sellers/:sellerId` | none | Get seller public profile |
| GET | `/api/business-registry/public/sellers/:sellerId/industries` | none | Get seller industries |
| GET | `/api/business-registry/public/industries/:industry/sellers` | none | Sellers by industry |

### Authenticated routes (`/businesses/`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/business-registry/businesses` | JWT | Register business |
| GET | `/api/business-registry/businesses/:id` | JWT | Get business by ID |
| GET | `/api/business-registry/businesses/owner/:ownerId` | JWT | Get business by owner (single object) |
| PUT | `/api/business-registry/businesses/:id` | JWT + x-user-id | Update business |
| GET | `/api/business-registry/businesses/search` | JWT | Search businesses |
| DELETE | `/api/business-registry/businesses/:id` | JWT | Delete business |
| POST | `/api/business-registry/businesses/:id/verify` | JWT (admin) | Submit for verification |
| POST | `/api/business-registry/businesses/:id/suspend` | JWT (admin) | Suspend |
| POST | `/api/business-registry/businesses/:id/reactivate` | JWT | Reactivate from SUSPENDED |
| POST | `/api/business-registry/businesses/:id/documents` | JWT | Add document |
| GET | `/api/business-registry/businesses/:id/documents` | JWT | List documents |
| POST | `/api/business-registry/businesses/:id/compliance-records` | JWT | Add compliance record |
| GET | `/api/business-registry/businesses/:id/compliance-records` | JWT | List compliance records |
| GET | `/api/business-registry/health` | none | Health check |

---

## 6. Key Response Details

### `getBusinessesByOwner` special case

Returns a **single business object** (the most recently created), not an array. Returns `data: {}` (empty object) when owner has no businesses. Frontend must check `Object.keys(data).length > 0` before rendering.

### Public seller list pagination

Uses **offset-based** pagination (not cursor). Response includes `pagination.hasMore` and `pagination.nextOffset`. Default limit: 20. Maximum limit: 100.

---

## 7. Events

| Event | Emitted by | Payload |
|---|---|---|
| `business.registered` | `RegisterBusinessUseCase` | `businessId, ownerId, businessType, name` |
| `business.verified` | `VerifyBusinessUseCase` | `businessId, ownerId, verifiedBy, verifiedAt` |
| `business.suspended` | `SuspendBusinessUseCase` | `businessId, ownerId, reason` |

---

## 8. Verification Evidence

| Artifact | What it proves |
|---|---|
| `domain/entities/__tests__/business.entity.test.ts` | `canOperate()` triple gate, `register()` invariants, `normalizeIndustries()` |
| `domain/policies/__tests__/business-registration.policy.test.ts` | Max 5 businesses, update blocks, reactivation rules |
| `domain/policies/__tests__/business-verification.policy.test.ts` | Document requirements per type, REJECTED cannot re-verify |
| `application/use-cases/__tests__/register-business.use-case.test.ts` | Duplicate registration number → 409 |


---

## System Maintenance Routes

Mounted at `/api/business-registry/system/maintenance`. Guards: `requireRoleOrService(['admin','system'])` **and** `x-service-key` header.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/business-registry/system/maintenance/cleanup/outbox/report` | Dry-run count of deletable business-registry outbox events |
| POST | `/api/business-registry/system/maintenance/cleanup/outbox` | Batched deletion of expired outbox events. Body: `{ "dryRun": true }` to simulate |

**Retention defaults:** sent/processed → 7 days, failed → 30 days. Batch size: 1000. Max runtime: 20 s.
