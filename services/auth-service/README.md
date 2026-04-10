# Auth Service

[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7+-red)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://docker.com/)

> Handles authentication, authorization, session management, and two-factor authentication for the platform.

## Purpose

The Auth Service is the security gateway for the Maysar platform. It issues and validates JWT tokens, manages refresh token rotation, enforces concurrent session limits via Redis-backed sessions, and provides SMS-based OTP and TOTP two-factor authentication.

## Architecture

Follows Clean Architecture with strict layer separation:

```
src/
├── domain/           # Auth entities, session policies, 2FA logic
├── application/      # Use cases: Login, Logout, RefreshToken, Verify2FA
├── infrastructure/   # Prisma repositories, Redis session store, SMS adapter
└── api/              # Express routes and controllers
```

## Key Domain Concepts

- **JWT Authentication**: Access token + refresh token pair with rotation on each refresh
- **Session Management**: Redis-backed sessions with configurable concurrent session limits and invalidation on logout
- **Two-Factor Authentication**: SMS OTP via sms-service, TOTP (Google Authenticator compatible), backup codes

## Dependencies

| Service | Reason |
|---------|--------|
| user-service | User identity verification during login |
| sms-service | OTP delivery for SMS-based 2FA |
| Redis | Session storage and token blacklisting |

## API Endpoints

```
POST /api/auth/login              # Public email login, issue JWT + refresh token
POST /api/auth/register           # Public email registration, create account
POST /api/auth/logout             # Invalidate session and refresh token
POST /api/auth/refresh            # Rotate refresh token, issue new access token
GET  /api/auth/oauth/initiate     # Public OAuth entry point
GET  /api/auth/oauth/callback     # OAuth redirect callback
POST /api/auth/verify-2fa         # Verify OTP or TOTP code
POST /api/auth/setup-2fa          # Initialize 2FA for a user
POST /api/auth/backup-codes       # Generate backup codes
GET  /api/auth/session            # Get current session info
GET  /health                      # Health check
```

## Database Schema

| Model | Description |
|-------|-------------|
| `Auth_Session` | Active user sessions with Redis TTL |
| `Auth_RefreshToken` | Refresh token registry with rotation tracking |
| `Auth_TwoFactorSecret` | TOTP secrets and backup codes per user |

## Events

See [docs/events.md](docs/events.md) for published and consumed events.

## Sagas

See [docs/sagas.md](docs/sagas.md) for active saga definitions.

## Testing

```bash
npm run test:auth-service
npm run test:auth-service:unit
npm run test:auth-service:integration
npm run test:auth-service:coverage
```

To smoke-test the real Google OAuth client ID, secret, and redirect URI against Google's token endpoint:

```bash
npm run google-oauth:smoke
npm run google-oauth:smoke -- --dry-run
```

The smoke test validates the configured Google OAuth settings, prints the authorization URL, and can exchange a real callback code to verify the ID token and userinfo response without creating or updating users.

## Documentation

| File | Description |
|------|-------------|
| [docs/service-overview.md](docs/service-overview.md) | Purpose, domain concepts, dependencies |
| [docs/events.md](docs/events.md) | Published and consumed events |
| [docs/sagas.md](docs/sagas.md) | Saga definitions |
| [docs/failure-matrix.md](docs/failure-matrix.md) | Failure modes and compensations |
| [docs/scaling-strategy.md](docs/scaling-strategy.md) | Scaling approach |
| [docs/revenue-impact.md](docs/revenue-impact.md) | Business value |
| [docs/modeling/](docs/modeling/) | Sequence diagrams, state machines, use cases |
| [AUTHENTICATION_MIDDLEWARE_USAGE.md](AUTHENTICATION_MIDDLEWARE_USAGE.md) | Auth middleware integration guide |
| [AUTHORIZATION_MIDDLEWARE_USAGE.md](AUTHORIZATION_MIDDLEWARE_USAGE.md) | Authorization middleware integration guide |
