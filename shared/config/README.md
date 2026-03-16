# shared/config

Service base URL helpers for constructing intra-platform API URLs.

## Purpose

Provides a single place to resolve the platform's base URL and construct per-service API URLs. Reads from environment variables with a sensible localhost default for development.

## Exports

| Export | Description |
|--------|-------------|
| `getPlatformBaseUrl()` | Returns the platform base URL (trailing slash stripped) |
| `getServiceBaseUrl(serviceName)` | Returns `{baseUrl}/api/{serviceName}` |

## Usage

```typescript
import { getServiceBaseUrl } from '@shared/config/service-base-url';

const paymentUrl = getServiceBaseUrl('payment-service');
// → "http://localhost:3000/api/payment-service"  (development)
// → "https://api.maysar.co.tz/api/payment-service"  (production)
```

## Configuration

| Env Var | Default | Description |
|---------|---------|-------------|
| `PLATFORM_BASE_URL` | — | Primary base URL override |
| `BASE_URL` | `http://localhost:3000` | Fallback base URL |

## Dependencies

None — no external dependencies.
