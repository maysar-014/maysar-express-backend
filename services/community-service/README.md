# Community Service

**Social Commerce Platform for Maysar Marketplace**

A production-ready microservice that powers social features, content creation, and community engagement in the Maysar marketplace ecosystem. Built with Clean Architecture principles and enterprise-grade infrastructure.

## ðŸ—ï¸ **Architecture Overview**

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                    PRESENTATION LAYER                       â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚
â”‚  â”‚   REST API      â”‚  â”‚   Controllers   â”‚  â”‚   Routes    â”‚ â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                 â”‚
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                   APPLICATION LAYER                         â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚
â”‚  â”‚   Use Cases     â”‚  â”‚   Sagas/Events  â”‚  â”‚ Validation  â”‚ â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                 â”‚
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                    DOMAIN LAYER                             â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚
â”‚  â”‚   Entities      â”‚  â”‚   Value Objects â”‚  â”‚  Policies   â”‚ â”‚
â”‚  â”‚   Aggregates    â”‚  â”‚   Domain Events â”‚  â”‚   Engines   â”‚ â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                 â”‚
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                  INFRASTRUCTURE LAYER                       â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚
â”‚  â”‚  Repositories   â”‚  â”‚   Messaging     â”‚  â”‚   Cache     â”‚ â”‚
â”‚  â”‚  External APIs  â”‚  â”‚   Event Bus     â”‚  â”‚   Storage   â”‚ â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

## ðŸŽ¯ **Core Features**

### **Social Commerce Integration**
- **12 Content Types**: Text, Image, Video, Events, Polls, Product Announcements, Promotions, Delivery Updates
- **Trust-Based Permissions**: Role-based content creation (Buyer/Seller/Supplier/Courier/Enabler)
- **Commerce Linking**: Posts can reference orders, products, shipments
- **COD Eligibility**: Trust scoring determines cash-on-delivery access

### **Intelligent Content Management**
- **Auto-Moderation**: Keyword detection, suspicious content filtering
- **Personalized Feeds**: Algorithmic ranking with time decay and relevance scoring
- **Trending Discovery**: Real-time trending topics and hashtags
- **Content Validation**: Post-type specific validation and metadata verification

### **High-Performance Infrastructure**
- **Event-Driven Architecture**: Kafka-based event publishing for microservice communication
- **Redis Caching**: Multi-level caching for feeds, posts, search results
- **Database Optimization**: Prisma ORM with query optimization and connection pooling
- **Scalable APIs**: RESTful endpoints with proper HTTP semantics

## ðŸš€ **Quick Start**

### **Prerequisites**
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Kafka 3+

### **Installation**
```bash
# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Seed initial data (optional)
npm run prisma:seed
```

### **Development**
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### **Testing**
```bash
# Run all tests
npm test

# Run with coverage
npm run test:cov

# Run integration tests
npm run test:integration
```

## ðŸ“¡ **API Endpoints**

### **Posts Management**
```
POST   /api/posts              # Create post
GET    /api/posts/published    # Get published posts
GET    /api/posts/search       # Search posts
GET    /api/posts/trending     # Get trending topics
GET    /api/posts/:id          # Get post by ID
GET    /api/posts/:id/related  # Get related posts
```

### **User Feeds**
```
GET    /api/users/:userId/feed # Get personalized feed
```

### **Health & Monitoring**
```
GET    /health                 # Health check
```

## ðŸ”§ **Configuration**

### **Environment Variables**
```env
# Server
PORT=3002
NODE_ENV=production
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/community

# Cache
REDIS_URL=redis://localhost:6379

# Messaging
KAFKA_BROKERS=localhost:9092

# External Services
USER_SERVICE_URL=http://localhost:3001
ORDER_SERVICE_URL=http://localhost:3003

# Feature Flags
ENABLE_CACHING=true
ENABLE_EVENTS=true
AUTO_MODERATION_ENABLED=true
```

## ðŸ›ï¸ **Architecture Principles**

### **Clean Architecture Compliance**
- **Dependency Inversion**: Infrastructure adapts to Domain, never reverse
- **Business Logic Purity**: Domain layer contains no external dependencies
- **Testability**: Each layer can be tested in isolation
- **Maintainability**: Clear separation of concerns

### **Domain-Driven Design**
- **Rich Domain Model**: Entities with business logic and validation
- **Value Objects**: Immutable domain concepts
- **Domain Services**: Business rules and calculations
- **Repository Pattern**: Data access abstraction

### **Event-Driven Architecture**
- **Domain Events**: Business events published to event bus
- **Event Sourcing**: Audit trail and event-driven workflows
- **Saga Pattern**: Complex business transactions
- **CQRS**: Separate read/write models for performance

## ðŸ“Š **Performance & Scalability**

### **Caching Strategy**
- **Multi-Level Caching**: Application + Redis + CDN
- **Feed Caching**: 5-minute TTL for user feeds
- **Post Caching**: 1-hour TTL for post data
- **Search Caching**: 30-minute TTL for search results

### **Database Optimization**
- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Indexed queries with selective field loading
- **Read Replicas**: Separate read/write databases for scale

### **Event Streaming**
- **Async Processing**: Non-blocking event publishing
- **Message Persistence**: Guaranteed message delivery
- **Consumer Groups**: Horizontal scaling of event processors

## ðŸ”’ **Security & Compliance**

### **Authentication & Authorization**
- **JWT Tokens**: Stateless authentication
- **Role-Based Access**: Granular permission system
- **API Keys**: Service-to-service authentication

### **Content Security**
- **Input Validation**: Comprehensive request validation
- **XSS Protection**: Content sanitization
- **Rate Limiting**: DDoS protection and abuse prevention

### **Data Protection**
- **Encryption**: Data at rest and in transit
- **Audit Logging**: Comprehensive activity logging
- **GDPR Compliance**: Data portability and deletion

## ðŸ§ª **Testing Strategy**

### **Unit Tests**
- **Domain Logic**: Pure business rule testing
- **Use Cases**: Application logic validation
- **Infrastructure**: Mocked external dependencies

### **Integration Tests**
- **Database**: Repository implementation testing
- **External APIs**: Service integration validation
- **Event Publishing**: Message broker testing

### **End-to-End Tests**
- **API Endpoints**: Full request/response cycles
- **Business Workflows**: Complete user journeys
- **Performance**: Load and stress testing

## ðŸ“ˆ **Monitoring & Observability**

### **Application Metrics**
- **Response Times**: API endpoint performance
- **Error Rates**: Service reliability monitoring
- **Throughput**: Request volume tracking

### **Business Metrics**
- **Content Engagement**: Likes, comments, shares
- **User Activity**: Active users, session duration
- **Content Quality**: Moderation actions, spam detection

### **Infrastructure Monitoring**
- **Database**: Connection pools, query performance
- **Cache**: Hit rates, memory usage
- **Message Queue**: Message throughput, consumer lag

## ðŸ”„ **Microservice Integration**

### **Event Contracts**
- **PostCreated**: New content published
- **PostModerated**: Content moderation actions
- **UserFollowed**: Social relationship changes
- **EngagementCreated**: User interactions

### **API Contracts**
- **RESTful APIs**: Consistent HTTP interfaces
- **OpenAPI Spec**: Machine-readable API documentation
- **Versioning**: Backward-compatible API evolution

## ðŸš€ **Deployment**

### **Docker Containerization**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
EXPOSE 3002
CMD ["npm", "start"]
```

### **Orchestrator Deployment**
- **Template Engine Charts**: Declarative deployment configuration
- **Horizontal Scaling**: Auto-scaling based on CPU/memory
- **Rolling Updates**: Zero-downtime deployments
- **Health Checks**: Readiness and liveness probes

### **CI/CD Pipeline**
- **Automated Testing**: Unit, integration, and E2E tests
- **Security Scanning**: Dependency and container scanning
- **Performance Testing**: Load testing in staging
- **Blue-Green Deployment**: Safe production releases

## ðŸ¤ **Contributing**

### **Development Workflow**
1. **Branch**: Create feature branch from `main`
2. **Code**: Follow TypeScript and Clean Architecture guidelines
3. **Test**: Write comprehensive tests for new features
4. **Review**: Submit PR with detailed description
5. **Merge**: Squash merge after approval

### **Code Standards**
- **ESLint**: Automated code linting
- **Prettier**: Consistent code formatting
- **TypeScript**: Strict type checking
- **Commit Messages**: Conventional commit format

## ðŸ“š **Documentation**

### **API Documentation**
- **OpenAPI 3.0**: Interactive API documentation
- **Postman Collections**: API testing collections
- **SDK Generation**: TypeScript client libraries

### **Architecture Decision Records**
- **ADRs**: Documented architectural decisions
- **Rationale**: Why decisions were made
- **Consequences**: Impact and trade-offs

## ðŸ† **Key Achievements**

âœ… **Clean Architecture**: Perfect separation of concerns with dependency inversion
âœ… **Domain-Driven Design**: Rich domain model with business logic encapsulation
âœ… **Event-Driven**: Asynchronous communication between microservices
âœ… **Performance**: Multi-layer caching and database optimization
âœ… **Scalability**: Horizontal scaling with Orchestrator and message queues
âœ… **Security**: Comprehensive security measures and compliance
âœ… **Testing**: Full test coverage with automated CI/CD
âœ… **Documentation**: Complete API and architecture documentation
âœ… **Production-Ready**: Enterprise-grade error handling and monitoring

---

**Community Service** - Transforming commerce through social engagement. Built for scale, designed for trust.
