# Production Service API

## Base URL
`/api/production`

## Endpoints

### Production Plans
- `POST /plans` - Create a new production plan.
- `PUT /plans/:id/status` - Update plan status.

### Dashboard
- `GET /dashboard?supplierId={id}` - Get supplier production metrics and active plans.

### Quality Control
- `POST /quality/checkpoints` - Record a quality inspection result.

### Capacity
- `GET /capacity?supplierId={id}&date={date}` - Check production capacity availability.

## Authentication
All endpoints require a valid JWT token. Access is scoped to the authenticated user's organization (Supplier).
