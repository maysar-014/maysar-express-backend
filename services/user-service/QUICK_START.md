# User Service Quick Start Guide

Get up and running with the User Service in minutes.

---

## 30-Second Overview

The User Service manages user accounts, authentication, and security across the Maysar platform. It's built with Clean Architecture, fully tested, and production-ready.

**Key Features**:
- User registration and profile management
- Email and phone verification
- Role-based access control
- Security operations (password reset, 2FA, account suspension)
- Event-driven inter-service communication

---

## 5-Minute Setup

### Prerequisites

```bash
# Check Node.js version (need 18+)
node --version

# Check npm version (need 8+)
npm --version
```

### Installation

```bash
# Navigate to service directory
cd user-service

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate:dev

# Start development server
npm run dev
```

The service will start on `http://localhost:3001`.

### Verify Installation

```bash
# Check service health
curl http://localhost:3001/health
```

---

## Common Commands

### Development

```bash
# Start development server
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Format code
npm run format

# Lint code
npm run lint
```

### Database

```bash
# Create new migration
npm run prisma:migrate:create -- --name migration_name

# Apply migrations
npm run prisma:migrate:deploy

# Reset database (development only)
npm run prisma:migrate:reset
```

### Production

```bash
# Build for production
npm run build

# Start production server
npm start
```

---

## First API Call

### Create a User

```bash
curl -X POST http://localhost:3001/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+255712345678",
    "password": "SecurePassword123!",
    "role": "buyer"
  }'
```

**Expected Response** (201 Created):

```json
{
  "success": true,
  "data": {
    "userId": "user-123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "buyer",
    "status": "pending_verification"
  }
}
```

---

## Architecture at a Glance

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                    API Layer                             â”‚
â”‚         (Controllers, Routes, Middleware)                â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚              Application Layer                           â”‚
â”‚      (Use Cases, Sagas, DTOs, Mappers)                   â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                Domain Layer                              â”‚
â”‚  (Entities, Value Objects, Policies, Services)           â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚            Infrastructure Layer                          â”‚
â”‚   (Repositories, Services, Adapters, Messaging)          â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## Project Structure

```
user-service/
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ domain/              # Business logic
â”‚   â”œâ”€â”€ application/         # Use cases
â”‚   â”œâ”€â”€ infrastructure/      # Adapters
â”‚   â””â”€â”€ api/                 # HTTP interface
â”œâ”€â”€ tests/                   # Test files
â”œâ”€â”€ prisma/                  # Database schema
â”œâ”€â”€ .env.example             # Environment template
â””â”€â”€ package.json             # Dependencies
```

---

## Testing

### Run Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- src/domain/entities/user.entity.test.ts
```

---

## Deployment

### Docker

```bash
# Build image
docker build -t user-service:latest .

# Run container
docker run -p 3001:3001 --env-file .env user-service:latest
```

### Orchestrator

```bash
# Deploy to Orchestrator
deployctl apply -f deploy/deployment.yaml
deployctl apply -f deploy/service.yaml

# Check status
deployctl get pods -l app=user-service
```

---

## Monitoring

### Health Checks

```bash
# Overall health
curl http://localhost:3001/health

# Liveness probe
curl http://localhost:3001/health/live

# Readiness probe
curl http://localhost:3001/health/ready
```

---

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker logs user-service

# Verify environment variables
env | grep DATABASE_URL
```

### Database Connection Failed

```bash
# Test database connectivity
psql postgresql://user:password@localhost:5432/maysar_users

# Check DATABASE_URL
echo $DATABASE_URL
```

---

## Next Steps

### Learn More

1. **Architecture**: Read [Architecture Guide](./ARCHITECTURE_GUIDE.md)
2. **API**: Read [API Guide](./API_GUIDE.md)
3. **Testing**: Read [Testing Guide](./TESTING_GUIDE.md)
4. **Operations**: Read [Operations Guide](./OPERATIONS_GUIDE.md)

### Get Help

- Check [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md) for all resources
- Review [README.md](./README.md) for detailed information
- Contact the engineering team for questions

---

## Quick Reference

### Environment Variables

```env
DATABASE_URL=postgresql://user:password@localhost:5432/maysar_users
REDIS_URL=redis://localhost:6379
KAFKA_BROKERS=localhost:9092
JWT_SECRET=your-secret-key
PORT=3001
NODE_ENV=development
```

### API Endpoints

```
POST   /api/v1/users                    # Create user
GET    /api/v1/users/:id                # Get user
PUT    /api/v1/users/:id                # Update user
DELETE /api/v1/users/:id                # Delete user
POST   /api/v1/users/:id/verify-email   # Verify email
GET    /health                          # Health check
```

### npm Scripts

```bash
npm run dev              # Development server
npm run build            # Build for production
npm start                # Start production server
npm test                 # Run tests
npm run test:coverage    # Tests with coverage
npm run lint             # Lint code
npm run format           # Format code
```

---

**Ready to get started?** Follow the 5-Minute Setup above, then explore the full documentation for deeper understanding.
