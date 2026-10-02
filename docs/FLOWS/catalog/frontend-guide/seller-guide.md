# Seller Guide — Catalog Service

> Mirrors: docs/FLOWS/catalog/user-flow/seller-flows.md
> Verification status: Mixed (product create/publish Verified; buy-box anomaly flag deletion fixed — accurate 404 on unknown flag id, DEF-004)
> Last updated: September 2026

## Overview

This guide is for frontend developers implementing the catalog UI for sellers. It covers two operational flows: creating a product listing (KYC-gated) and publishing a product to the live catalog. A Known Gap section documents the non-functional buy-box anomaly flag deletion endpoint that requires a UI workaround.

---

## Flow 1: Create Product

**User Goal:** Create a new product listing on the catalog.

**UI States to Handle:**

| State | What User Sees | UI Treatment |
|---|---|---|
| Loading | Submitting product | Loading spinner on submit button; disable form |
| Success | Product created in DRAFT | "Product created. Complete your listing to publish." — navigate to product edit / publish screen |
| KYC gate | KYC required | "Complete your KYC verification to start listing products" with link to KYC flow |
| Duplicate detected | Similar product exists | "A similar product already exists. Manage your existing listing instead." with link to the existing product |
| Validation error | Input errors | Field-level error highlights with descriptive messages |
| Error | Submission failed | "Something went wrong. Please try again." + retry |

**Actions the User Can Take:**

**Submit new product:**
- What the seller sees: Product creation form with fields for title, description, category, variants, images, pricing, and inventory
- What they click/tap: "Create Product" / "Save" button
- API call: `POST /api/catalog/v1/products`
- Auth: Bearer JWT (seller role)
- Request body:
  ```json
  {
    "title": "string (required)",
    "description": "string (required)",
    "categoryId": "string (required)",
    "variants": [{ "sku": "string", "attributes": {}, "price": 0, "stock": 0 }],
    "images": ["url"],
    "pricing": { "basePrice": 0, "currency": "TZS" },
    "inventoryInfo": { "warehouseId": "string", "quantity": 0 }
  }
  ```
- Success response: `201 { productId, status: "DRAFT" }`
- Success handling: Navigate to the product detail / edit screen. Show the new product in `DRAFT` status with a prompt to publish.

**KYC gate handling:**
- If the API returns `422 KYC_LEVEL_INSUFFICIENT`, show: "Complete your KYC verification to start listing products"
- Include a call-to-action button linking to the KYC verification flow
- Do not show a generic error — the message must make the blocker clear

**Duplicate detection handling:**
- If the API returns `409 DUPLICATE_LISTING`, show: "A similar product already exists. Manage your existing listing instead."
- Include a link or button to navigate to the existing matched product

**Error Code Table:**

| HTTP Status | Error Code | User-Facing Message | Retry? |
|---|---|---|---|
| 400 | VALIDATION_ERROR | Highlight the specific invalid fields. "Please check your product details and try again." | Yes — fix input |
| 401 | UNAUTHORIZED | "Please log in again." | Yes — re-authenticate |
| 403 | FORBIDDEN | "You do not have permission to create products." | No |
| 409 | DUPLICATE_LISTING | "A similar product already exists. Manage your existing listing instead." | No — manage existing |
| 422 | KYC_LEVEL_INSUFFICIENT | "Complete your KYC verification to start listing products." | No — complete KYC first |
| 422 | PRICING_VIOLATION | "Your price does not meet platform minimums. Please adjust your price." | Yes — adjust price |
| 5xx | — | "Something went wrong. Please try again." | Yes — retry after delay |

**Product Status After Creation:**
- New products are created in `DRAFT` status — they are not visible to buyers
- The seller must publish the product (Flow 2) to make it live on the catalog
- `DRAFT` → `PENDING_REVIEW` → `ACTIVE` is the publishing lifecycle

**What the Seller Should Understand at Every Stage:**
- The KYC check happens server-side before the product is created — KYC level 1 or above is required.
- If a similar product already exists, the system links the new listing to the existing product rather than creating a duplicate. The seller should manage inventory and pricing on their existing listing.
- After successful creation, the product is in `DRAFT` status and invisible to buyers until published.

---

## Flow 2: Publish Product

**User Goal:** Make a product live on the catalog and begin competing in the buy-box.

**UI States to Handle:**

| State | What User Sees | UI Treatment |
|---|---|---|
| Loading | Publishing… | Loading spinner on publish button; disable |
| Success | Product is now live | "Your product is now live and competing for the buy-box." — update product status display to ACTIVE |
| Quality score too low | Score below threshold | Show current quality score + improvement suggestions from the error response |
| Wrong status | Cannot publish from current state | "Your product cannot be published from its current state. Check the product status." |
| Not owner | Forbidden | "You do not have permission to publish this product." |
| Not found | Product missing | "Product not found." |
| Error | Submission failed | "Something went wrong. Please try again." + retry |

**Actions the User Can Take:**

**Publish product:**
- What the seller sees: Product detail screen showing the product in `DRAFT` or `PENDING_REVIEW` status with a "Publish" button
- What they click/tap: "Publish" button
- API call: `POST /api/catalog/v1/products/{id}/publish`
- Auth: Bearer JWT (seller role)
- Request body: none
- Success response: `200 { productId, status: "ACTIVE", qualityScore }`
- Success handling: Update the product status display to `ACTIVE`. Show: "Your product is now live and competing for the buy-box." The seller will now compete in the buy-box ranking for their category.

**Quality score gate handling:**
- If the API returns `422 QUALITY_SCORE_INSUFFICIENT`, show the seller:
  - Their current quality score (from the `qualityScore` field in the error response)
  - The specific improvement suggestions provided in the error response
  - A threshold note: "A score of at least 60 is required to publish"
- Do not show a generic error — the seller needs actionable guidance on what to improve
- After the seller updates the product, they can try publishing again

**Quality score display example:**
```
Quality score: 42/100

To publish, improve the following:
• [List improvement suggestions from the error response]

Minimum required: 60
```

**Error Code Table:**

| HTTP Status | Error Code | User-Facing Message | Retry? |
|---|---|---|---|
| 401 | UNAUTHORIZED | "Please log in again." | Yes — re-authenticate |
| 403 | FORBIDDEN | "You do not have permission to publish this product." | No |
| 404 | RESOURCE_NOT_FOUND | "Product not found." | No |
| 422 | QUALITY_SCORE_INSUFFICIENT | Show current score + improvement suggestions from error response. | Yes — after improving the product |
| 422 | INVALID_STATUS_TRANSITION | "Your product cannot be published from its current state. Check the product status." | No — check status |
| 5xx | — | "Something went wrong. Please try again." | Yes — retry after delay |

**After successful publish:**
- The product status becomes `ACTIVE`
- The buy-box ranking engine runs immediately on publish; the seller may or may not win the buy-box initially
- The seller should understand that buy-box position depends on price competitiveness, ratings, fulfillment reliability, and other signals — winning the buy-box is not guaranteed on first publish

**What the Seller Should Understand at Every Stage:**
- The quality score is computed server-side at publish time — the seller cannot set it manually.
- Improving title completeness, description quality, image count, category accuracy, and pricing data improves the quality score.
- After a successful publish, the product enters buy-box competition immediately. Rankings update dynamically as other sellers list and update their products.

---

## ✅ Resolved — Buy-Box Anomaly Flag Deletion (DEF-004)

> `DELETE /api/catalog/v1/admin/buy-box/anomaly-flags/{flagId}` now returns `200 {success:true}` when a flag is cleared, `404 {success:false, error:{code:"ANOMALY_FLAG_NOT_FOUND"}}` when the flag id does not exist (previously an unhandled `500`), and `403 {code:"INSUFFICIENT_PERMISSIONS"}` when the caller lacks the operator/admin capability.
>
> **Impact on seller UI:** None — flag removal stays an admin-only operation. Seller-facing anomaly flags remain read-only.
>
> **Admin UI treatment:**
> - Keep the clear/delete action enabled for operators and admins.
> - On `404`, refresh the anomaly flag list (the flag was already cleared or never existed).
> - On `403`, hide the action and show "You do not have permission to perform this action."
>
> **Tracked in:** `docs/FLOWS/_verification/defect-register.md` (DEF-004)
