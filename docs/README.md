# Documentation Index

Central navigation for all Maysar platform documentation. These pages describe the current module-based monolith unless a document is explicitly marked historical.

## Getting Started

- [Developer Training](developer-training/README.md) - Guided tutorials for onboarding, architecture, testing, and feature work

- [Developer Guide](DEVELOPER_GUIDE.md) — Architecture overview, local setup, adding modules
- [Modeling Quick Start](MODELING_QUICK_START.md) — How to create and update Mermaid diagrams
- [Diagram Maintenance Guide](DIAGRAM_MAINTENANCE_GUIDE.md) — Diagram update workflow and conventions

## Chat System

- [Chat System Documentation](chat-system/CHAT_SYSTEM.md) — Full reference: architecture, REST API, WebSocket, flows, trust & safety, background jobs, and how to use it

## Architecture

- [Architecture Constitution](../architecture_constitution.md) - Governance rules for the modular monolith
- [Software Modeling Constitution](../software-modeling-constitution.md) - Modeling standards and diagram types
- [API Documentation Constitution](../api-documentation-constitution.md) - OpenAPI and endpoint documentation standards
- [Testing Constitution](../testing-constitution.md) - Testing standards and coverage requirements
- [Integration Constitution](../integration_constitution.md) - Inter-module integration standards
- [Containerization Constitution](../containerization_constitution.md) - Container and deployment standards
- [Performance Constitution](../performance_constitution.md) - Binding page-load budgets, API latency rules, and performance enforcement

## System Design Diagrams

- [System Overview](modeling/system-context/system-overview.mmd)
- [Service Containers](modeling/containers/service-containers.mmd)
- [Event Bus Architecture](modeling/event-flows/event-bus-architecture.mmd)
- [Saga Orchestration Overview](modeling/event-flows/saga-orchestration-overview.mmd)
- [Database Architecture](modeling/infrastructure/database-architecture.mmd)

## Cross-Service Flows

- [Order Fulfillment Flow](modeling/cross-service/order-fulfillment-flow.mmd)
- [Payment Processing Flow](modeling/cross-service/payment-processing-flow.mmd)
- [Business Registration Flow](modeling/cross-service/business-registration-flow.mmd)
- [Product Publishing Flow](modeling/cross-service/product-publishing-flow.mmd)

## Flow Docs

- [Flow Docs](Flow%20Docs/README.md) â€” Persona-oriented journey maps with happy paths, unhappy paths, and sequence diagrams

## Operations

- [Docker Orchestration](docker-orchestration.md)
- [Staging Environment](staging-environment.md)
- [GitHub Actions CI/CD](github-actions-cicd.md)
- [Governance Engine Roadmap](governance-engine-roadmap.md)
- [Secrets Management](secrets-management.md)
- [Disaster Recovery](disaster-recovery.md)
- [Incident Playbook](incident-playbook.md)
- [Container Security Checklist](container-security-checklist.md)
- [Load Testing Results](load-testing-results.md)
- [Container Resource Tuning](container-resource-tuning.md)
- [Environment Variables Migration](environment-variables-migration.md)
- [Module Communication](module-communication.md)
- [Service Consolidation](service-consolidation.md)
- [Fraud Scoring](fraud-scoring.md)
- [Operations](operations.md)
- [System Operations Documentation](SYSTEM_OPERATIONS_DOCUMENTATION.md)
- [Database Migration Plan](database-migration-plan.md)
- [Dependency Analysis](dependency-analysis.md)
- [Visual Guide](visual-guide.md)
- [Investment Readiness Report](business/MAYSAR_INVESTMENT_READINESS_REPORT.md)

## Event Bus

- [Event Bus Architecture Diagram](event-bus/EVENT_BUS_ARCHITECTURE_DIAGRAM.md)
- [Event Bus Unification Summary](event-bus/EVENT_BUS_UNIFICATION_SUMMARY.md)

## Saga

- [Saga Orchestration System](saga/SAGA_ORCHESTRATION_SYSTEM.md)

## Testing

- [E2E Test Catalog](testing/E2E_TEST_CATALOG.md)
- [Integration Test Catalog](testing/INTEGRATION_TEST_CATALOG.md)
- [Manual vs Automated](testing/MANUAL-VS-AUTOMATED.md)

## Frontend Integration

- [Logistics Frontend Integration Guide](frontend/LOGISTICS_FRONTEND_INTEGRATION_GUIDE.md)
- [Logistics Frontend UI Specifications](frontend/LOGISTICS_FRONTEND_UI_SPECIFICATIONS.md)

## Service Modules

| Service | README | OpenAPI |
|---------|--------|---------|
| analytics-service | [README](../services/analytics-service/README.md) | — |
| auth-service | [README](../services/auth-service/README.md) | — |
| business-registry-service | [README](../services/business-registry-service/README.md) | — |
| catalog-service | [README](../services/catalog-service/README.md) | — |
| checkout-service | [README](../services/checkout-service/README.md) | — |
| commission-service | [README](../services/commission-service/README.md) | — |
| community-service | [README](../services/community-service/README.md) | [openapi.yaml](../services/community-service/openapi.yaml) |
| governance-service | [README](../services/governance-service/README.md) | — |
| compliance-service | [README](../services/compliance-service/README.md) | — |
| enabler-service | [README](../services/enabler-service/README.md) | [openapi.yaml](../services/enabler-service/openapi.yaml) |
| inventory-service | [README](../services/inventory-service/README.md) | — |
| logistics-service | [README](../services/logistics-service/README.md) | [openapi.yaml](../services/logistics-service/openapi.yaml) |
| maps-service | [README](../services/maps-service/README.md) | — |
| notification-service | [README](../services/notification-service/README.md) | — |
| order-service | [README](../services/order-service/README.md) | [openapi.yaml](../services/order-service/openapi.yaml) |
| payment-service | [README](../services/payment-service/README.md) | — |
| payout-service | [README](../services/payout-service/README.md) | — |
| production-service | [README](../services/production-service/README.md) | — |
| support-service | [README](../services/support-service/README.md) | — |
| training-service | [README](../services/training-service/README.md) | [openapi.yaml](../services/training-service/openapi.yaml) |
| user-service | [README](../services/user-service/README.md) | [openapi.yaml](../services/user-service/openapi.yaml) |
| wallet-service | [README](../services/wallet-service/README.md) | — |
| chat-service | [Chat System Docs](chat-system/CHAT_SYSTEM.md) | — |

## Shared Libraries

- [shared/README.md](../shared/README.md) — Index of all shared modules
- [shared-contracts/README.md](../shared-contracts/README.md) — Cross-service event and type contracts
- [events/README.md](../events/README.md) — Event catalog and schema registry


