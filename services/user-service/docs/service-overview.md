# User Service - Service Overview

## Purpose
Owns user identity, profile management, and COD reputation scoring. Central registry for all platform participants (buyers, sellers, enablers, couriers).

## Key Domain Concepts

### User Aggregate
- `User_User` table with role-based access
- Roles: BUYER, SELLER, ENABLER, COURIER, ADMIN
- COD reputation score (0-100)

### COD Reputation Scoring
- Tracks COD order completion history
- Influences wallet pre-authorization requirements
- Updated on delivery confirmation

### Profile Management
- KYC verification status
- Business registry integration
- Multi-role support (user can be both buyer and seller)

## Primary Dependencies
- **auth-service**: Authentication and session management
- **wallet-service**: Wallet creation on user registration
- **order-service**: COD reputation updates

## Internal Lookup Endpoint (Auth Integration)
The user service exposes a minimal internal lookup route used by the auth service to resolve a user by email or phone without direct database coupling.

- **Route:** `GET /api/user/lookup?email=...` or `?phoneNumber=...`
- **Access:** Internal only. Requires header `x-internal-call: auth-service`
- **Behavior:** Returns `user` or `null` (no search/scan, single record)
- **Why:** Keeps auth decoupled from PII storage/encryption details while providing a reliable, low-latency identity resolution path.
  - If in-process lookup fails or drifts, auth can fall back to this HTTP contract.
  - Protects user data by restricting access and returning only a single record.

## Entry Point
`services/user-service/src/index.ts`

## Database Schema
- `User_User`: Core user aggregate
- `User_Profile`: Extended profile data
- `User_OutboxEvent`: Event durability
- `User_EventIdempotency`: Duplicate prevention
