# API Documentation Constitution

> **Authority**: Supreme API documentation law binding all services and systems.  
> **Mission**: Establish universal standards for API documentation that guarantee clarity, completeness, and developer excellence.  
> **Core Mandate**: Every API endpoint must be self-documenting, contract-first, and production-ready.

---

## Core Philosophy

**Documentation is the contract.**  
**Contracts are executable.**  
**Developers are the customers.**

Any API without complete, accurate documentation is considered incomplete and undeployable.

---

## 1. The Documentation Truth Principle (DTP)

> **Documentation must be the single source of truth.**  
> **Code and documentation must never diverge.**  
> **Automated validation enforces accuracy.**

### Truth Enforcement Rules

1. **Generated from Code**: Documentation is generated from code annotations, not written separately
2. **Contract-First**: OpenAPI/AsyncAPI specs define the contract before implementation
3. **Automated Validation**: CI/CD fails if documentation is incomplete or outdated
4. **Version Synchronized**: Documentation version matches API version exactly

**Violation**: Deploying an API with outdated or missing documentation is a critical defect.

---

## 2. Documentation Completeness Standard

### Required Documentation Elements

Every API endpoint MUST document:

| Element | Requirement | Enforcement |
|---------|-------------|-------------|
| **Purpose** | Business intent and use case | Manual review |
| **Authentication** | Auth method and required permissions | Automated validation |
| **Request Schema** | Complete request structure with examples | Schema validation |
| **Response Schema** | All possible responses with status codes | Schema validation |
| **Error Responses** | All error scenarios with codes | Automated testing |
| **Rate Limits** | Throttling rules and quotas | Config validation |
| **Deprecation** | Sunset timeline if applicable | Automated alerts |
| **Examples** | Working request/response examples | Automated testing |

### Completeness Scoring

```typescript
const documentationScore = {
  purpose: hasPurpose ? 15 : 0,
  authentication: hasAuthDocs ? 15 : 0,
  requestSchema: hasRequestSchema ? 20 : 0,
  responseSchema: hasResponseSchema ? 20 : 0,
  errorHandling: hasErrorDocs ? 15 : 0,
  examples: hasExamples ? 10 : 0,
  rateLimits: hasRateLimits ? 5 : 0
};

// Minimum score: 85/100 for deployment
```

---

## 3. OpenAPI Specification Standard

### OpenAPI Version Mandate

- **Version**: OpenAPI 3.1.0 or higher
- **Format**: YAML (primary), JSON (generated)
- **Location**: `docs/api/openapi.yaml` in each service
- **Validation**: Automated via Spectral or similar

### Required OpenAPI Components

```yaml
openapi: 3.1.0

info:
  title: [Service Name] API
  version: [Semantic Version]
  description: [Comprehensive service description]
  contact:
    name: [Team Name]
    email: [Team Email]
  license:
    name: [License Type]

servers:
  - url: https://api.production.com
    description: Production
  - url: https://api.staging.com
    description: Staging
  - url: http://localhost:3000
    description: Local Development

security:
  - bearerAuth: []

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    # All DTOs and models

  responses:
    # Reusable response definitions

  parameters:
    # Reusable parameters

  examples:
    # Reusable examples

paths:
  # All endpoints with complete documentation
```

---

## 4. Endpoint Documentation Law

### Endpoint Documentation Template

Every endpoint MUST follow this structure:

```yaml
/api/v1/resource/{id}:
  get:
    summary: Brief one-line description
    description: |
      Detailed multi-line description explaining:
      - Business purpose
      - Use cases
      - Important notes
      - Related endpoints
    
    operationId: getResourceById
    
    tags:
      - Resources
    
    security:
      - bearerAuth: []
    
    parameters:
      - name: id
        in: path
        required: true
        description: Unique resource identifier
        schema:
          type: string
          format: uuid
        example: "550e8400-e29b-41d4-a716-446655440000"
      
      - name: include
        in: query
        required: false
        description: Related resources to include
        schema:
          type: array
          items:
            type: string
            enum: [metadata, relations, history]
        example: ["metadata", "relations"]
    
    responses:
      '200':
        description: Resource retrieved successfully
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Resource'
            examples:
              standard:
                $ref: '#/components/examples/ResourceStandard'
              withIncludes:
                $ref: '#/components/examples/ResourceWithIncludes'
      
      '400':
        $ref: '#/components/responses/BadRequest'
      
      '401':
        $ref: '#/components/responses/Unauthorized'
      
      '403':
        $ref: '#/components/responses/Forbidden'
      
      '404':
        $ref: '#/components/responses/NotFound'
      
      '429':
        $ref: '#/components/responses/TooManyRequests'
      
      '500':
        $ref: '#/components/responses/InternalServerError'
```

### HTTP Method Documentation Standards

| Method | Must Document | Additional Requirements |
|--------|--------------|------------------------|
| **GET** | Query params, filters, pagination | Caching headers, conditional requests |
| **POST** | Request body schema, validation rules | Idempotency key support |
| **PUT** | Complete resource schema, required fields | Optimistic locking (ETag) |
| **PATCH** | Partial update schema, allowed fields | Merge semantics explanation |
| **DELETE** | Cascade behavior, soft vs hard delete | Idempotency guarantee |

---

## 5. Schema Documentation Excellence

### Schema Definition Rules

**Required for Every Schema**:
- Description of the entity
- All field descriptions
- Required vs optional fields
- Validation rules and constraints
- Default values
- Examples
- Deprecation warnings

**Example**:
```yaml
components:
  schemas:
    Product:
      type: object
      description: Represents a product in the catalog
      required:
        - id
        - name
        - price
        - status
      properties:
        id:
          type: string
          format: uuid
          description: Unique product identifier
          readOnly: true
          example: "550e8400-e29b-41d4-a716-446655440000"
        
        name:
          type: string
          minLength: 3
          maxLength: 200
          description: Product display name
          example: "Premium Wireless Headphones"
        
        price:
          type: number
          format: decimal
          minimum: 0.01
          description: Product price in USD
          example: 299.99
        
        status:
          type: string
          enum: [DRAFT, PUBLISHED, ARCHIVED]
          description: |
            Product publication status:
            - DRAFT: Not visible to customers
            - PUBLISHED: Available for purchase
            - ARCHIVED: No longer available
          example: "PUBLISHED"
        
        createdAt:
          type: string
          format: date-time
          description: Timestamp when product was created
          readOnly: true
          example: "2024-01-15T10:30:00Z"
        
        updatedAt:
          type: string
          format: date-time
          description: Timestamp of last update
          readOnly: true
          example: "2024-01-20T14:45:00Z"
```

### Validation Documentation

All validation rules MUST be documented:

```yaml
ValidationError:
  type: object
  description: Validation error response
  properties:
    error:
      type: string
      const: "VALIDATION_ERROR"
    message:
      type: string
      example: "Request validation failed"
    details:
      type: array
      items:
        type: object
        properties:
          field:
            type: string
            description: Field that failed validation
            example: "email"
          rule:
            type: string
            description: Validation rule that failed
            example: "format"
          message:
            type: string
            description: Human-readable error message
            example: "Email must be a valid email address"
```

---

## 6. Error Documentation Standard

### Error Response Completeness

Every possible error MUST be documented with:
- HTTP status code
- Error code (machine-readable)
- Error message (human-readable)
- Possible causes
- Resolution steps
- Related documentation links

### Standard Error Schema

```yaml
components:
  schemas:
    Error:
      type: object
      required:
        - error
        - message
        - timestamp
        - path
      properties:
        error:
          type: string
          description: Machine-readable error code
          example: "RESOURCE_NOT_FOUND"
        
        message:
          type: string
          description: Human-readable error message
          example: "The requested resource could not be found"
        
        details:
          type: object
          description: Additional error context
          additionalProperties: true
        
        timestamp:
          type: string
          format: date-time
          description: When the error occurred
          example: "2024-01-15T10:30:00Z"
        
        path:
          type: string
          description: Request path that caused the error
          example: "/api/v1/products/123"
        
        correlationId:
          type: string
          format: uuid
          description: Correlation ID for tracing
          example: "550e8400-e29b-41d4-a716-446655440000"
```

### Error Catalog

Maintain a comprehensive error catalog:

```yaml
components:
  responses:
    BadRequest:
      description: Invalid request parameters or body
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          examples:
            validationError:
              value:
                error: "VALIDATION_ERROR"
                message: "Request validation failed"
                details:
                  fields: ["email", "password"]
            
            malformedJson:
              value:
                error: "MALFORMED_REQUEST"
                message: "Request body is not valid JSON"
    
    Unauthorized:
      description: Authentication required or failed
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          examples:
            missingToken:
              value:
                error: "MISSING_TOKEN"
                message: "Authentication token is required"
            
            invalidToken:
              value:
                error: "INVALID_TOKEN"
                message: "Authentication token is invalid or expired"
    
    Forbidden:
      description: Insufficient permissions
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            error: "INSUFFICIENT_PERMISSIONS"
            message: "You do not have permission to access this resource"
    
    NotFound:
      description: Resource not found
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            error: "RESOURCE_NOT_FOUND"
            message: "The requested resource could not be found"
    
    TooManyRequests:
      description: Rate limit exceeded
      headers:
        X-RateLimit-Limit:
          schema:
            type: integer
          description: Request limit per window
        X-RateLimit-Remaining:
          schema:
            type: integer
          description: Remaining requests in current window
        X-RateLimit-Reset:
          schema:
            type: integer
          description: Unix timestamp when limit resets
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            error: "RATE_LIMIT_EXCEEDED"
            message: "Too many requests. Please try again later."
```

---

## 7. Example Documentation Law

### Example Completeness Rule

Every endpoint MUST provide:
- **Minimal Example**: Simplest valid request
- **Complete Example**: All optional fields included
- **Edge Case Examples**: Boundary conditions
- **Error Examples**: Common failure scenarios

### Example Quality Standards

```yaml
components:
  examples:
    CreateProductMinimal:
      summary: Minimal product creation
      description: Simplest valid request with only required fields
      value:
        name: "Basic Product"
        price: 19.99
        status: "DRAFT"
    
    CreateProductComplete:
      summary: Complete product creation
      description: Request with all optional fields
      value:
        name: "Premium Wireless Headphones"
        description: "High-quality noise-canceling headphones"
        price: 299.99
        compareAtPrice: 399.99
        status: "PUBLISHED"
        category: "Electronics"
        tags: ["audio", "wireless", "premium"]
        inventory:
          quantity: 100
          sku: "WH-1000XM5"
        metadata:
          brand: "AudioTech"
          model: "AT-1000"
    
    CreateProductEdgeCase:
      summary: Edge case - minimum price
      description: Product with minimum allowed price
      value:
        name: "Free Sample"
        price: 0.01
        status: "PUBLISHED"
```

---

## 8. Authentication & Authorization Documentation

### Security Documentation Requirements

Every secured endpoint MUST document:
- Authentication method (Bearer, API Key, OAuth2)
- Required scopes/permissions
- Token format and structure
- Token expiration and refresh
- Security best practices

### Security Scheme Documentation

```yaml
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: |
        JWT-based authentication. Include the token in the Authorization header:
        
        ```
        Authorization: Bearer <token>
        ```
        
        **Token Structure**:
        - Issuer: auth-service
        - Expiration: 24 hours
        - Refresh: Use /auth/refresh endpoint
        
        **Required Claims**:
        - sub: User ID
        - role: User role
        - permissions: Array of permissions
    
    apiKey:
      type: apiKey
      in: header
      name: X-API-Key
      description: |
        API key for service-to-service authentication.
        
        **Obtaining an API Key**:
        1. Navigate to Developer Portal
        2. Create new application
        3. Generate API key
        
        **Security**:
        - Rotate keys every 90 days
        - Never commit keys to version control
        - Use environment variables
```

### Permission Documentation

```yaml
paths:
  /api/v1/admin/users:
    get:
      summary: List all users
      description: |
        Retrieve a paginated list of all users.
        
        **Required Permissions**:
        - `users:read` - View user information
        - `admin:access` - Access admin endpoints
        
        **Role Requirements**:
        - ADMIN or SUPER_ADMIN role required
      security:
        - bearerAuth: [users:read, admin:access]
```

---

## 9. Pagination, Filtering & Sorting Documentation

### Pagination Standard

```yaml
components:
  parameters:
    PageNumber:
      name: page
      in: query
      description: Page number (1-indexed)
      schema:
        type: integer
        minimum: 1
        default: 1
      example: 1
    
    PageSize:
      name: limit
      in: query
      description: Number of items per page
      schema:
        type: integer
        minimum: 1
        maximum: 100
        default: 20
      example: 20
    
    SortBy:
      name: sort
      in: query
      description: |
        Sort field and direction.
        Format: `field:direction`
        Direction: `asc` or `desc`
      schema:
        type: string
        pattern: '^[a-zA-Z]+:(asc|desc)$'
      example: "createdAt:desc"
  
  schemas:
    PaginatedResponse:
      type: object
      required:
        - data
        - pagination
      properties:
        data:
          type: array
          description: Array of items for current page
        
        pagination:
          type: object
          required:
            - page
            - limit
            - total
            - totalPages
          properties:
            page:
              type: integer
              description: Current page number
              example: 1
            
            limit:
              type: integer
              description: Items per page
              example: 20
            
            total:
              type: integer
              description: Total number of items
              example: 150
            
            totalPages:
              type: integer
              description: Total number of pages
              example: 8
            
            hasNext:
              type: boolean
              description: Whether there is a next page
              example: true
            
            hasPrevious:
              type: boolean
              description: Whether there is a previous page
              example: false
```

### Filtering Documentation

```yaml
components:
  parameters:
    FilterByStatus:
      name: status
      in: query
      description: Filter by status
      schema:
        type: array
        items:
          type: string
          enum: [DRAFT, PUBLISHED, ARCHIVED]
      style: form
      explode: true
      example: ["PUBLISHED", "DRAFT"]
    
    FilterByDateRange:
      name: createdAt
      in: query
      description: |
        Filter by creation date range.
        Format: `gte:YYYY-MM-DD,lte:YYYY-MM-DD`
      schema:
        type: string
        pattern: '^(gte|lte|gt|lt):\d{4}-\d{2}-\d{2}(,(gte|lte|gt|lt):\d{4}-\d{2}-\d{2})*$'
      example: "gte:2024-01-01,lte:2024-12-31"
```

---

## 10. Versioning Documentation Standard

### API Versioning Rules

- **Version Format**: Semantic versioning (v1, v2, v3)
- **Version Location**: URL path (`/api/v1/resource`)
- **Deprecation Notice**: Minimum 6 months before removal
- **Migration Guide**: Required for breaking changes

### Version Documentation

```yaml
info:
  version: "2.1.0"
  description: |
    # Version History
    
    ## v2.1.0 (Current)
    - Added support for bulk operations
    - Enhanced filtering capabilities
    - Performance improvements
    
    ## v2.0.0
    - **BREAKING**: Changed authentication from API keys to JWT
    - **BREAKING**: Renamed `status` field to `state`
    - Added pagination to list endpoints
    - Migration guide: /docs/migration/v1-to-v2
    
    ## v1.0.0 (Deprecated - Sunset: 2024-12-31)
    - Initial release
    - Basic CRUD operations
    - API key authentication
```

### Deprecation Documentation

```yaml
paths:
  /api/v1/legacy-endpoint:
    get:
      deprecated: true
      summary: Legacy endpoint (Deprecated)
      description: |
        ⚠️ **DEPRECATED**: This endpoint will be removed on 2024-12-31.
        
        **Migration Path**:
        Use `/api/v2/new-endpoint` instead.
        
        **Changes**:
        - Response format has changed
        - New authentication required
        - See migration guide: /docs/migration/legacy-to-v2
      
      x-sunset-date: "2024-12-31"
      x-replacement: "/api/v2/new-endpoint"
```

---

## 11. Rate Limiting Documentation

### Rate Limit Documentation Standard

```yaml
components:
  headers:
    X-RateLimit-Limit:
      description: Maximum requests allowed per window
      schema:
        type: integer
      example: 1000
    
    X-RateLimit-Remaining:
      description: Requests remaining in current window
      schema:
        type: integer
      example: 950
    
    X-RateLimit-Reset:
      description: Unix timestamp when limit resets
      schema:
        type: integer
      example: 1705320000

paths:
  /api/v1/resource:
    get:
      summary: Get resource
      description: |
        **Rate Limits**:
        - Authenticated: 1000 requests per hour
        - Unauthenticated: 100 requests per hour
        - Burst: 50 requests per minute
        
        **Rate Limit Headers**:
        All responses include rate limit information in headers.
      
      responses:
        '200':
          headers:
            X-RateLimit-Limit:
              $ref: '#/components/headers/X-RateLimit-Limit'
            X-RateLimit-Remaining:
              $ref: '#/components/headers/X-RateLimit-Remaining'
            X-RateLimit-Reset:
              $ref: '#/components/headers/X-RateLimit-Reset'
```

---

## 12. Async API Documentation (Events)

### AsyncAPI Specification

For event-driven APIs, use AsyncAPI 2.6.0+:

```yaml
asyncapi: 2.6.0

info:
  title: Order Events API
  version: 1.0.0
  description: Event-driven API for order processing

channels:
  order.created:
    description: Published when a new order is created
    subscribe:
      summary: Order Created Event
      message:
        $ref: '#/components/messages/OrderCreated'
  
  order.confirmed:
    description: Published when an order is confirmed
    subscribe:
      summary: Order Confirmed Event
      message:
        $ref: '#/components/messages/OrderConfirmed'

components:
  messages:
    OrderCreated:
      name: OrderCreated
      title: Order Created
      summary: Event published when a new order is created
      contentType: application/json
      payload:
        $ref: '#/components/schemas/OrderCreatedPayload'
      examples:
        - name: Standard Order
          summary: Typical order creation
          payload:
            orderId: "550e8400-e29b-41d4-a716-446655440000"
            customerId: "customer-123"
            items: [...]
            total: 299.99
            createdAt: "2024-01-15T10:30:00Z"
  
  schemas:
    OrderCreatedPayload:
      type: object
      required:
        - orderId
        - customerId
        - items
        - total
        - createdAt
      properties:
        orderId:
          type: string
          format: uuid
          description: Unique order identifier
        customerId:
          type: string
          description: Customer who placed the order
        items:
          type: array
          description: Order line items
        total:
          type: number
          description: Order total amount
        createdAt:
          type: string
          format: date-time
          description: Order creation timestamp
```

---

## 13. Code Annotation Standards

### Inline Documentation Requirements

Use JSDoc/TSDoc for code-level documentation:

```typescript
/**
 * Creates a new product in the catalog
 * 
 * @route POST /api/v1/products
 * @group Products - Product management operations
 * @param {CreateProductDto} request.body.required - Product creation data
 * @returns {Product.model} 201 - Product created successfully
 * @returns {ValidationError.model} 400 - Invalid request data
 * @returns {Error.model} 401 - Unauthorized
 * @returns {Error.model} 403 - Forbidden
 * @returns {Error.model} 500 - Internal server error
 * @security bearerAuth
 * @example request - Minimal product creation
 * {
 *   "name": "Premium Headphones",
 *   "price": 299.99,
 *   "status": "DRAFT"
 * }
 * @example response - 201 - Success response
 * {
 *   "id": "550e8400-e29b-41d4-a716-446655440000",
 *   "name": "Premium Headphones",
 *   "price": 299.99,
 *   "status": "DRAFT",
 *   "createdAt": "2024-01-15T10:30:00Z"
 * }
 */
@Post('/')
@UseGuards(JwtAuthGuard)
@ApiOperation({ summary: 'Create a new product' })
@ApiResponse({ status: 201, type: Product })
async createProduct(@Body() dto: CreateProductDto): Promise<Product> {
  return this.productService.create(dto);
}
```

---

## 14. Interactive Documentation

### Documentation Portal Requirements

Every API MUST provide:
- **Interactive API Explorer**: Swagger UI, Redoc, or similar
- **Try It Out**: Ability to make real API calls
- **Code Samples**: Auto-generated in multiple languages
- **Postman Collection**: Exportable collection
- **SDK Documentation**: If SDKs are provided

### Documentation Portal Structure

```
docs/
├── api/
│   ├── openapi.yaml           # OpenAPI specification
│   ├── asyncapi.yaml          # AsyncAPI specification
│   ├── index.html             # Swagger UI
│   ├── redoc.html             # ReDoc alternative
│   └── postman/
│       └── collection.json    # Postman collection
├── guides/
│   ├── getting-started.md     # Quick start guide
│   ├── authentication.md      # Auth guide
│   ├── pagination.md          # Pagination guide
│   ├── error-handling.md      # Error handling guide
│   └── rate-limiting.md       # Rate limiting guide
├── tutorials/
│   ├── create-resource.md     # Step-by-step tutorials
│   └── bulk-operations.md
├── migration/
│   ├── v1-to-v2.md           # Migration guides
│   └── breaking-changes.md
└── sdk/
    ├── javascript.md          # SDK documentation
    ├── python.md
    └── java.md
```

---

## 15. Documentation Testing & Validation

### Automated Documentation Tests

```typescript
describe('API Documentation', () => {
  describe('OpenAPI Specification', () => {
    it('should be valid OpenAPI 3.1.0', async () => {
      const spec = await loadOpenAPISpec();
      const validator = new OpenAPIValidator();
      
      expect(() => validator.validate(spec)).not.toThrow();
    });
    
    it('should document all endpoints', async () => {
      const spec = await loadOpenAPISpec();
      const routes = getAllRoutes();
      
      routes.forEach(route => {
        expect(spec.paths).toHaveProperty(route.path);
        expect(spec.paths[route.path]).toHaveProperty(route.method);
      });
    });
    
    it('should have examples for all endpoints', async () => {
      const spec = await loadOpenAPISpec();
      
      Object.values(spec.paths).forEach(pathItem => {
        Object.values(pathItem).forEach(operation => {
          expect(operation.responses['200'].content['application/json'])
            .toHaveProperty('examples');
        });
      });
    });
  });
  
  describe('Documentation Completeness', () => {
    it('should document all error responses', async () => {
      const spec = await loadOpenAPISpec();
      const requiredErrors = [400, 401, 403, 404, 500];
      
      Object.values(spec.paths).forEach(pathItem => {
        Object.values(pathItem).forEach(operation => {
          requiredErrors.forEach(code => {
            expect(operation.responses).toHaveProperty(code.toString());
          });
        });
      });
    });
  });
});
```

---

## 16. Documentation Maintenance

### Documentation Update Workflow

1. **Code Change**: Developer modifies endpoint
2. **Annotation Update**: Update JSDoc/decorators
3. **Spec Generation**: Auto-generate OpenAPI spec
4. **Validation**: CI/CD validates spec
5. **Review**: Documentation changes reviewed in PR
6. **Deployment**: Documentation deployed with code

### Documentation Review Checklist

- [ ] All new endpoints documented
- [ ] Request/response schemas complete
- [ ] Error responses documented
- [ ] Examples provided
- [ ] Authentication documented
- [ ] Rate limits specified
- [ ] Deprecation warnings added (if applicable)
- [ ] Migration guide created (for breaking changes)
- [ ] OpenAPI spec validates
- [ ] Interactive docs updated

---

## 17. Enforcement Mechanisms

### CI/CD Integration

```yaml
# Documentation Validation Pipeline
documentation-validation:
  stage: validate
  script:
    - npm run docs:validate
    - npm run docs:lint
    - npm run docs:test
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
  allow_failure: false
```

### Quality Gates

**Deployment Blockers**:
- OpenAPI spec validation failure
- Missing endpoint documentation
- Incomplete error documentation
- No examples provided
- Broken documentation links

**Warnings**:
- Documentation coverage below 95%
- Missing optional fields documentation
- Outdated migration guides

---

## 18. The Final Law

> **If an API is not documented, it does not exist.**  
> **If documentation is wrong, the API is broken.**  
> **Documentation is not optional—it is the contract.**

This constitution is binding for all APIs, services, and systems.

---

**End of Constitution**
