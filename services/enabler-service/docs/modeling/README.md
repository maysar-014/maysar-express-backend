# Enabler Service Modeling

This directory contains the architectural models for the Enabler Service, complying with the **Maysar Modeling Constitution**.

## Contents

-   **Use Cases**: `use-cases/` - Detailed descriptions of system interactions.
-   **State Machines**: `state-machines/` - Lifecycle models for Enablers, Orders, and Listings.
-   **Sequence Diagrams**: `sequence/` - Flow of control for critical operations.
-   **Domain Model**: `domain-model.md` - Conceptual model of entities and relationships.
-   **Diagrams**: `diagrams.md` - Visual representations of the domain model (Class Diagrams).

## Diagrams

Please refer to [diagrams.md](./diagrams.md) for visual representations of the Enabler Service domain model.

## Domain Model

### Core Entities

-   **Enabler**: The central actor. Has `Tier`, `Status`, and `PerformanceMetrics`.
-   **ProductListing**: A projection of a Catalog Product specific to an Enabler.
-   **EnablerOrder**: An order facilitated by an Enabler. Links `Buyer`, `Seller`, and `Enabler`.
-   **EnablerCommission**: Financial record of earnings.

### Key Value Objects

-   **CommissionTier**: Defines rates and benefits for each tier.
-   **VerificationStatus**: Tracks the onboarding process.
