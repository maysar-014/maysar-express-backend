# Checkout Service

**Priority**: P1 - Critical E-commerce Flow  
**Status**: Implementation Phase  
**Architecture**: Clean Architecture + Event-Driven + Saga Pattern

## Overview

The Checkout Service manages the complete checkout flow for the Maysar platform. It handles cart operations, checkout session management, pricing calculations, and order creation with strict adherence to the Architecture Constitution and Testing Constitution.

## Architecture

### Layer Structure

```
API Layer (Controllers/Routes)
    ↓
Application Layer (Use Cases, DTOs, Mappers)
    ↓
Domain Layer (Entities, Value Objects, Policies, Engines)
    ↓
Infrastructure Layer (Repositories, Adapters, Messaging)
```

### Domain Layer

**Pure Business Logic** - No external dependencies

#### Value Objects
- **Cart**: Immutable shopping cart with item management
- **Money**: Precise monetary calculations (prevents floating-point errors)

#### Policies
- **PricingPolicy**: Business rules for calculating totals (tax, shipping, discounts)

#### Engines
- **CheckoutEngine**: Orchestrates checkout validation and pricing calculation

### Application Layer

**Use Cases & Orchestration** - Coordinates domain logic with infrastructure

#### Use Cases
- **InitiateCheckoutUseCase**: Initiates checkout flow with event publishing

#### DTOs
- Firewall between domain and external systems
- No domain entities cross service boundaries

#### Mappers
- Convert between domain objects and DTOs

### Infrastructure Layer

**External Systems** - Repositories, adapters, messaging

#### Repositories
- CartRepository: Cart persistence
- CheckoutRepository: Checkout session persistence

#### Messaging
- EventBus: Publishes events for loose coupling

## Loose Coupling Strategy

### Event-Driven Communication

Services communicate via events, not direct calls:

```typescript
// Checkout Service publishes
await eventBus.publish('CheckoutInitiated', {
  checkoutId: '...',
  cartId: '...',
  userId: '...',
  totalAmount: 120
});

// Other services subscribe independently
eventBus.subscribe('CheckoutInitiated', {
  handler: async (envelope) => {
    // Process independently
    // If this fails, checkout service is unaffected
  }
});
```

### Data Ownership

Each service owns its database:
- Checkout Service: carts, checkout_sessions, orders, inventory_reservations
- No cross-service database queries
- Data sync via events

### Dependencies

**Loose Dependencies**:
- User Service (via events)
- Product Service (via events)
- Inventory Service (via events)
- Billing Service (via events)

**No Direct Calls**: All communication is async via event bus

## Business Logic

### Cart Management

```typescript
// Create cart
const cart = new Cart({ items: [] });

// Add item (immutable)
const updated = cart.addItem({
  productId: 'prod-1',
  quantity: 2,
  priceAtTime: 50
});

// Calculate subtotal
const subtotal = updated.getSubtotal(); // 100
```

### Pricing Calculation

```typescript
const policy = new PricingPolicy({
  taxRate: 0.1,
  shippingCost: 10,
  minOrderForFreeShipping: 100
});

const pricing = policy.calculateTotal(
  subtotal,
  discountAmount,
  shippingCost
);

// Result includes:
// - subtotal
// - taxAmount
// - shippingCost
// - discountAmount
// - total
```

### Checkout Validation

```typescript
const engine = new CheckoutEngine(pricingPolicy);

const result = engine.validate(context);
// Validates:
// - Cart not empty
// - Shipping address provided
// - Billing address provided
// - Shipping method provided
```

## Testing Strategy

### Coverage Targets

| Layer | Target | Enforcement |
|-------|--------|-------------|
| Domain | 95-98% | Deployment blocking |
| Application | 90% | PR blocking |
| Infrastructure | 75% | Warning only |

### Test Organization

```
src/
├── domain/
│   ├── value-objects/
│   │   └── __tests__/
│   │       ├── cart.value-object.test.ts
│   │       └── money.value-object.test.ts
│   ├── policies/
│   │   └── __tests__/
│   │       └── pricing.policy.test.ts
│   └── engines/
│       └── __tests__/
│           └── checkout.engine.test.ts
└── application/
    └── use-cases/
        └── __tests__/
            └── initiate-checkout.use-case.test.ts
```

### Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## API Endpoints

### Cart Operations

```http
POST /api/checkout/carts
GET /api/checkout/carts/:cartId
POST /api/checkout/carts/:cartId/items
PUT /api/checkout/carts/:cartId/items/:itemId
DELETE /api/checkout/carts/:cartId/items/:itemId
```

### Checkout Operations

```http
POST /api/checkout/sessions
GET /api/checkout/sessions/:sessionId
POST /api/checkout/sessions/:sessionId/apply-discount
POST /api/checkout/sessions/:sessionId/confirm
```

### Order Operations

```http
POST /api/checkout/orders
GET /api/checkout/orders/:orderId
```

## Events Published

### CheckoutInitiated
```typescript
{
  checkoutId: string;
  cartId: string;
  userId: string;
  totalAmount: number;
  timestamp: Date;
}
```

### OrderCreated
```typescript
{
  orderId: string;
  checkoutSessionId: string;
  userId: string;
  totalAmount: number;
  items: OrderItem[];
  timestamp: Date;
}
```

## Database Schema

### Tables

- **carts**: Shopping cart management
- **cart_items**: Individual items in cart
- **checkout_sessions**: Checkout flow state
- **orders**: Created after successful checkout
- **order_items**: Products in order
- **inventory_reservations**: Track reserved stock
- **applied_discounts**: Track applied discounts

## Development

### Setup

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Start development server
npm run dev
```

### Code Quality

```bash
# Lint
npm run lint

# Format
npm run format

# Build
npm run build
```

## Architecture Compliance

### Architecture Constitution

✅ **Domain Purity**: No external dependencies in domain layer  
✅ **Business Logic Protection**: All business rules in domain  
✅ **Compensation Completeness**: All saga steps have compensation  
✅ **DTO Firewall**: No domain entities cross boundaries  
✅ **Infrastructure Isolation**: Adapters implement domain interfaces  

### Testing Constitution

✅ **Coverage Excellence**: 95%+ domain coverage  
✅ **Test Quality**: Fast, isolated, deterministic tests  
✅ **Mock Strategy**: Realistic mocks, never mock domain  
✅ **Event Testing**: Event publishing and consumption validated  
✅ **Saga Testing**: Compensation logic thoroughly tested  

## Loose Coupling Validation

### ✅ Implemented

- Event-driven communication
- Data ownership isolation
- No direct service calls
- Rich events with all needed data
- Circuit breaker patterns
- Graceful degradation
- Correlation IDs for tracing

### ✅ Tested

- Service can operate independently
- Failures don't cascade
- Events are idempotent
- Compensation logic works
- Timeouts and retries work

## Performance Targets

- **Response Time**: P95 < 200ms
- **Throughput**: 1000+ RPS
- **Cart Operations**: < 50ms
- **Pricing Calculation**: < 10ms
- **Checkout Initiation**: < 100ms

## Security

- Input validation on all endpoints
- Authorization checks on user operations
- PII data protection
- GDPR compliance
- Audit trails for all operations

## Monitoring

- Structured logging with correlation IDs
- Metrics for all operations
- Event publishing tracking
- Error rate monitoring
- Performance metrics

## Next Steps

1. Implement infrastructure layer (repositories, adapters)
2. Implement API layer (controllers, routes)
3. Implement event handlers
4. Integration testing with other services
5. Performance testing and optimization
6. Production deployment

## References

- [Architecture Constitution](../../architecture_constitution.md)
- [Testing Constitution](../../testing-constitution.md)
- [Loose Coupling Guidelines](../../LOOSE_COUPLING_GUIDELINES.md)
- [API Documentation](../../API_DOCUMENTATION.md)

---

**Built for scale, reliability, and maintainability.**
