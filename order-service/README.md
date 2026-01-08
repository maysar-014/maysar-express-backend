# Order Service

بسم الله الرحمن الرحيم

## Overview

The Order Service manages the complete order lifecycle within the Maysar Digital Community Trade Network, implementing Domain-Driven Design (DDD) architecture with event-driven patterns.

## Architecture

### Domain-Driven Design Structure

```
order-service/
├── src/
│   ├── api/                   # REST API endpoints
│   │   ├── controllers/       # Request handling & validation
│   │   ├── dtos/              # Data Transfer Objects
│   │   └── routes.ts          # Route definitions
│   │
│   ├── domain/                # Core business logic
│   │   ├── aggregates/        # Order aggregate & state machine
│   │   ├── entities/          # Core entities
│   │   ├── events/            # Domain events
│   │   ├── policies/          # Business rules
│   │   └── services/          # Domain-level orchestration
│   │
│   ├── infrastructure/        # External services & persistence
│   │   ├── database/          # Repositories
│   │   ├── event-bus/         # Event publishing
│   │   ├── integrations/      # External API adapters
│   │   └── logger/            # Structured logging
│   │
│   ├── saga/                  # Distributed transaction orchestrators
│   ├── config/                # Environment configurations
│   ├── utils/                 # Helpers & validators
│   └── main.ts                # Entry point
│
├── test/                      # Unit & integration tests
├── docker/                    # Docker configuration
└── package.json
```

## Key Features

- **Event-Driven Architecture**: Saga pattern for distributed transactions
- **Domain-Driven Design**: Clean separation of business logic
- **Buyer Confirmation Flow**: Proof of delivery handled by buyers
- **Real-time Integration**: Courier service integration
- **Payment Processing**: PesaPal and mobile money support

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## Port

- **Development**: 3002
- **Production**: Configured via environment variables