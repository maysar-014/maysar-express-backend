# Auth Service - Events

## Events Emitted

### UserLoggedIn
- **Topic**: `auth.login`
- **Payload**: `{ userId, sessionId, ipAddress, userAgent }`
- **Consumers**: analytics-service, security-monitoring

### UserLoggedOut
- **Topic**: `auth.logout`
- **Payload**: `{ userId, sessionId }`
- **Consumers**: analytics-service

### TwoFactorEnabled
- **Topic**: `auth.2fa.enabled`
- **Payload**: `{ userId, method }`
- **Consumers**: user-service, notification-service

### SuspiciousLoginAttempt
- **Topic**: `auth.suspicious.login`
- **Payload**: `{ userId, ipAddress, reason }`
- **Consumers**: security-monitoring, notification-service

## Events Consumed

### UserRegistered
- **Topic**: `user.registered`
- **Source**: user-service
- **Handler**: Creates initial auth credentials
