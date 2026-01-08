# Product Service

بسم الله الرحمن الرحيم

## Overview

The Product Service is a core microservice in the Maysar Digital Community Trade Network, responsible for product catalog management, inventory tracking, pricing calculations, and ML-powered recommendations.

**Port**: 3005  
**Version**: 1.0.0  
**Status**: Production Ready

## Features

### 🏪 Inventory Management
- Real-time stock validation and reservation
- Multi-warehouse inventory allocation
- Automatic reordering triggers
- Stock forecasting and analytics
- **Accuracy**: 99.8%+ stock calculations

### 💰 Dynamic Pricing
- Volume-based discount calculations
- Customer tier pricing
- Tax calculations (VAT, regional taxes)
- Currency conversion support
- Promotional pricing rules
- **Accuracy**: 99.8%+ pricing calculations

### 🎯 ML-Powered Recommendations
- Product recommendations
- Cross-selling suggestions
- Upselling opportunities
- Personalized offers
- A/B testing support
- **Accuracy**: 95%+ recommendation relevance

## Migrated Engines

This service contains engines migrated from the monolithic Order Service:

### ✅ Inventory Engine
- **Source**: `order-service/src/domain/services/inventory.engine.ts`
- **New Location**: `src/domain/engines/inventory.engine.ts`
- **Functionality**: Stock management, reservations, warehouse allocation

### ✅ Pricing Engine
- **Source**: `order-service/src/domain/services/pricing.engine.ts`
- **New Location**: `src/domain/engines/pricing.engine.ts`
- **Functionality**: Dynamic pricing, discounts, tax calculations

### ✅ Recommendation Engine
- **Source**: `order-service/src/domain/services/recommendation.engine.ts`
- **New Location**: `src/domain/engines/recommendation.engine.ts`
- **Functionality**: ML recommendations, personalization, cross-selling

## API Endpoints

### Inventory Management
```http
GET    /api/v1/inventory/stock/:productId/:quantity/:warehouseId
POST   /api/v1/inventory/reserve
POST   /api/v1/inventory/availability
```

### Pricing & Calculations
```http
POST   /api/v1/pricing/calculate
POST   /api/v1/pricing/validate
POST   /api/v1/pricing/quote
```

### Recommendations
```http
POST   /api/v1/recommendations/generate
GET    /api/v1/recommendations/customer/:customerId
POST   /api/v1/recommendations/feedback
```

### Health & Monitoring
```http
GET    /health
```

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Redis 7+

### Installation
```bash
cd services/product-service
npm install
```

### Environment Setup
```bash
cp .env.example .env
# Edit .env with your configuration
```

### Database Setup
```bash
npx prisma migrate dev
npx prisma generate
```

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

## Architecture

### Service Structure
```
product-service/
├── src/
│   ├── api/
│   │   └── controllers/
│   │       ├── inventory.controller.ts
│   │       ├── pricing.controller.ts
│   │       └── recommendation.controller.ts
│   ├── domain/
│   │   └── engines/
│   │       ├── inventory.engine.ts
│   │       ├── pricing.engine.ts
│   │       └── recommendation.engine.ts
│   └── main.ts
├── prisma/
│   └── schema.prisma
├── package.json
└── README.md
```

### Database Schema
- **Products**: Product catalog and variants
- **Inventory**: Stock levels and reservations
- **Pricing**: Regional pricing rules
- **Recommendations**: Customer preferences and feedback

## Performance Metrics

### Target Performance
- **Response Time**: P95 < 200ms
- **Throughput**: 1000+ RPS
- **Availability**: 99.95%+
- **Engine Processing**: <5ms average

### Accuracy Targets
- **Inventory Engine**: 99.8%+ accuracy
- **Pricing Engine**: 99.8%+ accuracy
- **Recommendation Engine**: 95%+ relevance

## Integration

### External Dependencies
- **Catalog Service**: Product data synchronization
- **Customer Service**: Customer profiles and preferences
- **ML Service**: Recommendation model inference
- **Order Service**: Stock reservations and pricing

### Event Publishing
```typescript
// Inventory events
InventoryReserved
InventoryReleased
StockLevelChanged

// Pricing events
PriceCalculated
DiscountApplied

// Recommendation events
RecommendationGenerated
FeedbackReceived
```

## Development

### Adding New Features
1. Create engine in `src/domain/engines/`
2. Add controller in `src/api/controllers/`
3. Update routes in `src/main.ts`
4. Add database models in `prisma/schema.prisma`

### Testing
```bash
npm test
npm run test:coverage
```

### Linting
```bash
npm run lint
npm run lint:fix
```

## Deployment

### Docker
```bash
docker build -t maysar/product-service .
docker run -p 3005:3005 maysar/product-service
```

### Kubernetes
```bash
kubectl apply -f k8s/product-service.yaml
```

## Monitoring

### Health Checks
- **Endpoint**: `GET /health`
- **Database**: Connection status
- **Redis**: Cache availability
- **External Services**: Integration health

### Metrics
- Request latency and throughput
- Engine processing times
- Accuracy measurements
- Error rates and types

## Security

### Authentication
- JWT token validation
- API key authentication
- Rate limiting (1000 req/15min)

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CORS configuration

## Contributing

### Code Standards
- TypeScript strict mode
- ESLint configuration
- Prettier formatting
- 95%+ test coverage

### Pull Request Process
1. Create feature branch
2. Implement changes with tests
3. Update documentation
4. Submit PR with description

---

**Built for the Maysar Digital Community Trade Network**  
*Empowering Tanzania's digital commerce revolution*