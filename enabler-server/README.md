# Enabler Server

API server for the Maysar Enabler Console, providing comprehensive data for all enabler operations.

## Overview

The Enabler Server runs on port 3003 and provides API endpoints for:
- Dashboard analytics and stats
- Task management and tracking
- Earnings and wallet management
- Performance metrics
- Training and certification
- KYC verification
- Settings and preferences

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start
```

## API Endpoints

### Core Endpoints
- `GET /api/enabler/dashboard` - Dashboard stats and recent activity
- `GET /api/enabler/profile` - Enabler profile and tier information
- `GET /api/enabler/earnings` - Wallet, transactions, and payout data
- `GET /api/enabler/tasks` - Active, completed, and available tasks

### Specialized Endpoints
- `GET /api/enabler/seller-onboarding` - Seller application management
- `GET /api/enabler/buyer-assistance` - Customer support requests
- `GET /api/enabler/performance` - Performance metrics and rankings
- `GET /api/enabler/training` - Training courses and certificates
- `GET /api/enabler/logistics` - Delivery and logistics coordination
- `GET /api/enabler/trust-reports` - Dispute resolution and investigations
- `GET /api/enabler/sales-support` - Sales consultation sessions
- `GET /api/enabler/settings` - User preferences and configuration
- `GET /api/enabler/kyc` - KYC verification status and documents

## Health Check

```bash
curl http://localhost:3003/health
```

## Environment Variables

```env
PORT=3003
NODE_ENV=development
API_VERSION=v1
```

## Integration

The Enabler Console connects to this server via the API service layer:

```typescript
import { enablerApi } from '@/lib/api';

// Fetch dashboard data
const dashboardData = await enablerApi.getDashboard();
```

## Development

- Server automatically restarts on file changes with nodemon
- CORS enabled for frontend development
- Request logging with Morgan
- Security headers with Helmet