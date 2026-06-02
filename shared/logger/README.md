# shared/logger

Winston-based structured logger factory with service context, correlation ID propagation, and specialized logging methods.

## Purpose

Provides a consistent logging interface across all service modules. In development, logs are colorized and human-readable. In production, logs are JSON-formatted and written to both console and rotating log files. All log entries include `service`, `context`, and `timestamp` fields.

## Exports

| Export | Description |
|--------|-------------|
| `createLogger(context, serviceName)` | Factory — returns a `ServiceLogger` instance |
| `createServiceLogger(serviceName)` | Creates a raw Winston logger |
| `ServiceLogger` | Class with `info`, `warn`, `error`, `debug`, `audit`, `performance`, `security`, `api`, `database` methods |
| `appLogger` | Default logger for the core application (`context: 'application'`) |
| `LogContext` | Interface: `{ requestId?, correlationId?, sagaId?, eventId?, executionTime? }` |

## Usage

```typescript
import { createLogger } from '@shared/logger/logger';

const logger = createLogger('PaymentController', 'payment-service');

logger.info('Payment initiated', { correlationId: 'req-123', orderId: 'ord_01J...' });
logger.error('Gateway timeout', new Error('ETIMEDOUT'), { gateway: 'paymentGateway' });
logger.audit('PAYMENT_CAPTURED', userId, 'Payment', { amount: 5000 });
logger.performance('buy-box-computation', 45); // 45ms
logger.security('SUSPICIOUS_LOGIN', 'high', { ip: '1.2.3.4' });
```

## Log Levels

`error` > `warn` > `info` > `debug` — controlled by `LOG_LEVEL` env var.

## Configuration

| Env Var | Default | Description |
|---------|---------|-------------|
| `NODE_ENV` | `development` | `production` enables file transports and JSON format |
| `LOG_LEVEL` | `info` | Minimum log level |

## File Output (production only)

- `logs/{serviceName}.log` — all levels, 5 MB max, 30 files rotation
- `logs/{serviceName}-error.log` — errors only, same rotation policy

## Dependencies

- `winston` — logging framework
