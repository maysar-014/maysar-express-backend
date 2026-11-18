# MAYSAR UNIVERSAL PRODUCT CONFIGURATION & SELLER LISTING CONSTITUTION

**MUVA + MSLE — Unified Architecture, Backend & Frontend Engineering Standard**

| Field | Value |
|---|---|
| System | Maysar Commerce Platform |
| Architecture | Universal Product Configuration + Seller Listing Experience |
| Primary Domains | Product Catalog, Configuration, Variants, Seller Offers, Pricing, Inventory and Listing Management |
| Implementation Model | Modular Monolith, API-first, domain-oriented |
| Status | Governing Engineering Constitution |

---

## PART I — THE CONSTITUTION

### 1. Purpose

Maysar must support the creation, configuration, listing and sale of virtually any legitimate product or service that can be represented within its commerce model.

It must accommodate:

- Products with no selectable options.
- Products with one selectable option.
- Products with multiple independent options.
- Products with dependent or conditional options.
- Products with different prices across configurations.
- Products with different stock levels across configurations.
- Products with custom measurements or customer-defined specifications.
- Products assembled from compatible components.
- Products sold by multiple independent sellers.
- Suppliers managing large catalogs and bulk updates.

The system must achieve this without forcing sellers, suppliers or buyers to understand the technical complexity behind product configuration.

**Constitutional principle: Complexity belongs to the platform, not the merchant.**

### 2. The unified architecture

The system consists of two coordinated capabilities.

#### 2.1 MUVA — Maysar Universal Variant Architecture

MUVA defines what a product is, how it can be configured, which configurations are valid, and how each configuration resolves into a purchasable item.

Its responsibility is the authoritative configuration model.

MUVA answers:

- What attributes describe this product?
- Which attributes can customers select?
- Which combinations are valid?
- Does a configuration represent an existing variant or a custom specification?
- How does the selected configuration resolve to a purchasable item?
- What pricing and inventory information must be resolved?

#### 2.2 MSLE — Maysar Seller Listing Experience

MSLE defines how sellers and suppliers create, publish and manage product listings using MUVA.

Its responsibility is the merchant experience.

MSLE answers:

- Does this product already exist in the catalog?
- What information does the seller actually need to provide?
- Which options should be configured?
- Which details can be inherited safely?
- How can a seller set prices and stock without repetitive work?
- How can a supplier manage hundreds or thousands of products efficiently?

#### 2.3 The relationship

MUVA and MSLE must share one authoritative domain model. They must not become competing product or variant systems.

| Capability | Governing responsibility |
|---|---|
| MUVA | Product configuration and variant resolution |
| MSLE | Seller listing and catalog management experience |
| Product Catalog | Canonical product identity and specifications |
| Seller Offer | Seller-specific commercial availability |
| Pricing | Authoritative price resolution |
| Inventory | Stock, reservations and movements |
| Customer Selector | Customer-facing configuration selection |
| Checkout | Final commercial and configuration validation |

The seller interface must never become the source of truth for variant validity, stock or price.

---

## PART II — UNIVERSAL PRODUCT MODEL

### 3. Product identity

A product represents a recognizable commercial product identity.

Examples:

- Samsung Galaxy A10
- HP LaserJet printer
- Nike running shoes
- A 50 kg bag of rice
- A wooden dining table

A product is not automatically a seller listing. The same product may be offered by many sellers, each with different prices, stock, conditions and fulfillment arrangements.

#### 3.1 Product identity rules

The catalog must:

- Maintain canonical product identity.
- Avoid duplicate product records where identity is sufficiently established.
- Preserve genuinely different models as separate products.
- Support brand, manufacturer, model and external identifiers where available.
- Support category-specific specifications.
- Distinguish product identity from product configuration.
- Distinguish product configuration from seller-specific commercial offers.

Similar names alone must never trigger automatic merging. A Galaxy A10 and a Galaxy A10 5G, for example, must not be merged merely because their names are similar. Their identity and specifications must be evaluated.

### 4. Product attributes

Attributes describe products and their properties.

Examples:

| Category | Attributes |
|---|---|
| Electronics | Brand, model, RAM, storage, colour, connectivity |
| Clothing | Size, colour, material, fit |
| Furniture | Material, width, height, finish |
| Food | Weight, packaging, origin, expiry |
| Vehicles | Make, model, year, engine capacity |
| Construction | Material, grade, diameter, length |

The system must support a universal attribute registry.

#### 4.1 Attribute types

At minimum:

- Text
- Long text
- Boolean
- Enumeration
- Integer
- Decimal
- Measurement
- Measurement range
- Date
- Date/time
- Reference to another entity
- Structured value
- Custom value

Each attribute must support appropriate metadata:

- Name and description
- Data type
- Unit of measurement, where applicable
- Allowed values or validation constraints
- Localization labels
- Search/filter eligibility
- Configuration eligibility
- Requiredness rules
- Display behavior
- Category applicability

#### 4.2 Attribute classification

Every attribute must be classified according to its role:

- **Descriptive attributes**: Explain what a product is.
- **Filterable attributes**: Help customers discover products.
- **Configurable attributes**: Allow customers to choose a purchasable configuration.
- **Operational attributes**: Support fulfillment, storage, compliance or internal operations.

These classifications must remain independent. An attribute being filterable does not automatically make it a selectable variant dimension.

### 5. Product configuration

A configuration represents the customer's selected or specified version of a product.

Examples:

- Samsung Galaxy A10, Black, 64 GB.
- T-shirt, Large, Blue.
- Printer, Wireless, Duplex.
- Table, 180 cm wide, walnut finish.
- Custom-cut timber, 2.4 metres.

The system must support three configuration modes.

#### 5.1 Mode A — Discrete variants

The product has predefined purchasable combinations.

Example:

```
Product: Samsung Galaxy
Dimensions:
  Colour: Black, Blue
  Storage: 64 GB, 128 GB
  Network: 4G, 5G
```

Only combinations that actually exist may be published. The engine must not automatically create every possible combination.

#### 5.2 Mode B — Parametric configuration

The customer specifies values within defined constraints.

Examples:

- Custom furniture dimensions.
- Length of cable.
- Fabric quantity.
- Custom-cut construction materials.

The system must not create a separate permanent variant for every possible measurement. Instead, it stores a validated configuration specification and resolves its commercial implications.

#### 5.3 Mode C — Composable configuration

A product is assembled from compatible components.

Examples:

- Desktop computer assembled from compatible hardware.
- Furniture assembled from selectable components.
- Equipment configured with compatible accessories.

The system must validate compatibility and prevent invalid combinations. Composable configuration must not be confused with ordinary product bundles or cart grouping.

### 6. Configuration dimensions and dependencies

A configuration dimension represents a selectable or customer-defined choice.

Examples:

- Colour
- Size
- Storage
- Network
- Material
- Length
- Capacity

Dimensions may have dependencies. Example: A customer selects a printer model. The available toner options then depend on that model.

The system must support:

- Independent dimensions.
- Conditional dimensions.
- Dependent options.
- Mutually exclusive options.
- Required and optional selections.
- Minimum and maximum selections.
- Compatibility constraints.
- Category-specific rules.
- Configuration versioning.

The frontend must not independently invent these rules.

### 7. Variant identity and configuration fingerprints

Every discrete purchasable configuration must have a stable identity. MUVA must generate a deterministic canonical configuration fingerprint using normalized dimension selections.

The fingerprint must:

- Be independent of selection order.
- Normalize equivalent values consistently.
- Prevent duplicate configuration identities.
- Support reliable lookup.
- Remain stable for an unchanged configuration definition.

A variant must have an immutable identifier. Do not use a mutable product name, SKU or price as the variant's identity. Changing the commercial price must not create a new variant. Changing a genuine configuration identity may require a new variant or a controlled configuration migration.

#### 7.1 Sparse combinations

The system must support incomplete configuration matrices.

For example, a product may have:

- Black, 64 GB
- Black, 128 GB
- Blue, 64 GB

If Blue, 128 GB does not exist, it must not become purchasable merely because the two individual options exist. Only valid combinations may be resolved.

---

## PART III — SELLER OFFERS, PRICING AND INVENTORY

### 8. Seller offer model

A seller offer represents a seller's commercial commitment to supply a product or a specific configuration. It is separate from the global product and variant.

Multiple sellers may offer the same product configuration. Each offer may have its own:

- Seller identity
- Seller SKU
- Price
- Stock availability
- Product condition
- Fulfillment policy
- Delivery arrangements
- Warranty
- Return conditions
- Minimum order quantity
- Lead time
- Offer status

A seller must not be able to overwrite another seller's offer or global product identity.

#### 8.1 Offer granularity

The architecture must support:

- One offer covering a product without discrete variants.
- Separate offers for individual variants.
- An offer covering multiple valid variants under a shared commercial policy.
- Offer-specific stock and pricing overrides.
- Seller-specific custom configurations where the platform supports them.

The offer model must explicitly identify which configurations it can fulfill.

### 9. Pricing resolution

Pricing must be independent of product identity and configuration identity.

The engine must support:

- Product-level default pricing.
- Variant-specific pricing.
- Seller-specific pricing.
- Seller offer overrides.
- Quantity-based pricing.
- Parametric pricing.
- Component-based pricing.
- Promotion and discount rules where supported.

#### 9.1 Price precedence

A deterministic pricing policy must establish the applicable price. A typical resolution order is:

1. Applicable authorized promotion or pricing agreement.
2. Seller offer price for the selected configuration.
3. Seller offer's configuration-specific override.
4. Applicable seller offer base price.
5. Explicitly permitted catalog-level default.

This precedence must be formally defined in the pricing domain and must never be guessed by the frontend. An unavailable price must not silently become zero.

#### 9.2 Price transparency

The buyer must see the actual resolved price before committing to purchase. If configuration changes affect the price, the interface must update the displayed price. Any change between selection and checkout must be revalidated and communicated.

### 10. Inventory resolution

Inventory must be managed separately from the product catalog.

Support:

- Product-level stock.
- Variant-level stock.
- Seller-offer-level stock.
- Location-specific stock.
- Batch and serial-tracked stock where applicable.
- Made-to-order products.
- Supplier lead times.
- Stock reservations.
- Inventory movements.
- Returns and adjustments.

The system must not assume that every product requires physical stock tracking. Inventory behavior must be determined by the product and offer's fulfillment model.

#### 10.1 Atomic reservation

At checkout:

1. Validate the selected configuration.
2. Resolve the seller offer.
3. Recalculate the applicable price.
4. Check stock or fulfillment capacity.
5. Reserve available stock atomically where stock is tracked.
6. Create an immutable order snapshot.
7. Release reservations safely when checkout fails or expires.

A frontend availability indicator is informational. It is never a substitute for backend validation.

---

## PART IV — MSLE: THE SELLER EXPERIENCE

### 11. Seller experience constitution

The seller must be able to list ordinary products without understanding variants, attributes, configuration fingerprints, database structures or pricing engines.

The interface must progressively reveal complexity only when the product requires it. The default listing experience must be simple. Advanced capabilities must remain accessible without becoming compulsory.

### 12. Two entry paths

The listing experience must distinguish two fundamentally different operations.

#### Path A — Sell an existing product

The seller searches for an existing catalog product. The system identifies the product and allows the seller to create an offer.

The seller primarily provides:

- Price
- Stock or availability
- Condition
- Seller SKU, if needed
- Fulfillment information
- Other offer-specific information

The seller should not have to recreate verified catalog specifications.

#### Path B — Introduce a new product

When the product cannot be reliably matched, the seller can submit a new product identity.

The seller provides the necessary product information, specifications and media. The listing process then introduces configuration only when relevant.

The system must not force the seller to create duplicate products because a product search was unsuccessful or a match was uncertain.

### 13. Progressive listing journey

The default experience must follow a flexible journey.

#### Stage 1 — Identify

Ask the seller to identify the product. Support:

- Product name.
- Brand and model.
- Barcode or GTIN, where available.
- Catalog search.
- Relevant category.
- Existing product matching.

Show credible matches before asking the seller to create a new product.

#### Stage 2 — Describe

Collect only the information needed to establish and describe the product. Support:

- Product name.
- Category.
- Description.
- Product specifications.
- Product images.
- Brand and model.
- Condition where applicable.

Use category templates to reduce manual entry.

#### Stage 3 — Configure

Ask a simple question: "Does this product have options customers must choose?"

If no, proceed without configuration. If yes, ask which options customers choose.

Examples: Colour, Size, Storage, Capacity, Material

Ask additional questions only when necessary:

- Do all combinations actually exist?
- Do prices differ?
- Does stock differ?
- Are some choices dependent on others?
- Does the customer specify a custom measurement?

#### Stage 4 — Set up the offer

Collect commercial details:

- Selling price.
- Stock or availability.
- Condition.
- Seller SKU.
- Fulfillment method.
- Delivery or lead-time information.
- Applicable offer policies.

Do not make the seller re-enter product specifications already available in the catalog.

#### Stage 5 — Review and publish

Show the seller a clear summary of:

- Product identity.
- Product details.
- Available configurations.
- Price and stock.
- Offer conditions.
- Missing required information.

Allow corrections before publication.

This is a logical journey, not a compulsory five-screen wizard. The frontend may combine or skip stages when the product and seller context make that appropriate.

### 14. Intelligent configuration builder

The configuration builder must minimize repetitive operations.

Example: A seller lists a shirt with three sizes and two colours. The interface should allow the seller to enter the options once. If the seller confirms that all six combinations exist, the engine can create the six valid configurations.

The seller should then be able to:

- Apply one price to all configurations.
- Override selected prices.
- Enter shared stock values.
- Enter individual stock quantities.
- Mark unavailable combinations.
- Review only combinations that actually exist.

#### 14.1 Bulk configuration

Bulk operations must be first-class capabilities. Support:

- Apply price to all.
- Apply stock to all.
- Update selected configurations.
- Duplicate configuration settings.
- Import configuration data.
- Export configuration data.
- Bulk activate or deactivate.
- Bulk update seller offers.

Never force a seller to edit dozens or hundreds of rows individually.

#### 14.2 Configuration complexity levels

- **Quick listing**: Simple products and common options.
- **Detailed listing**: Additional dimensions, dependencies and individual overrides.
- **Advanced management**: Large matrices, imports, exports, bulk operations and complex configurations.

These are progressive capabilities over the same backend model, not three independent product systems.

### 15. Smart defaults and assisted entry

The platform may prefill information from:

- Verified catalog records.
- Category templates.
- Previous seller listings.
- Authorized manufacturer information.
- Seller-specific defaults.

However, every prefilled value must have an identifiable source and appropriate verification status. The system must distinguish:

- Verified catalog information.
- Seller-provided information.
- Imported information.
- Suggested information.
- Unverified information.

The seller must not unknowingly publish incorrect information simply because the platform prefilled it.

### 16. Drafts and recovery

Listing creation must be resilient. Support:

- Automatic draft saving.
- Draft recovery.
- Interrupted session recovery.
- Clear publication status.
- Validation feedback.
- Safe retry behavior.
- Appropriate offline resilience where technically supported.

A failed network request must not silently destroy seller input.

### 17. Requiredness and validation

Every field must be classified as:

- Required to publish.
- Recommended.
- Optional.

Requiredness must be category- and product-aware. Validation must explain:

- What is incorrect or missing.
- Why it matters.
- How the seller can fix it.

Do not expose raw backend validation errors to sellers.

---

## PART V — BACKEND ENGINEERING CONSTITUTION

### 18. Backend ownership

The backend is the authoritative owner of:

- Product identity.
- Attribute definitions.
- Category templates.
- Configuration definitions.
- Valid configuration combinations.
- Variant identity.
- Configuration resolution.
- Seller offers.
- Pricing resolution.
- Inventory availability.
- Stock reservations.
- Listing publication rules.
- Order configuration snapshots.

No frontend implementation may bypass these responsibilities.

### 19. Domain boundaries

Implement these as logical domains within Maysar's existing modular monolith. Do not create separate deployable microservices merely because the architecture contains separate capabilities.

#### 19.1 Product Catalog domain

Owns: Product identity, product lifecycle, product categorization, product specifications, product media references, catalog matching and duplicate detection.

#### 19.2 Attribute and Category Configuration domain

Owns: Attribute registry, attribute types, category templates, attribute validation, attribute applicability, localization metadata.

#### 19.3 Configuration and Variant domain — MUVA

Owns: Configuration definitions, configuration dimensions, option values, dependencies, constraints, valid combinations, variant identity, configuration fingerprints, parametric specifications, composable configuration validation, configuration versioning.

#### 19.4 Seller Listing domain — MSLE

Owns: Listing workflow, listing drafts, listing orchestration, seller listing validation, catalog matching workflow, listing publication state, listing-level audit history.

It orchestrates existing domains rather than duplicating their data ownership.

#### 19.5 Seller Offer domain

Owns: Seller-specific commercial offers, offer status, seller SKU, offer conditions, fulfillment policies, configuration coverage.

#### 19.6 Pricing domain

Owns: Price resolution, price precedence, price rules, quantity pricing, configuration pricing, applicable promotions and agreements.

#### 19.7 Inventory domain

Owns: Stock balances, stock movements, reservations, inventory locations, availability calculations, inventory adjustments.

#### 19.8 Order domain

Owns: Final purchase validation, order item snapshots, configuration snapshots, price snapshots, reservation coordination, order lifecycle.

### 20. Backend data architecture

The following is a conceptual entity inventory, not an instruction to create every table immediately. The implementation team must first audit existing models, services, migrations, APIs and ownership boundaries.

#### 20.1 Product Catalog

Potential entities: Product, ProductCategory, ProductBrand, ProductIdentifier, ProductSpecification, ProductMedia, ProductCategoryAssignment

#### 20.2 Attributes and templates

Potential entities: AttributeDefinition, AttributeValue, CategoryAttributeTemplate, CategoryAttributeRule, ProductAttributeAssignment, AttributeLocalization

Avoid creating unnecessary duplicate value registries where the existing attribute model can represent the same information.

#### 20.3 MUVA configuration

Potential entities: ProductConfigurationDefinition, ConfigurationDimension, ConfigurationOption, ConfigurationDependency, ConfigurationConstraint, ConfigurationCombination, ProductVariant, VariantOptionSelection, VariantMedia, ConfigurationVersion, ConfigurationFingerprint

The model must support both discrete and non-discrete configuration modes. Parametric and composable configurations must not be forced into a table containing one row per possible combination.

#### 20.4 Seller listing and offers

Potential entities: SellerListing, SellerListingDraft, ListingValidationResult, ListingPublicationRecord, SellerOffer, OfferConfigurationCoverage, OfferPrice, OfferCondition, OfferFulfillmentPolicy

#### 20.5 Inventory

Potential entities: InventoryItem, InventoryLocation, InventoryBalance, InventoryMovement, InventoryReservation, InventoryAdjustment

#### 20.6 Orders

Potential entities: OrderItem, ConfigurationSnapshot, OrderItemOfferSnapshot, OrderItemPriceSnapshot

These snapshots must preserve the commercial and configuration details that applied when the order was placed.

#### 20.7 Schema governance

Before implementing a new entity:

1. Identify existing equivalent entities.
2. Identify the current authoritative owner.
3. Determine whether an extension is sufficient.
4. Define migration and compatibility requirements.
5. Define indexes and constraints.
6. Define transaction boundaries.
7. Define historical-data implications.

Do not create a second product, variant, offer, price or inventory system.

### 21. Backend application services

Expose use-case-oriented application services rather than allowing controllers to manipulate domain tables directly.

Recommended logical capabilities:

- ProductIdentityResolver
- CatalogMatchService
- ProductAttributeService
- CategoryTemplateService
- ConfigurationDefinitionService
- ConfigurationValidationService
- VariantResolutionService
- ConfigurationFingerprintService
- SellerListingOrchestrator
- ListingDraftService
- ListingPublicationService
- SellerOfferService
- PriceResolutionService
- InventoryAvailabilityService
- InventoryReservationService
- OrderConfigurationSnapshotService

These names describe responsibilities, not mandatory class names. The implementation must follow existing Maysar conventions for dependency injection, repositories, service boundaries, error handling and transaction management.

### 22. Backend API constitution

The frontend must consume purpose-built API contracts. Do not expose raw database models or the entire internal MUVA domain model.

Recommended API capability groups:

**Catalog**

- Search catalog products.
- Retrieve product details.
- Retrieve category templates.
- Submit a new product identity.
- Request or confirm a catalog match.

**Listing**

- Start listing.
- Save listing draft.
- Retrieve draft.
- Update listing information.
- Validate listing.
- Publish listing.
- Resume listing.

**Configuration**

- Retrieve configuration definition.
- Create or update configuration definition.
- Retrieve available options.
- Validate a configuration.
- Resolve a selected configuration.
- Retrieve valid discrete combinations.

**Offers**

- Create seller offer.
- Update offer.
- Retrieve offer details.
- Update offer status.
- Retrieve seller offers.

**Pricing and inventory**

- Resolve applicable price.
- Retrieve availability.
- Update seller stock.
- Apply bulk price or stock changes.
- Reserve stock through the authorized checkout workflow.

**Bulk operations**

- Validate import.
- Preview import.
- Commit import.
- Retrieve import results.
- Export seller catalog data.

Exact routes and HTTP methods must be aligned with existing Maysar API conventions.

### 23. API contract requirements

Every contract must explicitly define:

- Authentication.
- Authorization.
- Request schema.
- Response schema.
- Validation rules.
- Error codes.
- Pagination where needed.
- Idempotency requirements.
- Concurrency behavior.
- Version compatibility.

Use stable identifiers rather than display names as references. Never accept client-submitted prices, stock balances or seller ownership as authoritative. The backend must resolve and verify them independently.

#### 23.1 Example configuration resolution response

The API should return a frontend-friendly representation containing:

- Product identity.
- Configuration definition version.
- Selected dimensions.
- Valid available options.
- Configuration validity.
- Resolved variant or configuration reference.
- Seller offer availability.
- Resolved price.
- Relevant media references.
- Actionable validation messages.

The frontend should not reconstruct the variant engine from raw database entities.

### 24. Transactional integrity

Operations affecting several domains must have clearly defined consistency boundaries.

Examples:

**Publishing a listing**

1. Validate product identity.
2. Validate configuration.
3. Validate seller ownership.
4. Validate offer completeness.
5. Persist publication state consistently.

**Updating stock**

1. Verify seller authorization.
2. Apply inventory movement.
3. Update availability.
4. Record audit information.

**Checkout**

1. Revalidate configuration.
2. Revalidate offer.
3. Resolve current price.
4. Reserve stock where applicable.
5. Create durable order snapshots.

Use database transactions for operations that must be atomic. Where workflows span multiple transactions or domains, use explicit orchestration and compensating actions. Do not rely on an in-memory event alone for critical financial, inventory or order consistency.

### 25. Events and domain integration

Publish meaningful domain events where they improve coordination.

Examples: ProductCreated, ProductUpdated, ConfigurationPublished, VariantCreated, SellerOfferCreated, SellerOfferUpdated, InventoryAdjusted, InventoryReserved, ListingPublished, ListingRejected

Events must have:

- Stable identifiers.
- Explicit schemas.
- Versioning strategy.
- Idempotent consumers.
- Appropriate delivery guarantees.
- Traceable correlation identifiers.

Critical events must be persisted through an appropriate reliable delivery mechanism, such as a transactional outbox where applicable. Do not introduce unnecessary event-driven complexity into ordinary synchronous operations.

### 26. Security and authorization

The backend must enforce:

- Seller ownership of offers and listings.
- Supplier permissions.
- Administrative permissions.
- Catalog modification permissions.
- Controlled product merge operations.
- Price and stock authorization.
- Bulk operation authorization.
- Import validation.
- Audit logging.

A seller must never be able to modify another seller's offer by changing an identifier in an API request. All critical operations must be independently authorized by the backend.

### 27. Backend performance

Performance must be designed, measured and verified.

Requirements:

- Avoid N+1 queries.
- Avoid loading entire configuration matrices unnecessarily.
- Use appropriate database indexes.
- Paginate large catalogs.
- Use bulk database operations where appropriate.
- Avoid generating every possible combination.
- Cache only data with a defined invalidation strategy.
- Avoid unnecessary serialization and repeated computation.
- Keep database transactions short.
- Avoid unbounded queries and payloads.
- Profile actual high-cost operations before optimizing.

Configuration definitions, product specifications, offer availability and inventory balances may have different caching requirements. Never allow a stale cache to authorize an invalid purchase.

---

## PART VI — FRONTEND ENGINEERING CONSTITUTION

### 28. Frontend ownership

The frontend owns presentation and interaction, not commercial or configuration authority.

It is responsible for:

- Guiding sellers through listing.
- Rendering configuration interfaces.
- Presenting valid choices.
- Collecting seller input.
- Displaying validation feedback.
- Managing temporary interaction state.
- Recovering drafts.
- Presenting prices and availability returned by the backend.
- Making bulk operations understandable.
- Giving buyers a clear configuration selection experience.

The frontend must not duplicate backend business rules.

### 29. Seller interface architecture

The seller experience must be designed around the seller's actual task, not the backend's domain structure.

A seller should encounter familiar concepts: Product, Options, Price, Stock, Delivery, Publish.

The seller should not be required to understand: Variant fingerprints, attribute registries, configuration schemas, domain aggregates, database relationships, inventory reservation internals.

#### 29.1 Listing interface

The interface must provide two clear starting actions:

- **Sell an existing product** — Find a catalog product and create an offer.
- **Introduce a new product** — Provide product identity and details before creating an offer.

The distinction must be visually clear without overwhelming the dashboard.

#### 29.2 Adaptive listing flow

The interface must adapt to the product.

Examples:

- **Simple product** — A seller lists a chair with one price and available quantity. No configuration builder should appear.
- **Single-option product** — A seller lists a shirt with different sizes. Only the size selector is needed.
- **Multi-option product** — A seller lists a phone with colour, storage and network choices. The configuration builder progressively introduces these dimensions.
- **Parametric product** — A seller lists custom-cut material. The interface asks for supported measurement ranges and commercial rules.
- **Composable product** — A seller lists configurable equipment. The interface guides component selection and compatibility.

The frontend must not present all these capabilities to every seller.

### 30. Dynamic configuration rendering

The configuration interface must be generated from the backend configuration contract. It must support appropriate presentation controls:

- Buttons or swatches for colour.
- Dropdowns for long option lists.
- Selectors for sizes.
- Numeric inputs for measurements.
- Range controls where appropriate.
- Conditional controls for dependent dimensions.
- Component selectors for composable products.

The renderer must choose an appropriate interaction based on metadata, available options and usability. It must not hardcode assumptions such as: every product has colour, every product has size, every product has only two dimensions, every configuration is a discrete variant, every category uses the same selector.

#### 30.1 Dependency behavior

When a selection changes:

1. Update the local selection state.
2. Determine whether dependent options must be refreshed.
3. Request authoritative validation or resolution when necessary.
4. Remove or invalidate selections that are no longer compatible.
5. Update price, media and availability from the resolved response.
6. Clearly communicate any unavailable configuration.

Do not allow stale selections to remain silently valid.

#### 30.2 Customer-facing selector

The buyer selector must:

- Display only valid options.
- Make unavailable choices understandable.
- Update product media when appropriate.
- Update price when applicable.
- Update availability.
- Display required selections.
- Prevent purchase of incomplete configurations.
- Preserve selections when navigating where appropriate.
- Revalidate before checkout.

The selector must feel like part of the product page, not a technical configuration form.

### 31. Seller configuration builder

The seller must not be forced to manage a raw matrix by default. The default interface should ask understandable questions.

Example: Does the product have selectable options? What do customers choose? Which combinations are actually available? Do prices differ? Does stock differ?

Based on answers, the interface generates the required configuration structure.

#### 31.1 Price and stock interface

- If all combinations share one price, provide a shared price control.
- If some differ, reveal individual overrides.
- If stock is shared, allow shared stock entry where the inventory model permits it.
- If stock differs, reveal per-configuration stock controls.

Never make individual price or stock entry compulsory when a shared value is sufficient.

#### 31.2 Large matrices

For complex products, provide:

- Search within configurations.
- Filters.
- Bulk selection.
- Bulk updates.
- Pagination or virtualization.
- Import/export.
- Validation summaries.
- Clear invalid-combination feedback.

Do not render hundreds or thousands of rows into the browser unnecessarily.

### 32. Frontend state management

The frontend must distinguish:

- **Server-authoritative state** — Product data, configuration definitions, valid options, resolved variants, seller offers, price, stock availability, publication status.
- **Local interaction state** — Current form input, expanded sections, temporary option selections, unsaved changes, UI presentation state.
- **Persisted draft state** — Seller listing progress, saved product details, saved configuration inputs, recovery metadata.

Local state must never override an authoritative server response.

#### 32.1 Draft behavior

Support:

- Autosave with controlled frequency.
- Save status visibility.
- Retry after temporary failures.
- Conflict handling.
- Draft restoration.
- Explicit discard behavior.

Avoid excessive API calls while sellers are typing. Use appropriate debouncing and batching without sacrificing data safety.

### 33. Frontend API integration

Create dedicated API integration layers for:

- Catalog search.
- Product details.
- Category templates.
- Listing drafts.
- Listing validation.
- Configuration resolution.
- Seller offers.
- Pricing and availability.
- Bulk operations.

UI components must not contain direct database assumptions or duplicate API business logic. Use typed request and response contracts. Handle:

- Loading.
- Empty states.
- Validation failures.
- Network failures.
- Permission errors.
- Conflicts.
- Expired sessions.
- Retryable failures.

Error messages must be meaningful to the seller. Do not display raw exception messages or internal server details.

### 34. Frontend performance and accessibility

Requirements:

- Render only the information needed for the current task.
- Lazy-load nonessential content.
- Avoid unnecessary component re-rendering.
- Virtualize large configuration lists.
- Keep input interactions responsive.
- Use appropriate loading states.
- Preserve keyboard accessibility.
- Provide accessible labels and validation.
- Support responsive mobile-first layouts.
- Avoid unnecessary animations.
- Avoid excessive cards, panels and nested modals.

The experience must remain usable on ordinary smartphones and inconsistent network connections.

### 35. Visual and interaction principles

Maysar's seller interface must be: Clear. Calm. Fast. Predictable. Mobile-first. Professional. Consistent. Forgiving of mistakes.

Use progressive disclosure rather than exposing every capability at once. A complex product should receive a more capable interface, not a more confusing one.

The dashboard must prioritize operational work:

- Create a listing.
- Update stock.
- Manage offers.
- Resolve listing issues.
- Perform bulk operations.

Do not turn the seller dashboard into a wall of metrics or decorative cards.

---

## PART VII — CUSTOMER EXPERIENCE AND COMMERCE INTEGRITY

### 36. Buyer configuration experience

The buyer must select the configuration before purchasing where selection is required. The product page must clearly communicate:

- Product identity.
- Available options.
- Selected configuration.
- Price.
- Availability.
- Relevant product media.
- Important configuration restrictions.

A simple product must remain simple. Do not display a variant selector when the product has no selectable configuration.

### 37. Configuration snapshots

An order must preserve what the customer actually purchased. The order snapshot must capture, as applicable:

- Product identity.
- Product display information.
- Selected configuration.
- Variant identifier.
- Configuration definition version.
- Seller offer identity.
- Seller identity.
- Resolved price.
- Quantity.
- Relevant fulfillment conditions.

Historical orders must remain interpretable even when catalog information changes. Never reconstruct an old order solely from the current product or variant record.

### 38. Search and SEO

Search must index product identity and relevant discoverability attributes. Avoid creating an indexable public page for every seller offer or every possible configuration. Where useful, valid variants may be represented within the parent product experience. Use canonical product URLs and appropriate metadata. Configuration selection must not produce uncontrolled duplicate SEO pages.

---

## PART VIII — TESTING AND QUALITY ASSURANCE

### 39. Backend testing

Test at minimum:

- Simple products without variants.
- Single-dimension variants.
- Multi-dimension variants.
- Sparse combinations.
- Duplicate configuration prevention.
- Dependent options.
- Invalid combinations.
- Parametric configurations.
- Composable configurations.
- Different seller prices.
- Different seller stock.
- Shared pricing.
- Price overrides.
- Inventory reservation concurrency.
- Seller ownership.
- Bulk operations.
- Listing publication.
- Historical order snapshots.
- Configuration version changes.

Test domain rules independently and verify integration across domain boundaries.

### 40. Frontend testing

Test at minimum:

- First-time seller listing.
- Existing catalog product listing.
- New product creation.
- Simple product flow.
- Single-option product flow.
- Complex product flow.
- Dependent configuration changes.
- Shared price entry.
- Individual price overrides.
- Shared and individual stock entry.
- Draft recovery.
- Network interruption.
- Validation feedback.
- Bulk import and editing.
- Mobile usability.
- Accessibility.

The frontend must be tested against realistic backend contracts, not only mocked happy paths.

### 41. End-to-end scenarios

The following scenarios are mandatory.

**Scenario A — Simple retailer**: A retailer lists an ordinary product with one price and stock quantity. Expected: no unnecessary configuration interface.

**Scenario B — Electronics retailer**: A seller lists a phone with colour, storage and network choices, where only some combinations exist. Expected: only valid configurations become purchasable.

**Scenario C — Clothing seller**: A seller lists shoes in multiple sizes and colours with a shared price. Expected: shared price entry and straightforward stock management.

**Scenario D — Custom manufacturer**: A seller offers furniture with customer-defined dimensions. Expected: parametric configuration without creating a variant for every possible measurement.

**Scenario E — Configurable equipment**: A seller lists a desktop computer with compatible components. Expected: invalid component combinations are prevented.

**Scenario F — Large supplier**: A supplier imports hundreds of products and updates prices and stock in bulk. Expected: validation, preview, controlled commit and actionable error reporting.

**Scenario G — Multiple sellers**: Two sellers offer the same catalog variant at different prices and stock levels. Expected: global identity remains shared while commercial offers remain independent.

**Scenario H — Concurrent checkout**: Two customers attempt to purchase the last available unit. Expected: inventory consistency is preserved and overselling is prevented.

---

## PART IX — MIGRATION AND IMPLEMENTATION GOVERNANCE

### 42. Existing-system preservation

This constitution does not authorize a destructive rewrite.

Before implementation, audit:

- Existing product models.
- Existing categories and attributes.
- Existing variant structures.
- Seller and supplier models.
- Existing offer and pricing logic.
- Inventory ownership and flows.
- Cart and checkout integration.
- Existing API contracts.
- Frontend product creation and product detail flows.
- Historical orders.
- Tests and production data dependencies.

Map every existing capability to the target architecture. Identify duplication, ownership conflicts and missing capabilities. Preserve existing functionality unless a controlled replacement is explicitly approved.

### 43. Migration strategy

Use incremental, reversible migrations wherever practical.

The sequence must be:

1. Audit current architecture.
2. Establish domain ownership.
3. Document existing data and API dependencies.
4. Identify gaps between current and target models.
5. Define backward-compatible contracts.
6. Introduce or extend the attribute model.
7. Introduce configuration definitions.
8. Implement authoritative configuration validation.
9. Integrate variants with seller offers.
10. Integrate pricing and inventory resolution.
11. Implement seller listing orchestration.
12. Introduce the adaptive frontend.
13. Integrate buyer selection.
14. Validate cart and checkout.
15. Migrate existing records safely.
16. Monitor and retire obsolete paths only after verification.

Do not run destructive migrations without a tested recovery plan. Historical orders must remain intact.

### 44. Phased delivery

**Phase 0 — Architecture audit**

Deliverables: Existing system inventory, domain ownership map, data model assessment, API dependency map, frontend workflow assessment, gap analysis, migration plan.

**Phase 1 — Foundation**

Deliverables: Governed attribute model, category templates, product identity rules, configuration definitions, versioning and validation foundations.

**Phase 2 — Discrete configuration**

Deliverables: Single-option variants, multi-option variants, sparse combinations, deterministic configuration identity, variant resolution.

**Phase 3 — Commercial integration**

Deliverables: Seller offer configuration coverage, pricing resolution, inventory association, offer availability, checkout validation.

**Phase 4 — MSLE seller experience**

Deliverables: Existing product listing, new product listing, adaptive listing workflow, smart defaults, configuration builder, draft recovery, listing validation and publication.

**Phase 5 — Buyer experience**

Deliverables: Metadata-driven selector, dynamic price resolution, availability resolution, configuration-aware cart, order snapshots.

**Phase 6 — Supplier productivity**

Deliverables: Bulk listing, import preview, bulk pricing, bulk stock management, export, catalog maintenance tools.

**Phase 7 — Advanced configuration**

Deliverables: Parametric configuration, composable configuration, advanced dependencies, compatibility rules, advanced commercial resolution.

Advanced capabilities must not delay a reliable simple-product and discrete-variant experience.

---

## PART X — ACCEPTANCE CRITERIA AND GOVERNANCE

### 45. Universal capability acceptance

The architecture is not complete unless:

- Products without variants work naturally.
- Products with one option work naturally.
- Products with multiple options work naturally.
- Invalid combinations cannot be purchased.
- Sparse combinations are supported.
- Configuration identity is deterministic.
- Multiple sellers can offer the same variant independently.
- Prices can differ by seller and configuration.
- Stock can differ by seller and configuration.
- Parametric products do not require infinite variant records.
- Composable products can enforce compatibility.
- Historical orders preserve their original configuration.
- Checkout revalidates all commercially relevant information.

### 46. Seller experience acceptance

The experience is not complete unless:

- A seller can list a simple product without encountering unnecessary variant controls.
- A seller can find and offer an existing catalog product without recreating its details.
- A seller can introduce a genuinely new product.
- A seller can define common options without understanding technical terminology.
- Shared prices and stock can be entered once.
- Individual overrides are available when necessary.
- Invalid combinations are clearly identified.
- Drafts survive interruptions.
- Suppliers can perform bulk operations.
- The experience works effectively on smartphones.
- The system minimizes repeated data entry.
- Sellers retain control over the accuracy of information published under their offers.

### 47. Operational measurement

Measure actual performance and usability.

Core measures:

- Time to first published listing.
- Listing completion time.
- Listing abandonment rate.
- Draft recovery rate.
- Duplicate product rate.
- Configuration validation failure rate.
- Offer publication failure rate.
- Seller correction frequency.
- Bulk operation throughput.
- Support requests related to listing.
- Checkout configuration failure rate.
- Inventory conflict and overselling rate.

Establish baseline measurements before introducing arbitrary performance targets. Use real seller behavior to improve the workflow.

### 48. Non-negotiable engineering rules

The following rules govern all implementation work:

1. Do not duplicate existing domain ownership.
2. Do not create a variant for every possible parameter value.
3. Do not generate invalid combinations.
4. Do not merge products based on name similarity alone.
5. Do not place seller-specific prices or stock in global product identity.
6. Do not expose internal database models as frontend contracts.
7. Do not trust frontend prices, stock or ownership.
8. Do not make advanced configuration compulsory.
9. Do not make bulk operations an afterthought.
10. Do not sacrifice historical order integrity.
11. Do not introduce unnecessary microservices.
12. Do not remove existing functioning capabilities during migration.
13. Do not optimize through assumptions; measure actual bottlenecks.
14. Do not allow UI convenience to bypass business validation.
15. Do not allow backend sophistication to become seller-facing complexity.

---

## PART XI — THE FINAL ARCHITECTURAL LAW

### 49. Separation of responsibility, unity of experience

Maysar must maintain a single authoritative commerce model while providing distinct experiences for the people who use it. The seller, supplier and buyer must never be required to understand the internal separation of catalog, configuration, variants, offers, pricing and inventory.

Those boundaries exist to make the platform reliable, maintainable and scalable. They must not become obstacles to using it.

The architecture therefore follows this governing relationship:

- **MUVA** defines what can be configured.
- **MSLE** defines how sellers create and manage those configurations.
- **Seller Offers** define who can supply them and under what commercial conditions.
- **Pricing** determines the applicable commercial value.
- **Inventory** determines what can actually be fulfilled.
- **The Customer Selector** makes valid choices understandable to buyers.
- **Checkout** validates and commits the final commercial transaction.

All these capabilities operate on one coherent, authoritative commerce foundation.

### 50. The Maysar standard

The ultimate test of this architecture is not how sophisticated its database or configuration engine becomes. It is whether:

- A small retailer can list a product naturally.
- A large supplier can manage thousands of products efficiently.
- A buyer can configure a product without confusion.
- Multiple sellers can compete on the same product without corrupting its identity.
- Maysar can support new categories without redesigning its core architecture.
- The platform can evolve without breaking existing commerce operations.

**Maysar must carry the complexity so its community can carry on with commerce.**

**Powerful infrastructure. Invisible complexity. Effortless commerce.**
