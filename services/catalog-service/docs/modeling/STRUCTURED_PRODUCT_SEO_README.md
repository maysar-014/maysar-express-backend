# Structured Product SEO System - Modeling Documentation

This directory contains all Mermaid diagrams and modeling artifacts for the Structured Product SEO System, following the Software Modeling Constitution (Mermaid-first approach).

## Overview

The Structured Product SEO System introduces a comprehensive framework for managing product listings with:

- Structured attribute schemas per category
- Automated SEO content generation
- Quality scoring and publish gates
- Programmatic SEO page contracts

## Directory Structure

```
modeling/
├── use-cases/
│   └── structured-product-listing.mmd      # Use case diagram
├── sequence/
│   └── structured-product-creation.mmd     # Sequence diagram
├── state-machines/
│   └── product-quality-gate.mmd            # State machine diagram
└── README.md                                # This file
```

## Diagrams

### 1. Use Case Diagram: Structured Product Listing

**File**: `use-cases/structured-product-listing.mmd`

**Purpose**: Shows all actors and use cases in the structured product listing workflow.

**Actors**:

- **Seller**: Creates and manages product listings
- **Admin**: Monitors and manages the catalog system

**Use Cases**:

1. **Load Category Attributes** - Fetch attribute schema for selected category
2. **Preview Description** - Generate and preview SEO content before submission
3. **Create Structured Product** - Submit product with structured attributes
4. **Validate Quality Score** - Compute quality score and enforce publish gate
5. **Publish Product** - Make product visible in catalog

**Key Flows**:

- Seller selects category → system loads attribute schema
- Seller fills attributes → system generates preview
- Seller submits → system validates quality score
- If score ≥ 60 → product published
- If score < 60 → seller must improve

### 2. Sequence Diagram: Structured Product Creation

**File**: `sequence/structured-product-creation.mmd`

**Purpose**: Shows the detailed interaction sequence during product creation.

**Participants**:

- Seller API
- CreateProduct UseCase
- LoadCategoryAttributes UseCase
- DescriptionGenerator Engine
- QualityScorePolicy
- ProductRepository
- EventBus

**Sequence**:

1. Seller loads category attributes
2. Seller submits product with structured attributes
3. UseCase validates attributes against schema
4. DescriptionGenerator creates SEO content
5. SeoTitleGenerator creates optimized title
6. SeoSlug generates URL-safe slug
7. QualityScorePolicy computes quality score
8. If score ≥ 60, product is saved with attributes
9. ProductCreatedWithStructuredDataEvent is published

### 3. State Machine: Product Quality Gate

**File**: `state-machines/product-quality-gate.mmd`

**Purpose**: Shows all product states and transitions through the quality gate.

**States**:

- **DRAFT_INCOMPLETE**: Initial state, quality score < 60
  - Missing required attributes
  - No images uploaded
  - Description too short
- **DRAFT_READY**: Quality score ≥ 60
  - All required attributes filled
  - At least 1 image uploaded
  - Description ≥ 120 characters
- **PUBLISHED**: Product visible in catalog
  - Indexed in search
  - SEO pages generated
- **SUSPENDED**: Admin suspended the product
- **ARCHIVED**: Product archived (terminal state)
- **REJECTED**: Quality score < 40 (terminal state)

**Transitions**:

- DRAFT_INCOMPLETE → DRAFT_READY: Quality score ≥ 60
- DRAFT_INCOMPLETE → REJECTED: Quality score < 40
- DRAFT_READY → PUBLISHED: Seller confirms
- PUBLISHED → SUSPENDED: Admin action
- SUSPENDED → PUBLISHED: Admin unsuspends
- Any state → ARCHIVED: Seller archives

## Quality Scoring System

### Scoring Signals (Total: 100 points)

| Signal                  | Max Points | Criteria                             |
| ----------------------- | ---------- | ------------------------------------ |
| Title Completeness      | 20         | Brand + name + key attribute present |
| Attributes Completeness | 25         | All required attributes filled       |
| Images Uploaded         | 20         | At least 1 image                     |
| Description Length      | 20         | ≥ 120 characters                     |
| Category Accuracy       | 15         | Leaf category selected               |

### Publish Gate

- **Threshold**: 60 points
- **Minimum**: 0 points
- **Maximum**: 100 points

### Score Breakdown Example

```
Title Completeness:      20/20 ✓
Attributes Completeness: 25/25 ✓
Images Uploaded:         20/20 ✓
Description Length:      15/20 (needs 120+ chars)
Category Accuracy:       15/15 ✓
─────────────────────────────────
Total Score:             95/100 ✓ PUBLISHABLE
```

## API Contracts

### Programmatic SEO Page URLs

The system generates the following SEO-friendly URL patterns:

```
maysar.co.tz/products/{categorySlug}/{productSlug}
  → Product detail page
  → Example: /products/cooking-oil/azam-cooking-oil-5l-premium

maysar.co.tz/suppliers/{supplierSlug}
  → Supplier profile page
  → Example: /suppliers/azam-group

maysar.co.tz/{city-slug}/{categorySlug}
  → Location × Category page
  → Example: /dar-es-salaam/cooking-oil

maysar.co.tz/suppliers/{city-slug}/{categorySlug}
  → Supplier location page
  → Example: /suppliers/dar-es-salaam/cooking-oil
```

## Domain Events

### ProductCreatedWithStructuredDataEvent

Emitted when a product is successfully created with structured data.

**Payload**:

```json
{
  "productId": "uuid",
  "sellerId": "uuid",
  "slug": "azam-cooking-oil-5l-premium",
  "categorySlug": "cooking-oil",
  "supplierLocation": "Dar es Salaam",
  "brand": "Azam",
  "seoTitle": "Azam Cooking Oil 5L – Premium Edible Oil",
  "qualityScore": 95
}
```

**Consumers**:

- Search index updater
- SEO page generator
- Supplier profile updater
- Location-category page updater

### ProductSeoPageIndexedEvent

Emitted when SEO pages are indexed.

**Payload**:

```json
{
  "productId": "uuid",
  "slug": "azam-cooking-oil-5l-premium",
  "indexedAt": "2024-01-15T10:30:00Z"
}
```

## Category Attribute Schemas

### Example: Cooking Oil Category

```json
{
  "categoryId": "cooking-oil-uuid",
  "categoryName": "Cooking Oil",
  "categorySlug": "cooking-oil",
  "attributes": [
    {
      "id": "attr-1",
      "name": "volume",
      "displayLabel": "Volume",
      "type": "SELECT",
      "isRequired": true,
      "options": ["1L", "2L", "5L", "10L", "20L"],
      "placeholder": "Select volume"
    },
    {
      "id": "attr-2",
      "name": "oil_type",
      "displayLabel": "Oil Type",
      "type": "SELECT",
      "isRequired": true,
      "options": ["Vegetable", "Sunflower", "Palm", "Coconut"],
      "placeholder": "Select oil type"
    },
    {
      "id": "attr-3",
      "name": "packaging",
      "displayLabel": "Packaging Type",
      "type": "SELECT",
      "isRequired": false,
      "options": ["Bottle", "Can", "Pouch"],
      "placeholder": "Select packaging"
    }
  ]
}
```

## Implementation Checklist

- [x] Value Objects (StructuredProductAttributes, QualityScore, SeoSlug)
- [x] Engines (DescriptionGenerator, SeoTitleGenerator)
- [x] Policies (ProductQuality, DescriptionValidation)
- [x] Use Cases (LoadCategoryAttributes, PreviewDescription, CreateProduct)
- [x] Repositories (CategoryAttribute, ProductAttribute)
- [x] API Routes (GET /categories/:id/attributes, POST /products/preview-description)
- [x] Domain Events (ProductCreatedWithStructuredData, ProductSeoPageIndexed)
- [x] Modeling Documentation (this file + diagrams)
- [ ] Test Suites (unit, integration, E2E)
- [ ] Image SEO Auto-Generation
- [ ] CI/CD Pipeline Configuration

## Related Documentation

- **Architecture**: See `architecture_constitution.md` for Clean Architecture patterns
- **API**: See `api-documentation-constitution.md` for OpenAPI 3.1.0 contracts
- **Testing**: See `testing-constitution.md` for test strategy
- **Events**: See `SAGA_ORCHESTRATION_SYSTEM.md` for event handling

## Maintenance

When updating the system:

1. Update relevant Mermaid diagrams
2. Update this README with new use cases/states
3. Keep diagrams in sync with code
4. Document new domain events
5. Update API contracts

## References

- **Maysar Architecture Constitution**: Clean Architecture + Saga Orchestration
- **Software Modeling Constitution**: Mermaid-first approach
- **API Documentation Constitution**: OpenAPI 3.1.0, contract-first
