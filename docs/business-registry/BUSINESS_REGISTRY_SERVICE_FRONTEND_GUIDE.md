# Business Registry Service — Frontend Integration Guide

> Mount path: `/api/business-registry`
> Auth: `Authorization: Bearer <accessToken>` required on all routes except `/public/*`
> Caller identity: pass `x-user-id: <userId>` header on update/reactivate calls

---

## Business Rules (from domain code)

### Status enums

**BusinessStatus**: `PENDING` | `ACTIVE` | `SUSPENDED` | `DEACTIVATED` | `CLOSED`

**VerificationStatus**: `UNVERIFIED` | `PENDING_VERIFICATION` | `VERIFIED` | `REJECTED`

**ComplianceStatus**: `UNDER_REVIEW` | `COMPLIANT` | `NON_COMPLIANT`

**BusinessType**: `SOLE_PROPRIETORSHIP` | `PARTNERSHIP` | `LIMITED_LIABILITY` | `CORPORATION`

**AddressType**: `MAIN` | `BRANCH` | `WAREHOUSE` | `OTHER`

### Registration rules (BusinessRegistrationPolicy.canRegister)

- Maximum **5 businesses per owner**. A 6th attempt returns 403.
- Business name must be **at least 2 characters**.
- At least **one industry** is required.
- New registrations always start: `status: PENDING`, `verificationStatus: UNVERIFIED`, `complianceStatus: UNDER_REVIEW`.
- Duplicate `registrationNumber` → 409. Duplicate `taxId` → 409.

### canOperate() — the critical gate

A business can operate (list products, accept orders) only when **all three** are true:

```
status === ACTIVE
verificationStatus === VERIFIED
complianceStatus !== NON_COMPLIANT
```

Gate your seller dashboard on this triple condition, not just `status`.

### Update rules (BusinessRegistrationPolicy.canUpdateDetails)

- Caller must pass `x-user-id` header. Value must match `business.ownerId`.
- Updates blocked when `status === CLOSED` or `status === SUSPENDED`.
- Updatable fields: `name`, `description`, `industry`, `website`, `email`, `phoneNumber`, `addresses`.
- `registrationNumber`, `taxId`, `businessType`, `ownerId` are **immutable** after registration.

### Verification rules (BusinessVerificationPolicy)

- `REJECTED` businesses **cannot be re-verified** — show "Contact support", not a retry button.
- `CLOSED` businesses cannot be verified.
- `PENDING_VERIFICATION` means already in progress — hide the submit button.
- Missing required documents → `422` with message listing the missing types.
- `verifiedBy` field is required (admin user ID).

### Reactivation rules (BusinessRegistrationPolicy.canReactivate)

- Only works from `SUSPENDED` status. Any other status → `422`.
- Pass `reactivatedBy` in body or `x-user-id` header.

### Registration number format

Tanzanian format: `TZ-{REGION}-{NUMBER}` — region is 2–4 uppercase letters, number is 4–10 digits.

Valid: `TZ-DAR-123456`, `TZ-MWZ-9999`

Client-side regex: `/^TZ-[A-Z]{2,4}-\d{4,10}$/`

### Required documents by business type (BusinessVerificationPolicy.getRequiredDocuments)

All types require: `REGISTRATION_CERTIFICATE`, `PROOF_OF_ADDRESS`, `OWNER_ID`

| Type | Additional required |
|---|---|
| `SOLE_PROPRIETORSHIP` | — |
| `PARTNERSHIP` | `BUSINESS_LICENSE` |
| `LIMITED_LIABILITY` | `BUSINESS_LICENSE` |
| `CORPORATION` | `BUSINESS_LICENSE` |

### Document types (for addDocument)

Valid `type` values: `REGISTRATION_CERTIFICATE` | `BUSINESS_LICENSE` | `PROOF_OF_ADDRESS` | `OWNER_ID`

Valid `status` values: `PENDING` | `APPROVED` | `REJECTED`

### Compliance record types

Valid `type` values: `TAX_COMPLIANCE` | `BUSINESS_LICENSE` | `HEALTH_PERMIT` | `ENVIRONMENTAL_CLEARANCE`

Valid `status` values: `COMPLIANT` | `NON_COMPLIANT` | `UNDER_REVIEW`

### Trust score (BusinessScoringAlgorithm) — 0 to 100

| Condition | Points |
|---|---|
| `verificationStatus === VERIFIED` | +40 |
| `verificationStatus === PENDING_VERIFICATION` | +20 |
| `complianceStatus === COMPLIANT` | +30 |
| `complianceStatus === UNDER_REVIEW` | +15 |
| `status === ACTIVE` | +20 |
| `status === PENDING` | +10 |
| Valid `taxId` present | +10 |

Maximum possible: 100. Score ≥ 90 → show "Trusted Seller" badge.

### getBusinessesByOwner response shape

Returns a **single business object** (the most recently created), not an array. Returns `data: {}` (empty object) when the owner has no businesses.

### Public seller list pagination

Uses **offset-based** pagination (not cursor). Response includes `pagination.hasMore` and `pagination.nextOffset`.

Default `limit`: 20. Maximum `limit`: 100.

---

## Response shape (BusinessResponseDto)

```jsonc
{
  "id": "biz_01J...",
  "name": "Karibu Traders Ltd",
  "businessType": "LIMITED_LIABILITY",
  "registrationNumber": "TZ-DAR-123456",
  "taxId": "TZ-TAX-789012",           // optional
  "status": "ACTIVE",
  "verificationStatus": "VERIFIED",
  "complianceStatus": "COMPLIANT",
  "ownerId": "usr_01J...",
  "description": "...",               // optional
  "industry": ["electronics"],        // lowercase, deduplicated
  "website": "https://karibu.co.tz",  // optional
  "email": "info@karibu.co.tz",       // optional
  "phoneNumber": "+255712345678",     // optional
  "verifiedAt": "2025-01-15T10:00:00.000Z",  // optional
  "verifiedBy": "admin_01J...",              // optional
  "addresses": [
    {
      "id": "addr-...",
      "type": "MAIN",
      "street": "Samora Avenue",
      "city": "Dar es Salaam",
      "region": "Dar es Salaam",
      "postalCode": "11101",          // optional
      "country": "Tanzania",
      "isPrimary": true
    }
  ],
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-15T10:00:00.000Z"
}
```

Note: `industry` values are always **lowercase and deduplicated** (normalised by the domain entity).

---

## Route Reference

### Public routes (no auth)

#### List public sellers
```
GET /api/business-registry/public/sellers
```

Query params:
- `limit` — integer 1–100, default 20
- `offset` — integer ≥ 0, default 0
- `industry` — filter by industry (comma-separated or repeated param)
- `q` — free-text search

```jsonc
// Response 200
{
  "success": true,
  "data": {
    "items": [
      {
        "sellerId": "usr_01J...",
        "sellerName": "Karibu Traders Ltd",
        "businessCount": 2,
        "industries": ["electronics", "accessories"],
        "primaryBusiness": { /* BusinessResponseDto */ }
      }
    ],
    "pagination": {
      "limit": 20,
      "offset": 0,
      "hasMore": true,
      "nextOffset": 20
    }
  }
}
```

#### Get public seller profile
```
GET /api/business-registry/public/sellers/:sellerId
```

```jsonc
// Response 200
{
  "success": true,
  "data": {
    "sellerId": "usr_01J...",
    "sellerName": "Karibu Traders Ltd",
    "businessCount": 2,
    "industries": ["electronics"],
    "primaryBusiness": { /* BusinessResponseDto */ },
    "businesses": [ /* BusinessResponseDto[] — all businesses, newest first */ ]
  }
}
```

#### Get seller industries
```
GET /api/business-registry/public/sellers/:sellerId/industries
```

```jsonc
{
  "success": true,
  "data": {
    "sellerId": "usr_01J...",
    "industries": ["accessories", "electronics"],  // sorted alphabetically
    "businessCount": 2
  }
}
```

#### List sellers by industry
```
GET /api/business-registry/public/industries/:industry/sellers
```
Same response shape as list public sellers. `:industry` is also applied as a filter alongside any `industry` query params.

---

### Authenticated routes

#### Register a business
```
POST /api/business-registry/businesses
```

> **Note:** The `POST /businesses` route (registration) is only mounted in `default` mode. The legacy router alias (`createLegacyBusinessRoutes`) does not expose registration — only updates, lookups, lifecycle actions, and document/compliance routes.

```jsonc
// Request
{
  "name": "Karibu Traders Ltd",           // min 2 chars, required
  "businessType": "LIMITED_LIABILITY",    // required
  "registrationNumber": "TZ-DAR-123456", // required, TZ-{REGION}-{NUMBER}
  "taxId": "TZ-TAX-789012",              // optional
  "ownerId": "usr_01J...",               // required
  "industry": ["electronics"],           // required, min 1 item
  "description": "...",                  // optional
  "email": "info@karibu.co.tz",          // optional
  "phoneNumber": "+255712345678",        // optional
  "website": "https://karibu.co.tz",    // optional
  "addresses": [                         // optional
    {
      "type": "MAIN",
      "street": "Samora Avenue",
      "city": "Dar es Salaam",
      "region": "Dar es Salaam",
      "country": "Tanzania",
      "isPrimary": true
    }
  ]
}
```

Response: `201` with `BusinessResponseDto`. `status` will always be `PENDING`.

Errors:
- `409` — duplicate `registrationNumber` or `taxId`
- `403` — owner already has 5 businesses
- `422` — name < 2 chars, no industry, or invalid registration number format
- `422` — invalid registration number format

#### Get business by ID
```
GET /api/business-registry/businesses/:id
```

#### Get businesses by owner
```
GET /api/business-registry/businesses/owner/:ownerId
```

> Returns a **single object** (most recently created business), not an array.
> Returns `data: {}` when owner has no businesses — check `Object.keys(data).length > 0` before rendering.
> Route `/owner/:ownerId` is registered before `/:id` — no conflict.

#### Update business
```
PUT /api/business-registry/businesses/:id
```

Requires `x-user-id` header matching `business.ownerId`.

```jsonc
// Request — all fields optional
{
  "name": "Karibu Traders Ltd Updated",
  "description": "Updated description",
  "industry": ["electronics", "accessories"],
  "website": "https://karibu.co.tz",
  "email": "new@karibu.co.tz",
  "phoneNumber": "+255712345679",
  "addresses": [ /* BusinessAddressDto[] */ ]
}
```

Errors:
- `403` — `x-user-id` missing or does not match `ownerId`
- `422` — business is `SUSPENDED` (reactivate first)
- `422` — business is `CLOSED`

#### Search businesses
```
GET /api/business-registry/businesses/search
```

Query: `q` (search term), `limit` (default 50), `offset` (default 0)

Returns array of `BusinessResponseDto`.

#### Delete business
```
DELETE /api/business-registry/businesses/:id
```

Response: `200 { "success": true, "message": "Business deleted successfully" }`

---

### Lifecycle actions

#### Submit for verification
```
POST /api/business-registry/businesses/:id/verify
```

```jsonc
{
  "verifiedBy": "admin_01J...",   // required — admin user ID
  "documentTypes": [              // required — must satisfy type requirements
    "REGISTRATION_CERTIFICATE",
    "PROOF_OF_ADDRESS",
    "OWNER_ID",
    "TAX_CERTIFICATE"
  ]
}
```

On success: `verificationStatus` transitions to `VERIFIED`, `status` transitions from `PENDING` → `ACTIVE`.

Errors:
- `422` — already `VERIFIED`
- `422` — `REJECTED` (cannot re-verify)
- `422` — `PENDING_VERIFICATION` (already in progress)
- `422` — missing required documents (message lists which ones)
- `422` — `verifiedBy` is empty

#### Suspend business
```
POST /api/business-registry/businesses/:id/suspend
```

```jsonc
{
  "suspendedBy": "admin_01J...",  // required
  "reason": "Policy violation"   // optional
}
```

Errors:
- `422` — already `SUSPENDED`
- `422` — business is `CLOSED`
- `422` — `suspendedBy` is empty

#### Reactivate business
```
POST /api/business-registry/businesses/:id/reactivate
```

```jsonc
{ "reactivatedBy": "usr_01J..." }  // optional — falls back to x-user-id header
```

Only works from `SUSPENDED`. Returns `422` for any other status.

---

### Documents

#### Add document
```
POST /api/business-registry/businesses/:id/documents
```

```jsonc
{
  "type": "TAX_CERTIFICATE",                        // one of the 5 valid types
  "fileName": "tax-cert-2025.pdf",
  "fileUrl": "https://storage.example.com/doc.pdf",
  "status": "PENDING"                               // PENDING | APPROVED | REJECTED
}
```

Response: `201` with the created document record.

#### List documents
```
GET /api/business-registry/businesses/:id/documents
```

Response: `200` with array of document records.

---

### Compliance records

#### Add compliance record
```
POST /api/business-registry/businesses/:id/compliance-records
```

```jsonc
{
  "type": "TAX_COMPLIANCE",    // TAX_COMPLIANCE | BUSINESS_LICENSE | HEALTH_PERMIT | ENVIRONMENTAL_CLEARANCE
  "status": "COMPLIANT",       // COMPLIANT | NON_COMPLIANT | UNDER_REVIEW
  "expiresAt": "2026-12-31T00:00:00Z",  // optional ISO-8601
  "notes": "Annual review passed"        // optional
}
```

Response: `201` with the created compliance record.

#### List compliance records
```
GET /api/business-registry/businesses/:id/compliance-records
```

---

## Status display mapping

| status | verificationStatus | complianceStatus | UI label | Color |
|---|---|---|---|---|
| PENDING | UNVERIFIED | UNDER_REVIEW | "Pending Review" | gray |
| PENDING | PENDING_VERIFICATION | UNDER_REVIEW | "Verification In Progress" | blue |
| ACTIVE | VERIFIED | COMPLIANT | "Active & Verified" | green |
| ACTIVE | VERIFIED | UNDER_REVIEW | "Active — Compliance Review" | yellow |
| ACTIVE | VERIFIED | NON_COMPLIANT | "Compliance Issue — Operations Blocked" | red |
| SUSPENDED | any | any | "Suspended" | orange |
| DEACTIVATED | any | any | "Deactivated" | gray |
| CLOSED | any | any | "Closed" | gray |

---

## Verification flow (frontend sequence)

```
1. GET /businesses/:id  →  check verificationStatus
   UNVERIFIED           → show "Start Verification" button
   PENDING_VERIFICATION → show "Verification in progress" banner (no button)
   VERIFIED             → show verified badge
   REJECTED             → show "Contact support" CTA (re-verify is blocked by policy)

2. Determine required documents from businessType (table above)

3. User uploads documents → obtain storage URLs

4. POST /businesses/:id/verify  { verifiedBy, documentTypes }

5. Poll GET /businesses/:id every 30s until verificationStatus changes
   On VERIFIED: status will also have changed from PENDING → ACTIVE
```

---

## Error codes

| Code | HTTP | Meaning |
|---|---|---|
| `BUSINESS_NOT_FOUND` | 404 | ID does not exist |
| `BUSINESS_ALREADY_EXISTS` | 409 | Duplicate `registrationNumber` or `taxId` |
| `REGISTRATION_LIMIT_EXCEEDED` | 403 | Owner already has 5 businesses |
| `INVALID_REGISTRATION_NUMBER` | 422 | Format not `TZ-{REGION}-{NUMBER}` |
| `BUSINESS_SUSPENDED` | 422 | Action blocked — business is suspended |
| `BUSINESS_CLOSED` | 422 | Action blocked — business is closed |
| `UNAUTHORIZED_OPERATION` | 403 | `x-user-id` missing or not the owner |
| `ALREADY_VERIFIED` | 422 | Business already verified |
| `VERIFICATION_REJECTED` | 422 | Rejected — needs new documents via support |
| `VERIFICATION_IN_PROGRESS` | 422 | Already in PENDING_VERIFICATION |
| `MISSING_DOCUMENTS` | 422 | Required documents not provided (message lists them) |


---

## System Maintenance (internal/ops)

These endpoints are for ops/admin use only. They are not called from the frontend.

```
POST /api/business-registry/system/maintenance/cleanup/outbox/report
POST /api/business-registry/system/maintenance/cleanup/outbox
```

**Auth:** `requireRoleOrService(['admin','system'])` **and** `x-service-key` header.

### Outbox cleanup report
`POST /api/business-registry/system/maintenance/cleanup/outbox/report` → **200** — dry-run count of deletable outbox events.

### Outbox cleanup
`POST /api/business-registry/system/maintenance/cleanup/outbox` → **200** — batched deletion. Body: `{ "dryRun": true }` to simulate. `maxRuntimeMs` defaults to 20 seconds.
