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

## Entry Point
`services/user-service/src/index.ts`

## Database Schema
- `User_User`: Core user aggregate
- `User_Profile`: Extended profile data
- `User_OutboxEvent`: Event durability
- `User_EventIdempotency`: Duplicate prevention
