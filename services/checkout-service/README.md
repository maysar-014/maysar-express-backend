# Checkout Service

Enterprise-grade checkout microservice with complete business logic, data integrity, and observability.

## Architecture

### Layers

1. **Domain Layer** - Pure business logic with no external dependencies
   - Value Objects: Money, Cart
   - Policies: PricingPolicy
   - Engines: CheckoutEngine

2. **Application Layer** - Use cases and orchestration
   - Use Cases: InitiateCheckoutUseCase
   - Sagas: OrderFulfillmentSaga
   - Event Handlers: CheckoutEventHandlers
   - DTOs: Data transfer objects

3. **Infrastructure Layer** - External integrations
   - Repositories: CartRepository, CheckoutRepository
   - Services: InventoryReservationService, DiscountService, OrderService
   - Event Bus: EventBusAdapter

4. **API Layer** - HTTP endpoints
   - Controllers: CartController, CheckoutController
   - Routes: Checkout routes
   - Middleware: Validation, authentication, error handling

### Shared Infrastructure

- **Error Handling**: Custom exceptions with error codes
- **Logging**: Structured logging with correlation IDs
- **Configuration**: Environment-based configuration
- **Validation**: Input and business rule validation
- **Idempotency**: Prevent duplicate processing
- **Transaction Management**: Ensure data consistency
- **Event Sourcing**: Audit trail of all changes
- **Optimistic Locking**: Handle concurrent updates
- **Health Checks**: Liveness and readiness probes

## API Endpoints

### Cart Operations

```
POST   /api/checkout/cart/add       - Add item to cart
POST   /api/checkout/cart/remove    - Remove item from cart
GET    /api/checkout/cart/:cartId   - Get cart details
POST   /api/checkout/cart/clear     - Clear cart
```

### Checkout Operations

```
POST   /api/checkout/initiate       - Initiate checkout
GET    /api/checkout/session/:id    - Get checkout session
POST   /api/checkout/confirm        - Confirm checkout
```

### Health Checks

```
GET    /health/live                 - Liveness probe
GET    /health/ready                - Readiness probe
GET    /health                      - Full health check
```

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- npm or yarn

### Installation

```bash
npm install
```

### Configuration

```bash
cp .env.example .env
# Edit .env with your configuration
```

### Database Setup

```bash
npx prisma migrate dev
npx prisma generate
```

### Running

```bash
# Development
npm run dev

# Production
npm run build
npm start

# Testing
npm test
npm run test:coverage
```

## Features

### Data Integrity

- **Transactions**: ACID compliance for multi-step operations
- **Idempotency**: Prevent duplicate processing with idempotency keys
- **Optimistic Locking**: Handle concurrent updates safely
- **Event Sourcing**: Complete audit trail of all changes

### Reliability

- **Error Handling**: Comprehensive error codes and messages
- **Validation**: Input and business rule validation
- **Health Checks**: Liveness and readiness probes
- **Structured Logging**: Correlation IDs for request tracing

### Observability

- **Structured Logging**: JSON logs with correlation IDs
- **Health Endpoints**: Monitor service status
- **Event Audit Trail**: Track all state changes
- **Error Tracking**: Detailed error information

## Error Codes

- `VALIDATION_ERROR` - Input validation failed
- `CART_NOT_FOUND` - Cart does not exist
- `CHECKOUT_SESSION_NOT_FOUND` - Checkout session not found
- `CART_EMPTY` - Cart has no items
- `INSUFFICIENT_INVENTORY` - Not enough stock
- `DISCOUNT_EXPIRED` - Discount code expired
- `PAYMENT_FAILED` - Payment processing failed
- `DATABASE_ERROR` - Database operation failed
- `INTERNAL_SERVER_ERROR` - Unexpected error

## Testing

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# Coverage report
npm run test:coverage

# Watch mode
npm run test:watch
```

## Deployment

### Docker

```bash
docker build -t checkout-service:latest .
docker run -p 3008:3008 --env-file .env checkout-service:latest
```

### Kubernetes

```bash
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
```

## Monitoring

### Health Checks

- **Liveness**: `/health/live` - Is the service running?
- **Readiness**: `/health/ready` - Is the service ready to accept traffic?
- **Full Health**: `/health` - Detailed health status

### Logging

All logs are structured JSON with correlation IDs for distributed tracing.

```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "level": "INFO",
  "message": "Checkout initiated",
  "correlationId": "abc-123",
  "service": "checkout-service",
  "data": { "checkoutId": "xyz-789" }
}
```

## Contributing

1. Create feature branch
2. Write tests
3. Ensure coverage > 90%
4. Submit pull request

## License

MIT
