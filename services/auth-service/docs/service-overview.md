# Auth Service - Service Overview

## Purpose
Handles authentication, authorization, session management, and two-factor authentication.

## Key Domain Concepts

### Authentication
- JWT-based token authentication
- Refresh token rotation
- Password hashing (bcrypt)

### Session Management
- Redis-backed session store
- Session invalidation on logout
- Concurrent session limits

### Two-Factor Authentication
- SMS-based OTP
- TOTP support (Google Authenticator)
- Backup codes

## Primary Dependencies
- **user-service**: User identity verification
- **sms-service**: OTP delivery
- **Redis**: Session storage

## Entry Point
`services/auth-service/src/index.ts`

## Database Schema
- `Auth_Session`: Active sessions
- `Auth_RefreshToken`: Refresh token registry
- `Auth_TwoFactorSecret`: 2FA secrets
