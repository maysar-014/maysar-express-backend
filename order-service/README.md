# Order Service

بسم الله الرحمن الرحيم

## Overview

The Order Service is a pure, domain-driven microservice that manages the complete order lifecycle within the Maysar Digital Community Trade Network. Built following Clean Architecture principles with strict separation of concerns, it handles order creation, validation, payment processing, and financial settlement while delegating logistics operations to the dedicated logistics service.

## Architecture

### Clean Architecture Structure

Following the **Architecture Constitution**, the service implements Clean Architecture with four distinct layers:

```
order-service/
├── src/
│   ├── domain/                # Business Logic Layer (Pure)
│   │   ├── entities/          # Order entity & business rules
│   │   ├── value-objects/     # Address, Money value objects
│   │   ├── events/            # Domain events (OrderCreated)
│   │   ├── engines/           # Business engines (Settlement, Inventory)
│   │   ├── policies/          # Business policies (COD, Cancellation)
│   │   └── repositories/      # Repository interfaces
│   │
│   ├── application/           # Application Layer (Use Cases & Orchestration)
│   │   ├── use-cases/         # PlaceOrder use case
│   │   ├── sagas/             # Order orchestration sagas
│   │   ├── dto/               # Application DTOs
│   │   └── mappers/           # Object mappers
│   │
│   ├── infrastructure/        # Infrastructure Layer (External Concerns)
│   │   ├── repositories/      # Repository implementations
│   │   ├── messaging/         # Event publishing
│   │   ├── providers/         # External service adapters (PesaPal)
│   │   └── cache/             # Caching layer
│   │
│   ├── api/                   # Interface Layer (Transport)
│   │   ├── controllers/       # HTTP request handlers
│   │   ├── routes/            # Route definitions
│   │   └── validators/        # Request validation
│   │
│   └── main.ts                # Composition Root
│
├── test/                      # Test suites
├── docker/                    # Containerization
└── package.json
```

### Key Architectural Principles

- **Single Responsibility**: Order service focuses solely on order management
- **Dependency Inversion**: Domain layer defines interfaces, infrastructure implements them
- **Clean Boundaries**: No logistics dependencies (routing, delivery, couriers)
- **Event-Driven**: Domain events for cross-service communication
- **Saga Orchestration**: Distributed transactions for complex order flows

## Key Features

### Core Capabilities
- **Order Creation & Validation**: Comprehensive order validation with business rules
- **Payment Processing**: Integrated PesaPal payment gateway support
- **Financial Settlement**: Commission calculation and seller payouts
- **Inventory Integration**: Real-time inventory checking and reservation
- **Event Publishing**: Domain events for order lifecycle notifications

### Business Rules
- **COD Policy**: Cash-on-delivery validation and processing
- **Cancellation Policy**: Order cancellation business rules
- **Settlement Engine**: Platform commission and payout calculations
- **Order State Machine**: Proper order lifecycle management

### Integration Points
- **Payment Gateway**: PesaPal for card/mobile money payments
- **Inventory Service**: Real-time stock validation
- **Event Bus**: Domain event publishing for other services
- **External Systems**: Clean adapter pattern for third-party integrations

## API Endpoints

```
POST /api/orders          # Create new order
GET  /api/orders/:id      # Get order details
```

### Place Order Request
```json
{
  "buyerId": "buyer_123",
  "sellerId": "seller_456",
  "items": [
    {
      "productId": "prod_789",
      "quantity": 2,
      "price": 15000,
      "weight": 1.5
    }
  ],
  "currency": "TZS",
  "paymentMethod": "CARD",
  "deliveryAddress": {
    "street": "123 Main St",
    "city": "Dar es Salaam",
    "postalCode": "11101",
    "country": "TZ"
  }
}
```

## Development

### Prerequisites
- Node.js 18+
- TypeScript 5.0+
- npm or yarn

### Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run production server
npm start

# Run tests
npm test

# Run linting
npm run lint
```

### Environment Variables
```env
PORT=3002
PESAPAL_CONSUMER_KEY=your_key
PESAPAL_CONSUMER_SECRET=your_secret
PESAPAL_URL=https://cybqa.pesapal.com/pesapalv3
BASE_URL=https://api.maysar.com
```

## Domain Model

### Core Entities
- **Order**: Central aggregate with items, payment, and delivery info
- **OrderItem**: Individual items within an order
- **Payment**: Payment processing and status tracking

### Value Objects
- **Address**: Delivery address validation
- **Money**: Currency-aware monetary calculations

### Domain Events
- **OrderCreatedEvent**: Published when new order is placed

### Business Engines
- **SettlementEngine**: Handles commission and payout calculations
- **InventoryEngine**: Manages inventory checking and reservations

## Testing

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# All tests
npm test
```

## Deployment

### Docker
```bash
# Build image
docker build -t maysar/order-service .

# Run container
docker run -p 3002:3002 maysar/order-service
```

### Kubernetes
Deployment manifests available in `/infra/k8s/` directory.

## Service Boundaries

### Responsibilities
✅ **Order Service Handles:**
- Order creation and validation
- Payment processing and fraud detection
- Financial settlement and commissions
- Order status management
- Inventory checking and reservation

❌ **Logistics Service Handles:**
- Delivery assignment and routing
- Courier coordination and tracking
- Route optimization
- Delivery scheduling

This separation ensures the Order Service remains pure and focused while maintaining clean microservice boundaries.

## Contributing

1. Follow Clean Architecture principles
2. Write comprehensive tests
3. Update documentation
4. Ensure TypeScript strict mode compliance
5. Follow conventional commit messages

## License

Copyright © 2024 Maysar Digital Community Trade Network. All rights reserved.
