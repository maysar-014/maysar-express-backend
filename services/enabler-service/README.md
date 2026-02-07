# Enabler Service

The Enabler Service allows third-party individuals and businesses ("Enablers") to facilitate sales for existing products on the Maysar platform and earn commissions. It is designed to expand market reach through a decentralized sales network.

## Architecture

This service follows the **Maysar Monolithic Architecture Constitution**, employing **Clean Architecture** and **Saga Orchestration**.

### Layers

-   **Domain**: Contains all business logic (Entities, Value Objects, Engines, Policies, Algorithms). No external dependencies.
-   **Application**: Orchestrates use cases and sagas. Depends only on Domain.
-   **Infrastructure**: Implements interfaces defined in Domain (Repositories, Messaging). Depends on external systems (DB, Bus).
-   **API**: Handles HTTP requests and Input/Output. Depends on Application.

## Key Features

-   **Enabler Onboarding**: Registration, eligibility checks, and approval workflows.
-   **Tier System**: Bronze, Silver, Gold, Platinum tiers based on performance.
-   **Product Listing**: Enablers can list generic products with custom terms.
-   **Order Facilitation**: Enablers facilitate orders between buyers and original sellers.
-   **Commission System**: Automated commission calculation and settlement.

## API Documentation

See `docs/` for detailed guides and modeling diagrams.
