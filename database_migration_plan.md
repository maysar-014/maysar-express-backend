# Database Migration Plan: User Service Separation

## Executive Summary

This document outlines the comprehensive database migration strategy for separating user management functionality from the authentication service into a dedicated User Service. The plan addresses data consistency, migration safety, and ongoing synchronization between services.

## Current Database State Analysis

### Services with User-Related Data

#### 1. Auth Service Database (`auth-service/prisma/schema.prisma`)
**Primary User Model:**
```prisma
model User {
  id                      String   @id @default(cuid())
  email                   String   @unique
  passwordHash            String
  role                    UserRole @default(BUYER)
  status                  UserStatus @default(PENDING_VERIFICATION)

  // Profile Information
  phoneNumber             String?
  isEmailVerified         Boolean  @default(false)
  isPhoneVerified         Boolean  @default(false)

  // Security Tracking
  failedLoginAttempts     Int      @default(0)
  lockoutUntil            DateTime?
  lastLoginAt             DateTime?
  passwordChangedAt       DateTime?

  // Two-Factor Authentication
  twoFactorEnabled        Boolean  @default(false)
  twoFactorSecret         String?

  // Relations
  sessions                Session[]
  passwordResetTokens     PasswordResetToken[]
  emailVerificationTokens EmailVerificationToken[]
  auditLogs               AuditLog[]
}
```

**Additional Models:**
- `Session` - User authentication sessions
- `PasswordResetToken` - Password reset functionality
- `EmailVerificationToken` - Email verification
- `AuditLog` - Security audit logging
- `UserIndex` - Additional indexing

#### 2. Community Service Database (`community-service/prisma/schema.prisma`)
**Community User Model:**
```prisma
model User {
  id          String   @id @default(uuid())
  username    String   @unique
  displayName String
  avatarUrl   String?
  bio         String?
  location    String?
  website     String?
  isVerified  Boolean  @default(false)
  reputation  Int      @default(0)
  followersCount Int   @default(0)
  followingCount Int  @default(0)
  status      UserStatus @default(active)
  lastActiveAt DateTime
}
```

**Social Features Models:**
- `Post`, `Comment`, `Like`, `Share`, `Follow`, `Bookmark`, `Report`, `Hashtag`

### Data Distribution Issues

1. **Duplicate User Identities**: Multiple services maintain their own user records
2. **Inconsistent User States**: User status and verification can be out of sync
3. **Scattered Profile Data**: User profile information distributed across services
4. **Complex Foreign Keys**: Other services reference user IDs from different sources
5. **Migration Complexity**: Moving from distributed to centralized user management

## Proposed Database Architecture

### User Service Database (New)

#### Core User Model
```prisma
model User {
  id                      String   @id @default(cuid())
  email                   String   @unique
  passwordHash            String
  role                    UserRole @default(BUYER)
  status                  UserStatus @default(PENDING_VERIFICATION)

  // Extended Profile Information
  firstName               String?
  lastName                String?
  phoneNumber             String?
  dateOfBirth             DateTime?
  avatar                  String?

  // Verification Status
  isEmailVerified         Boolean  @default(false)
  isPhoneVerified         Boolean  @default(false)
  emailVerifiedAt         DateTime?
  phoneVerifiedAt         DateTime?

  // Security Tracking
  failedLoginAttempts     Int      @default(0)
  lockoutUntil            DateTime?
  lastLoginAt             DateTime?
  passwordChangedAt       DateTime?

  // Two-Factor Authentication
  twoFactorEnabled        Boolean  @default(false)
  twoFactorSecret         String?

  // Preferences
  language                String   @default("en")
  timezone                String   @default("UTC")
  notificationsEnabled    Boolean  @default(true)

  // Metadata
  attributes              Json?

  // Timestamps
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt

  // Relations
  addresses               UserAddress[]
  sessions                Session[]
  passwordResetTokens     PasswordResetToken[]
  emailVerificationTokens EmailVerificationToken[]
  auditLogs               AuditLog[]
}
```

#### Extended Models
```prisma
model UserAddress {
  id          String      @id @default(cuid())
  userId      String
  type        AddressType @default(HOME)
  street      String
  city        String
  state       String?
  postalCode  String?
  country     String
  isDefault   Boolean     @default(false)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_addresses")
}
```

### Service-Specific Database Adjustments

#### Auth Service (After Migration)
**Reduced User Model:**
```prisma
model AuthUser {
  id            String @id // References User Service
  lastLoginAt   DateTime?
  sessions      Session[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@map("auth_users")
}
```

#### Community Service (After Migration)
**Community Profile Extension:**
```prisma
model CommunityProfile {
  userId        String   @id // References User Service
  username      String   @unique
  displayName   String
  avatarUrl     String?
  bio           String?
  location      String?
  website       String?
  reputation    Int      @default(0)
  followersCount Int     @default(0)
  followingCount Int     @default(0)
  lastActiveAt  DateTime

  @@map("community_profiles")
}
```

## Migration Strategy

### Phase 1: Data Assessment and Preparation

#### 1.1 Data Inventory
```sql
-- Analyze current user data distribution
SELECT
  'auth_service' as service,
  COUNT(*) as user_count,
  COUNT(DISTINCT email) as unique_emails
FROM auth_service.users

UNION ALL

SELECT
  'community_service' as service,
  COUNT(*) as user_count,
  COUNT(DISTINCT username) as unique_usernames
FROM community_service.users;
```

#### 1.2 Data Quality Assessment
```sql
-- Identify data quality issues
SELECT
  COUNT(*) as total_users,
  COUNT(CASE WHEN email IS NULL OR email = '' THEN 1 END) as invalid_emails,
  COUNT(CASE WHEN status NOT IN ('active', 'pending_verification', 'suspended', 'deactivated', 'locked') THEN 1 END) as invalid_status
FROM auth_service.users;
```

#### 1.3 Duplicate Detection
```sql
-- Find potential duplicate users across services
SELECT
  a.email,
  a.id as auth_user_id,
  c.username,
  c.id as community_user_id
FROM auth_service.users a
FULL OUTER JOIN community_service.users c
  ON LOWER(a.email) = LOWER(c.username || '@temp.com') -- Assuming email pattern
WHERE a.id IS NULL OR c.id IS NULL;
```

### Phase 2: Data Migration Execution

#### 2.1 Create User Service Database
```sql
-- Create new user_service database
CREATE DATABASE user_service;
-- Run Prisma migrations for user service
npx prisma migrate deploy
```

#### 2.2 Master User Data Migration
```sql
-- Migrate primary user data from auth service
INSERT INTO user_service.users (
  id, email, passwordHash, role, status,
  phoneNumber, isEmailVerified, isPhoneVerified,
  failedLoginAttempts, lockoutUntil, lastLoginAt, passwordChangedAt,
  twoFactorEnabled, twoFactorSecret,
  createdAt, updatedAt
)
SELECT
  id, email, passwordHash, role, status,
  phoneNumber, isEmailVerified, isPhoneVerified,
  failedLoginAttempts, lockoutUntil, lastLoginAt, passwordChangedAt,
  twoFactorEnabled, twoFactorSecret,
  createdAt, updatedAt
FROM auth_service.users;
```

#### 2.3 Community Profile Migration
```sql
-- Create community profile extensions
INSERT INTO community_service.community_profiles (
  userId, username, displayName, avatarUrl, bio,
  location, website, reputation, followersCount,
  followingCount, lastActiveAt
)
SELECT
  u.id, c.username, c.displayName, c.avatarUrl, c.bio,
  c.location, c.website, c.reputation, c.followersCount,
  c.followingCount, c.lastActiveAt
FROM user_service.users u
JOIN community_service.users c
  ON LOWER(u.email) = LOWER(c.username || '@domain.com'); -- Adjust matching logic
```

#### 2.4 Foreign Key Updates
```sql
-- Update foreign keys in auth service
UPDATE auth_service.sessions
SET userId = u.id
FROM user_service.users u
WHERE sessions.userId = u.id; -- Assuming ID match

-- Update foreign keys in community service
UPDATE community_service.posts
SET authorId = cp.userId
FROM community_service.community_profiles cp
WHERE posts.authorId = cp.userId;
```

### Phase 3: Service Transition and Validation

#### 3.1 Gradual Service Cutover
```bash
# Deploy user service
deployctl apply -f user-service-deployment.yaml

# Update auth service to use user service
# Deploy updated auth service
deployctl apply -f auth-service-deployment-updated.yaml

# Update community service references
deployctl apply -f community-service-deployment-updated.yaml
```

#### 3.2 Data Consistency Validation
```sql
-- Validate data integrity
SELECT
  COUNT(*) as user_count_match
FROM user_service.users u
JOIN auth_service.users a ON u.id = a.id
WHERE u.email = a.email AND u.status = a.status;
```

#### 3.3 Rollback Procedures
```sql
-- Prepare rollback scripts
-- Auth service fallback to local user data
-- Community service fallback to local user data
-- User service deactivation
```

## Data Synchronization Mechanisms

### Event-Driven Synchronization

#### User Service Publishes Events
```typescript
// User created
{
  event: 'user.created',
  data: {
    userId: 'uuid',
    email: 'user@example.com',
    role: 'buyer',
    timestamp: '2024-01-14T12:00:00Z'
  }
}

// User updated
{
  event: 'user.updated',
  data: {
    userId: 'uuid',
    changes: ['firstName', 'lastName', 'phoneNumber'],
    timestamp: '2024-01-14T12:00:00Z'
  }
}

// User status changed
{
  event: 'user.status.changed',
  data: {
    userId: 'uuid',
    oldStatus: 'active',
    newStatus: 'suspended',
    reason: 'policy_violation',
    timestamp: '2024-01-14T12:00:00Z'
  }
}
```

#### Service-Specific Event Handlers

**Auth Service Event Handlers:**
```typescript
// Update local auth cache
async handleUserUpdated(event: UserUpdatedEvent) {
  await this.cache.updateUser(event.data.userId, event.data.changes);
}

// Handle account suspensions
async handleUserStatusChanged(event: UserStatusChangedEvent) {
  if (event.data.newStatus === 'suspended') {
    await this.invalidateUserSessions(event.data.userId);
  }
}
```

**Community Service Event Handlers:**
```typescript
// Update community profile cache
async handleUserUpdated(event: UserUpdatedEvent) {
  await this.updateCommunityProfile(event.data.userId, event.data.changes);
}

// Handle account deactivations
async handleUserStatusChanged(event: UserStatusChangedEvent) {
  if (event.data.newStatus === 'deactivated') {
    await this.hideUserContent(event.data.userId);
  }
}
```

### Cache Strategies

#### Multi-Level Caching
```
User Service (Source of Truth)
    â†“ Events
Auth Service Cache (5 min TTL)
    â†“ Cache Invalidation
Community Service Cache (10 min TTL)
```

#### Cache Invalidation Rules
- **Immediate**: Password changes, account status changes, security events
- **Delayed**: Profile updates, preference changes
- **Lazy**: Non-critical data loaded on demand

### Conflict Resolution

#### Last-Write-Wins Strategy
```typescript
async resolveUserUpdate(conflict: UserUpdateConflict) {
  // Compare timestamps
  if (conflict.userServiceTimestamp > conflict.serviceTimestamp) {
    // User Service wins
    await this.service.updateFromUserService(conflict.userId);
  } else {
    // Local service wins
    await this.userService.updateFromService(conflict.userId, conflict.changes);
  }
}
```

## Database Separation Options

### Option 1: Separate Databases (Recommended)
```
User Service DB: user_service (Primary)
â”œâ”€â”€ users
â”œâ”€â”€ user_addresses
â”œâ”€â”€ sessions
â”œâ”€â”€ audit_logs
â””â”€â”€ verification_tokens

Auth Service DB: auth_service
â”œâ”€â”€ auth_users (minimal cache)
â”œâ”€â”€ sessions (auth-specific)
â””â”€â”€ security_logs

Community Service DB: community_service
â”œâ”€â”€ community_profiles
â”œâ”€â”€ posts, comments, likes
â””â”€â”€ social_features
```

### Option 2: Shared Database with Schemas
```
Database: maysar_main
â”œâ”€â”€ user_service schema
â”œâ”€â”€ auth_service schema
â””â”€â”€ community_service schema
```

### Option 3: Micro-Database per Service
```
user-service-db    (Primary user data)
auth-service-db    (Auth-specific data)
community-service-db (Social features)
```

## Migration Timeline

### Week 1: Planning and Assessment
- [x] Data inventory and quality assessment
- [x] Duplicate detection and resolution plan
- [x] Service dependency mapping
- [x] Migration scripts development

### Week 2: Development and Testing
- [ ] User Service database setup
- [ ] Migration scripts implementation
- [ ] Data validation procedures
- [ ] Rollback procedures development

### Week 3: Staging Migration
- [ ] Staging environment migration
- [ ] Service integration testing
- [ ] Performance validation
- [ ] Data consistency verification

### Week 4: Production Migration
- [ ] Production database backup
- [ ] Gradual service cutover
- [ ] Real-time monitoring
- [ ] Rollback readiness

## Risk Mitigation

### Data Loss Prevention
- **Multiple Backups**: Pre-migration, during migration, post-migration
- **Point-in-Time Recovery**: Database snapshots every 30 minutes
- **Data Validation**: Automated checks after each migration step

### Service Downtime Minimization
- **Blue-Green Deployment**: New services deployed alongside old
- **Gradual Traffic Shifting**: 10% â†’ 25% â†’ 50% â†’ 100% user traffic
- **Circuit Breakers**: Automatic fallback to old services if issues detected

### Rollback Procedures
- **Immediate Rollback**: < 30 minutes for critical issues
- **Graceful Degradation**: Services continue with cached data
- **Data Recovery**: Automated scripts to restore from backups

## Success Metrics

### Functional Metrics
- âœ… Zero data loss during migration
- âœ… < 5% service degradation during cutover
- âœ… All user authentication flows working
- âœ… Cross-service user data consistency

### Performance Metrics
- âœ… User Service response time < 200ms
- âœ… Auth Service response time < 500ms (with user service calls)
- âœ… Cache hit rate > 95%
- âœ… Event processing latency < 100ms

### Operational Metrics
- âœ… 99.9% uptime during migration
- âœ… < 1 hour mean time to recovery
- âœ… Comprehensive monitoring coverage
- âœ… Automated alerting for anomalies

## Monitoring and Alerting

### Key Metrics to Monitor
```typescript
// Service health
- user_service.database.connections
- user_service.api.response_time
- auth_service.user_service.calls
- community_service.user_events.processed

// Data consistency
- user_service.data.sync_delay
- auth_service.cache.invalidation_rate
- community_service.profile.update_conflicts

// Migration progress
- migration.users.migrated
- migration.data.validation_passed
- migration.rollback.triggers
```

### Alerting Rules
- Service response time > 1000ms for 5 minutes
- Data synchronization delay > 300 seconds
- Cache invalidation failure rate > 5%
- Migration script errors > 0

## Conclusion

This database migration plan provides a comprehensive, safe, and scalable approach to separating user management from authentication services. The phased approach minimizes risk while ensuring data integrity and service availability throughout the transition.

**Key Success Factors:**
1. Thorough data assessment before migration
2. Automated validation at each step
3. Comprehensive rollback procedures
4. Real-time monitoring and alerting
5. Gradual service cutover with feature flags

The resulting architecture will provide better scalability, maintainability, and independent evolution of authentication and user management concerns.
