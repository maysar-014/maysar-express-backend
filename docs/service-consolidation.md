# Service Consolidation Log

## Merged Services

| Standalone Service | Absorbed Into | Effective Date | Rationale |
|---|---|---|---|
| session-service (port 3007) | auth-service (/api/v1/sessions) | Phase 10 | Shared auth context, no cross-domain events |
| two-factor-service (port 3010) | auth-service (/api/v1/auth/2fa) | Phase 10 | Tightly coupled to auth lifecycle |
| sms-service (port 3009) | notification-service (/api/v1/sms) | Phase 10 | Unified delivery channel management |
| campaign-service | catalog-service | Phase 10 | Campaign logic is catalog-scoped |
| pricing-service | catalog-service | Phase 10 | Buy-box engine owns pricing decisions |

## API Endpoint Mapping
(old → new)
- POST /api/v1/2fa/* → POST /api/v1/auth/2fa/*
- POST /api/v1/sms/send → POST /api/v1/sms/send (same path, new host)
- POST /api/v1/sessions → POST /api/v1/sessions (same path, new host)

## shared-contracts Changes
- campaign-service-contracts.ts now re-exports from CatalogService.Campaign
- pricing-service-contracts.ts now re-exports from CatalogService.Pricing

## Migration Notes
- No database schema changes required
- Environment variables SMS_PROVIDER, AFRICASTALKING_* must be present in auth-service and notification-service env blocks
- TWO_FACTOR_ENCRYPTION_KEY must be present in auth-service env
