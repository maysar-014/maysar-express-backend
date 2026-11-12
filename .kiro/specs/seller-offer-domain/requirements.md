# Requirements Document

## Introduction

This spec implements ENH-001 from the MUVA+MSLE Constitution Backlog — the Seller Offer domain entity. The constitution (§8) requires a dedicated SellerOffer entity separate from Product and ProductVariant, carrying seller-specific commercial terms: price, stock, condition, fulfillment policy, warranty, return conditions, MOQ, lead time, and offer status. Multiple sellers may offer the same product configuration independently.

**Scope:** Domain layer only — entity, value objects, repository interface, Prisma schema, property-based tests. No API routes or controllers.

## Requirements

### Requirement 1: SellerOffer Entity
**User Story:** As a platform architect, I want a SellerOffer entity separate from Product, so that seller commercial terms are independent from canonical product identity.

1. THE Catalog_Service SHALL create a SellerOffer with: id, productId, sellerId, sellerSku, price, stockAvailable, condition, fulfillmentPolicy, warranty, returnConditions, minimumOrderQuantity, leadTimeDays, status, and configurationCoverage.
2. THE SellerOffer SHALL maintain a lifecycle status of: draft, active, suspended, or archived.
3. THE Catalog_Service SHALL prevent modification of an archived SellerOffer.
4. WHEN a SellerOffer transitions to active, THE Catalog_Service SHALL validate that price > 0 and stockAvailable >= 0.

### Requirement 2: Offer Status Lifecycle
1. THE SellerOffer SHALL support transitions: draft→active, active→suspended, suspended→active, active→archived.
2. THE Catalog_Service SHALL reject invalid transitions (e.g. draft→archived, archived→any).
3. THE Catalog_Service SHALL reject transition to active when price <= 0.

### Requirement 3: Offer Independence
1. WHEN two sellers create offers for the same productId, THE Catalog_Service SHALL treat them as independent offers with no shared mutable state.
2. A SellerOffer SHALL NOT modify or reference another seller's offer.
3. Changing the price on one SellerOffer SHALL NOT affect any other SellerOffer for the same product.

### Requirement 4: Configuration Coverage
1. THE SellerOffer SHALL include an optional configurationCoverage field identifying which product configurations the offer can fulfill.
2. WHEN configurationCoverage is null, THE SellerOffer SHALL cover all configurations of the product (universal coverage).
3. WHEN configurationCoverage is a set of configuration fingerprints, THE SellerOffer SHALL only fulfill those specific configurations.

### Requirement 5: Repository Interface
1. THE Catalog_Service SHALL add a SellerOfferRepository interface to interfaces.ts with: save, findById, findByProductId, findBySellerId, findActiveOffers, findByProductAndSeller.
2. THE repository interface SHALL be defined in the domain layer without coupling to Prisma.

### Requirement 6: Prisma Schema
1. THE Prisma_Schema SHALL include a SellerOffer model linked to Product via productId with all commercial fields, status enum, and configurationCoverage as Json.
2. THE Prisma_Schema SHALL include a unique constraint on [productId, sellerId] to prevent duplicate offers.
3. THE Prisma_Schema SHALL include indexes on productId, sellerId, and status.

### Requirement 7: Property-Based Tests
1. THE Test_Suite SHALL verify that two offers for the same product by different sellers are independent (price change on one does not affect the other).
2. THE Test_Suite SHALL verify that all valid status transitions succeed and all invalid transitions throw.
3. THE Test_Suite SHALL verify that archived offers reject all modifications.
4. THE Test_Suite SHALL verify that universal coverage (null) and fingerprint coverage both work correctly.
5. THE Test_Suite SHALL verify serialization round-trip (toJSON/fromJSON).
