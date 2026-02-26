# Campaign Service API Guide

This guide provides details on the available API endpoints for the Campaign Service. All endpoints are relative to the `/api/campaign` base path.

## Endpoints

### 1. Create Campaign
Creates a new campaign in `DRAFT` status.

- **URL**: `POST /`
- **Authentication**: Required (Admin or Seller)
- **Request Body**:
```json
{
  "name": "Summer Sale",
  "description": "20% off all summer items",
  "type": "DISCOUNT",
  "startDate": "2026-06-01T00:00:00Z",
  "endDate": "2026-06-30T23:59:59Z",
  "pricingRules": [
    {
      "type": "PERCENTAGE_DISCOUNT",
      "value": 20,
      "priority": 1
    }
  ],
  "productIds": ["prod_1", "prod_2"]
}
```

### 2. Get Campaign
Retrieves details of a specific campaign.

- **URL**: `GET /:id`
- **Response**: `CampaignDto`

### 3. List Campaigns
Lists all campaigns, optionally filtered.

- **URL**: `GET /`
- **Query Parameters**: `status`, `sellerId`, `type`.

### 4. Update Campaign
Updates a `DRAFT` campaign.

- **URL**: `PUT /:id`
- **Request Body**: Fields to update.

### 5. Launch Campaign
Changes status to `ACTIVE` and applies pricing rules.

- **URL**: `POST /:id/launch`

### 6. Pause Campaign
Temporarily suspends an `ACTIVE` campaign.

- **URL**: `POST /:id/pause`

### 7. Resume Campaign
Resumes a `PAUSED` campaign.

- **URL**: `POST /:id/resume`

### 8. Cancel Campaign
Cancels a campaign, reverting all pricing changes.

- **URL**: `POST /:id/cancel`

## Enums

### CampaignType
- `DISCOUNT`
- `PROMOTION`
- `CLEARANCE`
- `SEASONAL`

### CampaignStatus
- `DRAFT`
- `SCHEDULED`
- `ACTIVE`
- `PAUSED`
- `COMPLETED`
- `CANCELLED`

### RuleType
- `FIXED_DISCOUNT`
- `PERCENTAGE_DISCOUNT`
- `FIXED_PRICE`
- `BUY_GET`

### ConditionType
- `MIN_ORDER_VALUE`
- `MAX_USES_PER_CUSTOMER`
- `CUSTOMER_SEGMENT`
- `GEOGRAPHIC_REGION`
