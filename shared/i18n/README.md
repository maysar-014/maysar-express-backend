# shared/i18n

i18next configuration with English and Swahili locales and Express HTTP middleware for language detection.

## Purpose

Provides internationalization for API responses, error messages, and notifications. Supports English (`en`) and Swahili (`sw`) — the two primary languages of the Tanzania market. Language is detected from the `Accept-Language` HTTP header.

## Exports

| Export | Description |
|--------|-------------|
| `i18next` | Configured i18next instance |
| `i18nextMiddleware` | Express middleware for language detection and `req.t()` |
| `t(key, options?)` | Translation function for use outside request context |

## Usage

```typescript
import { i18nextMiddleware, t } from '@shared/i18n/i18n';

// Mount middleware (detects Accept-Language header)
app.use(i18nextMiddleware.handle(i18next));

// In a controller (uses request language)
res.json({ message: req.t('payment.success') });

// Outside request context (uses fallback language)
const msg = t('notification.order_shipped', { orderId: 'ord_01J...' });
```

## Locale Files

```
shared/i18n/locales/
├── en/
│   ├── common.json
│   ├── payment.json
│   ├── notification.json
│   └── compliance.json
└── sw/
    ├── common.json
    ├── payment.json
    ├── notification.json
    └── compliance.json
```

## Namespaces

| Namespace | Description |
|-----------|-------------|
| `common` | Shared UI strings, error messages |
| `payment` | Payment flow messages |
| `notification` | Notification templates |
| `compliance` | Compliance and KYC messages |

## Configuration

| Setting | Value |
|---------|-------|
| Fallback language | `en` |
| Supported languages | `en`, `sw` |
| Detection order | `Accept-Language` header |
| Backend | `i18next-fs-backend` (file system) |

## Dependencies

- `i18next` — core i18n framework
- `i18next-fs-backend` — file system locale loader
- `i18next-http-middleware` — Express integration and language detection
