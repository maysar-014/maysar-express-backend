# OpenAPI And Postman

This tutorial shows how the API contract and the E2E collection work together.

## Why Contracts Matter

OpenAPI and Postman are not just documentation here.

They are how we keep the platform honest about:

- endpoint paths
- request payloads
- response shapes
- status codes
- auth expectations

## OpenAPI

OpenAPI is the source of truth for API consumers.

Good contract updates should include:

- new paths
- updated schemas
- changed examples
- removed deprecated routes

## Postman Collection

The Postman collection is the smoke-test companion.

It helps you verify:

- route availability
- auth wiring
- happy path responses
- basic error envelopes

## Example: New KYC Contract

The KYC work added these contract surfaces:

- `POST /api/kyc/submit`
- `GET /api/kyc/status`
- `PATCH /api/kyc/admin/{userId}`

## Example Request Shape

```json
{
  "fullName": "Ada Lovelace",
  "nationalId": "A1234567",
  "businessName": "Maysar Traders",
  "documents": [
    "https://example.com/documents/id-front.pdf"
  ]
}
```

## Example Response Shape

```json
{
  "success": true,
  "data": {
    "userId": "usr_smoke_buyer_0001",
    "kycStatus": "verified",
    "kycLevel": 1
  }
}
```

## Contract Review Checklist

- Does the route still exist?
- Is the request body strict enough?
- Are examples realistic?
- Are status codes correct?
- Does the collection still match the implementation?

## Exercise

Update one route in OpenAPI and the matching Postman request.

Then compare:

- path
- method
- request body
- expected status code
