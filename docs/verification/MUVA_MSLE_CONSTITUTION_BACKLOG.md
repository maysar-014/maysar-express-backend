# MUVA + MSLE Constitution Enhancement Backlog

**Source:** `maysar_universal_product_configuration_constitution.md` — Governing Engineering Constitution
**Audit date:** 2026-11-07
**Audited against:** Full codebase — `services/catalog-service/`, `services/inventory-service/`, `services/checkout-service/`, `prisma/schema.prisma`
**Current compliance:** ~30% overall
**Re-run command:** `node scripts/verification/run-lifecycle-checks.mjs`

---

## Compliance Scorecard

| Part | Constitution Section | Coverage | Status |
|---|---|---|---|
| Part II | Universal Product Model | ~40% | Partial |
| Part III | Seller Offers, Pricing, Inventory | ~35% | Partial |
| Part IV | MSLE Seller Experience | ~10% | Not started |
| Part V | Backend Engineering | ~45% | Partial |
| Part VII | Commerce Integrity | ~20% | Critical gaps |
| **Overall** | | **~30%** | |

---

## What Works Today

- Product identity with canonical IDs, slugs, brand, GTIN/MPN/ISBN
- Product fingerprints — deterministic, immutable, order-independent
- Discrete variants with per-variant pricing and stock
- Buy box engine — multi-seller competition with weighted scoring
- Pricing engine with competitive and cost-plus strategies
- Category templates and attribute registry (basic)
- Separate inventory service with warehouses and stock movements
- Domain events (ProductCreated, ProductPublished, StockUpdated)
- Transactional product creation with attributes
- Transparent identifier resolution (by-slug removal — completed 2026-11-07)

---

## Enhancement Items

### CRITICAL — Commerce Integrity Gaps

---

#### ENH-001: Seller Offer Domain

| Field | Value |
|---|---|
| Constitution ref | §8, §19.5, §20.4 |
| Severity | CRITICAL |
| Impact | Cannot separate seller commercial terms from product identity |
| Current state | Buy box engine operates on seller listings but no dedicated SellerOffer aggregate exists. Seller price/stock embedded in product/variant. No offer status, fulfillment policies, warranty, return conditions, MOQ, or lead time modeled. |
| Target state | Dedicated SellerOffer entity with: seller identity, seller SKU, price, stock availability, product condition, fulfillment policy, delivery arrangements, warranty, return conditions, MOQ, lead time, offer status, configuration coverage. |
| Files to create | `services/catalog-service/src/domain/entities/seller-offer.entity.ts` |
| Files to modify | `prisma/schema.prisma`, `services/catalog-service/src/domain/interfaces.ts`, `services/catalog-service/src/infrastructure/repositories/` (new repo), API routes + controller |
| Dependencies | None (foundational) |
| Phase | Phase 3 — Commercial integration |

---

#### ENH-002: Parametric Configuration Support

| Field | Value |
|---|---|
| Constitution ref | §5.2, §19.3, §20.3 |
| Severity | CRITICAL |
| Impact | Cannot support custom measurements (furniture, cable, timber, fabric) |
| Current state | Only Mode A (discrete variants) implemented. No parametric specification engine. No range/constraint system. Would require creating new variant records even for trivial measurement differences. |
| Target state | Mode B — customer specifies values within defined constraints. Stores validated configuration specification, resolves commercial implications without creating permanent variant per measurement. |
| Files to create | `services/catalog-service/src/domain/value-objects/parametric-specification.value-object.ts`, `services/catalog-service/src/domain/engines/parametric-resolution.engine.ts` |
| Files to modify | `prisma/schema.prisma` (new tables), product entity, pricing engine |
| Dependencies | ENH-006 (ConfigurationDefinition entity) |
| Phase | Phase 7 — Advanced configuration |

---

#### ENH-003: Composable Configuration Support

| Field | Value |
|---|---|
| Constitution ref | §5.3, §19.3, §20.3 |
| Severity | CRITICAL |
| Impact | Cannot support configurable equipment or component-based assembly |
| Current state | No component compatibility engine. No assembly validation. Not confused with cart grouping — this is a single product assembled from selectable parts. |
| Target state | Mode C — product assembled from compatible components. System validates compatibility and prevents invalid combinations. |
| Files to create | `services/catalog-service/src/domain/engines/compatibility-engine.ts`, `services/catalog-service/src/domain/value-objects/composable-configuration.value-object.ts` |
| Files to modify | `prisma/schema.prisma`, product entity, pricing engine |
| Dependencies | ENH-006 (ConfigurationDefinition entity) |
| Phase | Phase 7 — Advanced configuration |

---

#### ENH-004: Configuration Dependencies System

| Field | Value |
|---|---|
| Constitution ref | §6, §19.3 |
| Severity | CRITICAL |
| Impact | Cannot represent conditional or dependent options (e.g. printer model → toner options) |
| Current state | No dependency or conditional logic system. No conditional dimension visibility, mutual exclusivity, min/max selection constraints. Configuration definition versioning minimal. |
| Target state | Support: independent dimensions, conditional dimensions, dependent options, mutually exclusive options, required/optional selections, min/max selections, compatibility constraints, category-specific rules, configuration versioning. |
| Files to create | `services/catalog-service/src/domain/value-objects/configuration-dependency.value-object.ts`, `services/catalog-service/src/domain/engines/dependency-resolution.engine.ts` |
| Files to modify | `prisma/schema.prisma` (ConfigurationDependency table), product entity, API contracts |
| Dependencies | ENH-006 (ConfigurationDefinition entity) |
| Phase | Phase 1 — Foundation |

---

#### ENH-005: MSLE Seller Listing Workflow

| Field | Value |
|---|---|
| Constitution ref | §12-17, §19.4 |
| Severity | CRITICAL |
| Impact | Sellers cannot progressively list products without full upfront info; no drafts, no publication orchestration |
| Current state | ListingDraft scaffolding exists but full workflow not implemented. No start/save/retrieve/validate/publish/resume listing API. No progressive listing journey. No smart defaults or assisted entry. No draft recovery. |
| Target state | Two entry paths (sell existing / introduce new), 5-stage progressive journey (identify → describe → configure → offer → publish), draft saving and recovery, validation feedback, listing publication state. |
| Files to create | `services/catalog-service/src/application/use-cases/seller-listing-orchestrator.use-case.ts`, `services/catalog-service/src/application/use-cases/listing-draft.use-case.ts`, `services/catalog-service/src/application/use-cases/listing-publication.use-case.ts` |
| Files to modify | API routes (new listing endpoints), product controller, Prisma schema (ListingDraft, ListingPublicationRecord tables) |
| Dependencies | ENH-001 (SellerOffer), ENH-006 (ConfigurationDefinition) |
| Phase | Phase 4 — MSLE seller experience |

---

#### ENH-006: Configuration Definition Entity

| Field | Value |
|---|---|
| Constitution ref | §5, §19.3, §20.3 |
| Severity | CRITICAL |
| Impact | Cannot version or evolve configuration schema safely; no formal definition of what dimensions/options a product has |
| Current state | Variants exist but no ConfigurationDefinition, ConfigurationDimension, ConfigurationOption, ConfigurationConstraint entities. Sparse combinations not tracked. No validation that only intended variants are publishable. |
| Target state | Formal configuration definition with dimensions, options, dependencies, constraints, valid combinations, versioning. Sparse combination enforcement. |
| Files to create | `services/catalog-service/src/domain/entities/configuration-definition.entity.ts`, `services/catalog-service/src/domain/value-objects/configuration-dimension.value-object.ts`, `services/catalog-service/src/domain/value-objects/configuration-option.value-object.ts` |
| Files to modify | `prisma/schema.prisma` (ConfigurationDefinition, ConfigurationDimension, ConfigurationOption, ConfigurationConstraint, ConfigurationCombination tables), product entity |
| Dependencies | None (foundational) |
| Phase | Phase 1 — Foundation |

---

#### ENH-007: Atomic Checkout Transaction Boundary

| Field | Value |
|---|---|
| Constitution ref | §10.1, §24 |
| Severity | CRITICAL |
| Impact | No atomic validation; inventory overselling risk exists |
| Current state | No explicit transaction boundary. No documented atomicity guarantee. Configuration revalidation missing. Price revalidation missing. Stock reservation not integrated with checkout. |
| Target state | At checkout: validate config → resolve seller offer → recalculate price → check stock → reserve atomically → create immutable order snapshot → release reservations on failure. |
| Files to modify | `services/checkout-service/` (checkout controller, use cases), `services/inventory-service/` (reservation service), `services/catalog-service/src/domain/engines/pricing-engine.ts` (price resolution call) |
| Dependencies | ENH-001 (SellerOffer), ENH-008 (Order snapshots) |
| Phase | Phase 3 — Commercial integration |

---

#### ENH-008: Order Configuration & Price Snapshots

| Field | Value |
|---|---|
| Constitution ref | §37, §20.6 |
| Severity | CRITICAL |
| Impact | Historical orders not immutable; cannot preserve purchase intent when catalog changes |
| Current state | Order items exist but configuration snapshot not stored. Price snapshot partially implemented. Variant reference only; configuration detail not preserved. |
| Target state | Order snapshot captures: product identity, display info, selected configuration, variant ID, config definition version, seller offer ID, seller ID, resolved price, quantity, fulfillment conditions. Historical orders remain interpretable even when catalog changes. |
| Files to create | `services/catalog-service/src/domain/value-objects/configuration-snapshot.value-object.ts` |
| Files to modify | `prisma/schema.prisma` (ConfigurationSnapshot, OrderItemOfferSnapshot, OrderItemPriceSnapshot tables), order service |
| Dependencies | None (foundational) |
| Phase | Phase 3 — Commercial integration |

---

### MAJOR — Structural Gaps

---

#### ENH-009: Configuration & Listing API Contracts

| Field | Value |
|---|---|
| Constitution ref | §22-23 |
| Severity | MAJOR |
| Impact | Frontend cannot implement MSLE workflow or buyer configuration selector |
| Current state | No /products/:id/configuration endpoint, no /validate-configuration, no /resolve-configuration, no /seller/listing/draft, no /seller/listing/start, no /seller/listing/validate, no /seller/listing/publish, no /configuration/dependencies. |
| Target state | Full API capability groups: Catalog, Listing, Configuration, Offers, Pricing & inventory, Bulk operations. Purpose-built contracts, not raw database models. |
| Files to modify | `services/catalog-service/src/api/routes/product.routes.ts`, new route files for listing/configuration/offers |
| Dependencies | ENH-005 (MSLE), ENH-006 (ConfigurationDefinition) |
| Phase | Phase 4 — MSLE seller experience |

---

#### ENH-010: Catalog Matching Safeguards

| Field | Value |
|---|---|
| Constitution ref | §3.1, §19.1 |
| Severity | MAJOR |
| Impact | No prevention of name-based inappropriate merging; Galaxy A10 and A10 5G could be merged |
| Current state | Basic catalog matching engine exists with fingerprint-based strong matching. But no explicit duplicate detection safeguards. No evaluation of identity and specifications before merging. |
| Target state | Name similarity alone must never trigger automatic merging. Full identity and specification evaluation required. Audit trail for product identity changes or merges. |
| Files to modify | `services/catalog-service/src/domain/engines/catalog-matching.engine.ts`, `services/catalog-service/src/domain/policies/catalog-matching.policy.ts` |
| Dependencies | None |
| Phase | Phase 1 — Foundation |

---

#### ENH-011: Pricing Integration into Checkout

| Field | Value |
|---|---|
| Constitution ref | §9, §24 |
| Severity | MAJOR |
| Impact | Price resolution disconnected from checkout transaction; frontend may display stale prices |
| Current state | PricingEngine with CompetitivePricingStrategy and CostPlusPricingStrategy exists. Price precedence defined in policy but not enforced in unified resolver called at checkout. No parametric, quantity-based, or component-based pricing. No promotion integration. |
| Target state | Price resolution wired into checkout transaction. Price precedence enforced: promotion → seller offer → config override → base price → catalog default. Revalidation at checkout. |
| Files to modify | `services/checkout-service/` (checkout use cases), `services/catalog-service/src/domain/engines/pricing-engine.ts` |
| Dependencies | ENH-001 (SellerOffer), ENH-007 (Atomic checkout) |
| Phase | Phase 3 — Commercial integration |

---

#### ENH-012: Inventory Atomicity with Checkout

| Field | Value |
|---|---|
| Constitution ref | §10.1, §24 |
| Severity | MAJOR |
| Impact | Stock reservation not integrated with checkout; overselling risk |
| Current state | Inventory service exists with warehouses, stock movements, reservations. But not transactionally coordinated with checkout. No explicit atomic reservation workflow. No stock-depletion auto-unpublish (attempted but incomplete). |
| Target state | Atomic reservation at checkout. Made-to-order products distinguished. Lead time tracking. Inventory revalidation before checkout commitment. |
| Files to modify | `services/inventory-service/`, `services/checkout-service/` |
| Dependencies | ENH-007 (Atomic checkout) |
| Phase | Phase 3 — Commercial integration |

---

#### ENH-013: Sparse Combination Enforcement

| Field | Value |
|---|---|
| Constitution ref | §5.1, §7.1 |
| Severity | MAJOR |
| Impact | No validation that only intended variants are publishable; invalid combinations may be purchasable |
| Current state | No sparse combination tracking. System could allow purchasing Blue+128GB even if that combination doesn't exist, because both individual options exist. |
| Target state | Only valid, explicitly defined combinations may be published and purchased. Invalid combinations blocked at validation layer. |
| Files to modify | `services/catalog-service/src/domain/policies/` (new validation policy), `services/catalog-service/src/infrastructure/repositories/prisma-product.repository.ts` |
| Dependencies | ENH-006 (ConfigurationDefinition) |
| Phase | Phase 2 — Discrete configuration |

---

#### ENH-014: Bulk Operations Framework

| Field | Value |
|---|---|
| Constitution ref | §14, §21, §34 |
| Severity | MAJOR |
| Impact | Import, preview, commit flow not production-ready; suppliers cannot manage large catalogs efficiently |
| Current state | Bulk operations controller scaffolding exists. Basic bulk update/delete. No import preview, no import validation, no commit flow, no export. |
| Target state | Validate import → preview import → commit import → retrieve import results → export seller catalog data. First-class bulk operations: apply price to all, apply stock to all, update selected, duplicate settings, import/export, bulk activate/deactivate. |
| Files to modify | `services/catalog-service/src/api/controllers/bulk-operations.controller.ts`, new import/export services |
| Dependencies | ENH-001 (SellerOffer), ENH-006 (ConfigurationDefinition) |
| Phase | Phase 6 — Supplier productivity |

---

#### ENH-015: Attribute Classification Enforcement

| Field | Value |
|---|---|
| Constitution ref | §4.2 |
| Severity | MINOR |
| Impact | Descriptive vs. configurable vs. filterable vs. operational not formally enforced; attributes could be misused as variant dimensions |
| Current state | Attribute registry exists with types (TEXT, LONG_TEXT, BOOLEAN, SELECT, INTEGER, DECIMAL, MEASUREMENT, DATE). But no formal classification enforcement. No distinction between descriptive (what product IS) and configurable (what customer CHOOSES). Search/filter eligibility metadata not tracked. |
| Target state | Every attribute classified: descriptive, filterable, configurable, operational. Classifications independent. Filterable does not automatically mean configurable. |
| Files to modify | `services/catalog-service/src/domain/value-objects/product-attributes.value-object.ts`, `prisma/schema.prisma` (add classification fields) |
| Dependencies | None |
| Phase | Phase 1 — Foundation |

---

### MINOR — Completeness Gaps

---

#### ENH-016: Domain Event Versioning & Schema

| Field | Value |
|---|---|
| Constitution ref | §25 |
| Severity | MINOR |
| Impact | Event consumers may break when event payloads change; no formal versioning contract |
| Current state | Events exist (ProductCreated, ProductUpdated, ProductPublished, StockUpdated, LowStockAlert). But no event versioning strategy, no formal JSON schema, no idempotent consumer enforcement, no transactional outbox for critical events. Missing events: ConfigurationPublished, VariantCreated, SellerOfferCreated, SellerOfferUpdated, ListingPublished, ListingRejected. |
| Target state | Events have stable identifiers, explicit schemas, versioning strategy, idempotent consumers, delivery guarantees, traceable correlation IDs. Critical events persisted through transactional outbox. |
| Files to modify | `services/catalog-service/src/domain/events/`, `shared/events/` |
| Dependencies | ENH-001 (SellerOffer), ENH-005 (MSLE) |
| Phase | Phase 1 — Foundation |

---

#### ENH-017: Seller SKU Immutability Hardening

| Field | Value |
|---|---|
| Constitution ref | §7 |
| Severity | MINOR |
| Impact | SKU can be modified on update; variant identity not guaranteed immutable |
| Current state | ProductFingerprint is immutable and deterministic. But SKU is not guaranteed immutable (modifiable on update). No explicit ban on using SKU or name as variant identity. |
| Target state | Variant identifier immutable. SKU modifiable but not used as identity. Changing commercial price does not create new variant. |
| Files to modify | `services/catalog-service/src/infrastructure/repositories/prisma-product.repository.ts` (enforce immutability on update) |
| Dependencies | None |
| Phase | Phase 2 — Discrete configuration |

---

## Phased Delivery Plan

Aligned with constitution §44 (Phased Delivery).

### Phase 0 — Architecture Audit ✅ COMPLETE

- [x] Existing system inventory
- [x] Domain ownership map
- [x] Data model assessment
- [x] API dependency map
- [x] Gap analysis
- [x] Migration plan (this document)

### Phase 1 — Foundation

- [x] ENH-006: Configuration Definition entity ✅ *Completed 2026-11-07*
- [x] ENH-004: Configuration Dependencies system ✅ *Included in ENH-006 2026-11-07*
- [x] ENH-010: Catalog Matching safeguards ✅ *Completed 2026-11-07*
- [x] ENH-015: Attribute Classification enforcement ✅ *Completed 2026-11-07*
- [x] ENH-016: Domain Event versioning & schema ✅ *Completed 2026-11-07*

### Phase 2 — Discrete Configuration

- [x] ENH-013: Sparse Combination enforcement ✅ *Completed 2026-11-07*
- [x] ENH-017: Seller SKU immutability hardening ✅ *Completed 2026-11-07*

### Phase 3 — Commercial Integration

- [x] ENH-001: Seller Offer domain ✅ *Completed 2026-11-07*
- [x] ENH-007: Atomic Checkout transaction boundary ✅ *Completed 2026-11-07*
- [x] ENH-008: Order Configuration & Price snapshots ✅ *Completed 2026-11-07*
- [x] ENH-011: Pricing integration into checkout ✅ *Completed 2026-11-07*
- [x] ENH-012: Inventory atomicity with checkout ✅ *Completed 2026-11-07*

### Phase 4 — MSLE Seller Experience

- [x] ENH-005: MSLE Seller Listing Workflow ✅ *Completed 2026-11-10*
- [x] ENH-009: Configuration & Listing API contracts ✅ *Completed 2026-11-10*

### Phase 5 — Buyer Experience

- [ ] Buyer configuration selector API
- [ ] Dynamic price resolution on configuration change
- [ ] Availability resolution on configuration change
- [ ] Configuration-aware cart

### Phase 6 — Supplier Productivity

- [ ] ENH-014: Bulk Operations framework
- [ ] Import preview and commit flow
- [ ] Export seller catalog data

### Phase 7 — Advanced Configuration

- [ ] ENH-002: Parametric Configuration
- [ ] ENH-003: Composable Configuration
- [ ] Advanced dependencies and compatibility rules
- [ ] Advanced commercial resolution

---

## Acceptance Criteria

Per constitution §45-46, the architecture is not complete unless:

### Universal Capability (§45)

- [ ] Products without variants work naturally
- [ ] Products with one option work naturally
- [ ] Products with multiple options work naturally
- [ ] Invalid combinations cannot be purchased
- [ ] Sparse combinations are supported
- [ ] Configuration identity is deterministic
- [ ] Multiple sellers can offer the same variant independently
- [ ] Prices can differ by seller and configuration
- [ ] Stock can differ by seller and configuration
- [ ] Parametric products do not require infinite variant records
- [ ] Composable products can enforce compatibility
- [ ] Historical orders preserve their original configuration
- [ ] Checkout revalidates all commercially relevant information

### Seller Experience (§46)

- [ ] A seller can list a simple product without encountering unnecessary variant controls
- [ ] A seller can find and offer an existing catalog product without recreating its details
- [ ] A seller can introduce a genuinely new product
- [ ] A seller can define common options without understanding technical terminology
- [ ] Shared prices and stock can be entered once
- [ ] Individual overrides are available when necessary
- [ ] Invalid combinations are clearly identified
- [ ] Drafts survive interruptions
- [ ] Suppliers can perform bulk operations
- [ ] The experience works effectively on smartphones
- [ ] The system minimizes repeated data entry
- [ ] Sellers retain control over the accuracy of information published under their offers

---

## Progress Tracking

| Phase | Total Items | Completed | In Progress | Not Started |
|---|---|---|---|---|
| Phase 0 — Audit | 6 | 6 | 0 | 0 |
| Phase 1 — Foundation | 5 | 5 | 0 | 0 |
| Phase 2 — Discrete Config | 2 | 2 | 0 | 0 |
| Phase 3 — Commercial | 5 | 5 | 0 | 0 |
| Phase 4 — MSLE | 2 | 2 | 0 | 0 |
| Phase 5 — Buyer | 4 | 0 | 0 | 4 |
| Phase 6 — Supplier | 3 | 0 | 0 | 3 |
| Phase 7 — Advanced | 4 | 0 | 0 | 4 |
| **Total** | **31** | **8** | **0** | **23** |

---

*Updated: 2026-11-10 — Phase 4 (MSLE) complete: seller listing workflow + API contracts*
*Constitution: `maysar_universal_product_configuration_constitution.md`*
*Lifecycle verification: 160/160 passing (100%)*
