# User Service API Guide

## Introduction

The User Service API provides a comprehensive interface for managing user accounts, authentication, and security operations across the Maysar platform. This guide explains how to interact with the service, what operations are available, and how to handle responses and errors.

The API is organized around REST principles, using standard HTTP methods and status codes. All requests and responses use JSON format.

---

## Base URL and Versioning

All API endpoints are prefixed with the service base URL and API version:

```
https://api.maysar.local/user-service/api/v1
```

The current API version is `v1`. Future versions will be introduced with backward compatibility considerations.

---

## Authentication

The User Service uses JWT (JSON Web Token) authentication for protected endpoints. Tokens are issued during user registration and login operations.

### Obtaining a Token

Tokens are obtained through the authentication flow:

1. User registers or logs in
2. Service returns JWT token
3. Client includes token in subsequent requests

### Using Tokens

Include the token in the `Authorization` header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Expiration

Tokens expire after 24 hours. When a token expires, the client receives a 401 Unauthorized response and must obtain a new token.

---

## Response Format

All API responses follow a consistent format:

### Success Response

```json
{
  "success": true,
  "data": {
    "userId": "user-123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email format is invalid",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    }
  }
}
```

### List Response

```json
{
  "success": true,
  "data": [
    { "userId": "user-1", "email": "user1@example.com" },
    { "userId": "user-2", "email": "user2@example.com" }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

---

## HTTP Status Codes

The API uses standard HTTP status codes:

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request succeeded |
| 201 | Created | Resource created successfully |
| 204 | No Content | Request succeeded with no content |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Authentication required or failed |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists |
| 422 | Unprocessable Entity | Validation failed |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service temporarily unavailable |

---

## User Management Endpoints

### Create User (Registration)

Creates a new user account in the system.

```
POST /users
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+255712345678",
  "password": "SecurePassword123!",
  "role": "buyer"
}
```

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| email | string | Yes | User email address (must be unique) |
| firstName | string | Yes | User first name |
| lastName | string | Yes | User last name |
| phoneNumber | string | Yes | User phone number (international format) |
| password | string | Yes | User password (min 8 chars, must include uppercase, lowercase, number, special char) |
| role | string | Yes | User role: `buyer`, `seller`, `enabler`, `supplier` |

**Success Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "userId": "user-550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+255712345678",
    "role": "buyer",
    "status": "pending_verification",
    "emailVerified": false,
    "phoneVerified": false,
    "createdAt": "2024-01-06T10:30:00Z"
  }
}
```

**Error Responses:**

- `400 Bad Request`: Invalid email format or weak password
- `409 Conflict`: Email already registered
- `422 Unprocessable Entity`: Validation failed

### Get User Profile

Retrieves the authenticated user's profile information.

```
GET /users/:id
Authorization: Bearer <token>
```

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | User ID |

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "userId": "user-550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+255712345678",
    "role": "buyer",
    "status": "active",
    "emailVerified": true,
    "phoneVerified": true,
    "preferences": {
      "language": "en",
      "timezone": "Africa/Dar_es_Salaam",
      "notificationsEnabled": true
    },
    "addresses": [
      {
        "addressId": "addr-123",
        "type": "shipping",
        "street": "123 Main St",
        "city": "Dar es Salaam",
        "country": "Tanzania",
        "verified": true
      }
    ],
    "createdAt": "2024-01-06T10:30:00Z",
    "lastLogin": "2024-01-06T15:45:00Z"
  }
}
```

**Error Responses:**

- `401 Unauthorized`: Token missing or invalid
- `404 Not Found`: User not found

### Update User Profile

Updates the authenticated user's profile information.

```
PUT /users/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Smith",
  "preferences": {
    "language": "sw",
    "timezone": "Africa/Dar_es_Salaam"
  }
}
```

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| firstName | string | No | User first name |
| lastName | string | No | User last name |
| preferences | object | No | User preferences (language, timezone, notifications) |

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "userId": "user-550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "preferences": {
      "language": "sw",
      "timezone": "Africa/Dar_es_Salaam",
      "notificationsEnabled": true
    },
    "updatedAt": "2024-01-06T16:00:00Z"
  }
}
```

**Error Responses:**

- `401 Unauthorized`: Token missing or invalid
- `404 Not Found`: User not found
- `422 Unprocessable Entity`: Validation failed

### Delete User Account

Permanently deletes the user account and associated data.

```
DELETE /users/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "password": "SecurePassword123!",
  "reason": "No longer needed"
}
```

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| password | string | Yes | User password for confirmation |
| reason | string | No | Reason for account deletion |

**Success Response (204 No Content):**

No response body is returned.

**Error Responses:**

- `401 Unauthorized`: Token missing or invalid
- `403 Forbidden`: Incorrect password
- `404 Not Found`: User not found

---

## Verification Endpoints

### Verify Email Address

Verifies the user's email address using a verification token.

```
POST /users/:id/verify-email
Content-Type: application/json

{
  "token": "email-verification-token-123"
}
```

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| token | string | Yes | Email verification token |

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "userId": "user-550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@example.com",
    "emailVerified": true,
    "verifiedAt": "2024-01-06T10:35:00Z"
  }
}
```

**Error Responses:**

- `400 Bad Request`: Invalid or expired token
- `404 Not Found`: User not found
- `409 Conflict`: Email already verified

### Verify Phone Number

Verifies the user's phone number using a verification code.

```
POST /users/:id/verify-phone
Content-Type: application/json

{
  "code": "123456"
}
```

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| code | string | Yes | SMS verification code (6 digits) |

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Phone number verified successfully",
  "data": {
    "userId": "user-550e8400-e29b-41d4-a716-446655440000",
    "phoneNumber": "+255712345678",
    "phoneVerified": true,
    "verifiedAt": "2024-01-06T10:40:00Z"
  }
}
```

**Error Responses:**

- `400 Bad Request`: Invalid or expired code
- `404 Not Found`: User not found
- `409 Conflict`: Phone already verified

---

## Security Endpoints

### Change Password

Changes the user's password.

```
POST /users/:id/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword456!",
  "confirmPassword": "NewPassword456!"
}
```

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| currentPassword | string | Yes | Current password for verification |
| newPassword | string | Yes | New password (must meet strength requirements) |
| confirmPassword | string | Yes | Password confirmation |

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Password changed successfully",
  "data": {
    "userId": "user-550e8400-e29b-41d4-a716-446655440000",
    "changedAt": "2024-01-06T11:00:00Z"
  }
}
```

**Error Responses:**

- `401 Unauthorized`: Token missing or invalid
- `403 Forbidden`: Current password incorrect
- `422 Unprocessable Entity`: New password doesn't meet requirements

### Setup Two-Factor Authentication

Enables two-factor authentication for the user account.

```
POST /users/:id/setup-two-factor
Authorization: Bearer <token>
Content-Type: application/json

{
  "method": "authenticator"
}
```

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| method | string | Yes | 2FA method: `authenticator` or `sms` |

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Two-factor authentication setup initiated",
  "data": {
    "userId": "user-550e8400-e29b-41d4-a716-446655440000",
    "method": "authenticator",
    "secret": "JBSWY3DPEBLW64TMMQ======",
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "backupCodes": [
      "1234-5678",
      "2345-6789",
      "3456-7890"
    ]
  }
}
```

**Error Responses:**

- `401 Unauthorized`: Token missing or invalid
- `409 Conflict`: Two-factor already enabled

### Suspend Account

Suspends the user account, preventing login and operations.

```
POST /users/:id/suspend-account
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Suspicious activity detected",
  "duration": 7
}
```

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| reason | string | Yes | Reason for suspension |
| duration | number | No | Suspension duration in days (0 = indefinite) |

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Account suspended successfully",
  "data": {
    "userId": "user-550e8400-e29b-41d4-a716-446655440000",
    "status": "suspended",
    "suspendedAt": "2024-01-06T11:15:00Z",
    "suspendedUntil": "2024-01-13T11:15:00Z",
    "reason": "Suspicious activity detected"
  }
}
```

**Error Responses:**

- `401 Unauthorized`: Token missing or invalid
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: User not found

### Report Security Breach

Reports a security breach or suspicious activity on the account.

```
POST /users/:id/report-security-breach
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "unauthorized_access",
  "description": "Unauthorized login from unknown location",
  "location": "New York, USA",
  "timestamp": "2024-01-06T10:00:00Z"
}
```

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| type | string | Yes | Breach type: `unauthorized_access`, `password_compromise`, `data_breach` |
| description | string | Yes | Detailed description of the breach |
| location | string | No | Location where breach occurred |
| timestamp | string | No | When breach occurred (ISO 8601) |

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Security breach reported successfully",
  "data": {
    "userId": "user-550e8400-e29b-41d4-a716-446655440000",
    "breachId": "breach-123",
    "type": "unauthorized_access",
    "reportedAt": "2024-01-06T11:30:00Z",
    "status": "investigating"
  }
}
```

**Error Responses:**

- `401 Unauthorized`: Token missing or invalid
- `404 Not Found`: User not found

---

## Role Management Endpoints

### Change User Role

Changes the user's role in the system.

```
POST /users/:id/change-role
Authorization: Bearer <token>
Content-Type: application/json

{
  "newRole": "seller"
}
```

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| newRole | string | Yes | New role: `buyer`, `seller`, `enabler`, `supplier` |

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Role changed successfully",
  "data": {
    "userId": "user-550e8400-e29b-41d4-a716-446655440000",
    "previousRole": "buyer",
    "newRole": "seller",
    "changedAt": "2024-01-06T11:45:00Z"
  }
}
```

**Error Responses:**

- `401 Unauthorized`: Token missing or invalid
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: User not found
- `422 Unprocessable Entity`: Invalid role

---

## Search and Admin Endpoints

### Search Users

Searches for users with pagination and filtering (admin only).

```
GET /users/search?email=john&role=seller&page=1&pageSize=20
Authorization: Bearer <admin-token>
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| email | string | No | Filter by email (partial match) |
| role | string | No | Filter by role |
| status | string | No | Filter by status |
| page | number | No | Page number (default: 1) |
| pageSize | number | No | Results per page (default: 20, max: 100) |
| sortBy | string | No | Sort field: `email`, `createdAt`, `lastLogin` |
| sortOrder | string | No | Sort order: `asc`, `desc` |

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "userId": "user-1",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "seller",
      "status": "active",
      "createdAt": "2024-01-01T10:00:00Z"
    },
    {
      "userId": "user-2",
      "email": "jane@example.com",
      "firstName": "Jane",
      "lastName": "Smith",
      "role": "seller",
      "status": "active",
      "createdAt": "2024-01-02T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

**Error Responses:**

- `401 Unauthorized`: Token missing or invalid
- `403 Forbidden`: Insufficient permissions

---

## Health Check Endpoints

### Service Health

Checks the overall health of the User Service.

```
GET /health
```

**Success Response (200 OK):**

```json
{
  "status": "healthy",
  "service": "user-service",
  "timestamp": "2024-01-06T12:00:00Z",
  "uptime": 3600,
  "checks": {
    "database": "healthy",
    "cache": "healthy",
    "messageQueue": "healthy"
  }
}
```

### Liveness Probe

Orchestrator liveness probe endpoint.

```
GET /health/live
```

**Success Response (200 OK):**

```json
{
  "status": "alive"
}
```

### Readiness Probe

Orchestrator readiness probe endpoint.

```
GET /health/ready
```

**Success Response (200 OK):**

```json
{
  "status": "ready"
}
```

---

## Error Handling

### Error Codes

The API uses specific error codes for different error conditions:

| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 422 | Input validation failed |
| AUTHENTICATION_FAILED | 401 | Authentication failed |
| AUTHORIZATION_FAILED | 403 | Insufficient permissions |
| RESOURCE_NOT_FOUND | 404 | Resource not found |
| RESOURCE_CONFLICT | 409 | Resource already exists |
| INTERNAL_ERROR | 500 | Internal server error |
| SERVICE_UNAVAILABLE | 503 | Service temporarily unavailable |

### Error Response Example

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email format is invalid",
    "details": {
      "field": "email",
      "reason": "Invalid email format",
      "value": "invalid-email"
    }
  }
}
```

---

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Authentication endpoints**: 5 requests per minute per IP
- **User endpoints**: 100 requests per minute per user
- **Search endpoints**: 50 requests per minute per user

Rate limit information is included in response headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704534000
```

When rate limit is exceeded, the API returns `429 Too Many Requests`.

---

## Pagination

List endpoints support pagination through query parameters:

```
GET /users/search?page=2&pageSize=50
```

**Pagination Response:**

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 2,
    "pageSize": 50,
    "total": 250,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPreviousPage": true
  }
}
```

---

## Filtering and Sorting

List endpoints support filtering and sorting:

```
GET /users/search?role=seller&status=active&sortBy=createdAt&sortOrder=desc
```

**Supported Sort Fields:**
- `email`
- `createdAt`
- `lastLogin`
- `firstName`
- `lastName`

**Sort Order:**
- `asc`: Ascending order
- `desc`: Descending order

---

## Webhooks

The User Service can send webhooks to external systems when significant events occur.

### Webhook Events

- `user.created`: User account created
- `user.verified`: User email verified
- `user.suspended`: User account suspended
- `user.deleted`: User account deleted
- `user.role_changed`: User role changed

### Webhook Payload

```json
{
  "event": "user.created",
  "timestamp": "2024-01-06T12:00:00Z",
  "data": {
    "userId": "user-123",
    "email": "user@example.com",
    "role": "buyer"
  }
}
```

---

## Best Practices

### Security

- Always use HTTPS for API calls
- Store tokens securely (never in localStorage)
- Rotate tokens regularly
- Validate all input on the client side
- Never expose sensitive data in logs

### Performance

- Use pagination for large result sets
- Cache frequently accessed data
- Batch operations when possible
- Use appropriate HTTP methods (GET, POST, PUT, DELETE)

### Error Handling

- Check HTTP status codes
- Parse error responses for details
- Implement exponential backoff for retries
- Log errors for debugging

### Versioning

- Always specify API version in requests
- Plan for API version upgrades
- Test with new versions before deploying

---

## Conclusion

The User Service API provides a comprehensive interface for user management operations. By following this guide and adhering to best practices, you can build reliable integrations with the User Service.

For additional support or questions, contact the engineering team or refer to the service documentation.
