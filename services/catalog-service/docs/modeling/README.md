# Catalog Matching Engine - UML Models

This directory contains UML diagrams documenting the behavior and interactions of the Catalog Matching Engine.

## Use Case Diagrams

### [Catalog Matching Use Cases](./use-cases/catalog-matching.mmd)
Defines system boundaries, actors (Seller, System), and business goals for the matching workflow.

**Key Use Cases:**
- Match Product Against Catalog
- Confirm Product Match
- Create New Product
- View Pending Confirmations
- View Match Audit Trail

## State Machine Diagrams

### [Product Matching Flow](./state-machines/product-matching-flow.mmd)
Documents the complete lifecycle of a product matching operation from submission to final decision.

**States:**
- CANDIDATE → EXACT_MATCH / STRONG_MATCH / POSSIBLE_MATCH / NO_MATCH
- AUTO_MERGED (for EXACT/STRONG)
- PENDING_CONFIRMATION (for POSSIBLE)
- SELLER_CONFIRMED / SELLER_REJECTED
- MERGED / NEW_PRODUCT

### [Match Confirmation Lifecycle](./state-machines/match-confirmation-lifecycle.mmd)
Tracks the lifecycle of seller confirmation requests.

**States:**
- PENDING (awaiting seller response)
- CONFIRMED (seller accepted match)
- REJECTED (seller declined match)
- EXPIRED (24-hour timeout)

## Sequence Diagrams

### [Match Product Flow](./sequence/match-product-flow.mmd)
Documents the execution of `MatchProductUseCase` including:
- Candidate preparation (normalization, fingerprint generation)
- Querying existing products
- Running matching engine
- Creating audit records
- Publishing events
- Returning results for all match levels

### [Confirm Match Flow](./sequence/confirm-match-flow.mmd)
Documents the execution of `ConfirmProductMatchUseCase` including:
- Validation of confirmation request
- Status updates
- Audit trail updates
- Event publishing
- Error handling

### [Matching Engine Internals](./sequence/matching-engine-internals.mmd)
Low-level documentation of `CatalogMatchingEngine.matchProduct()` algorithm:
- Identifier matching logic
- Fingerprint matching logic
- Similarity calculation workflow
- Criteria building
- Match result determination

## Viewing Diagrams

### VS Code
Install the [Mermaid Preview](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid) extension.

### Online
Copy the `.mmd` file contents to [Mermaid Live Editor](https://mermaid.live/).

### Documentation
Diagrams are embedded in markdown documentation:
- [Technical Documentation](../CATALOG_MATCHING_ENGINE.md)
- [Seller Guide](../SELLER_MATCHING_GUIDE.md)

## Maintenance

> **Critical**: Diagrams MUST be updated in the same PR as code changes they reflect.

When updating:
1. Modify the `.mmd` file
2. Update corresponding documentation if needed
3. Verify diagram renders correctly
4. Include in PR with code changes

## Standards

All diagrams follow the [Software Modeling Constitution](../../../../software-modeling-constitution.md):
- Use Mermaid syntax
- Store as `.mmd` files
- Maintain appropriate abstraction levels
- Keep synchronized with code
