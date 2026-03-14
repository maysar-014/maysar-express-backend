# User Service Operations Guide

## Overview

This guide covers the operational aspects of running the User Service in production environments. It includes deployment procedures, monitoring strategies, troubleshooting approaches, and maintenance tasks.

---

## Prerequisites

Before deploying the User Service, ensure the following infrastructure is available:

### Required Services

- **PostgreSQL 15+**: Primary data store for user information
- **Redis 7+**: Caching layer and session management
- **Kafka 3.0+**: Message broker for event publishing
- **SMTP Server**: Email delivery for verification and notifications

### System Requirements

- **Node.js**: 18.0.0 or higher
- **npm**: 8.0.0 or higher
- **Docker**: 20.10+ (for containerized deployment)
- **Orchestrator**: 1.24+ (for orchestrated deployment)

### Network Requirements

- Outbound HTTPS access for external integrations
- Internal network access to PostgreSQL, Redis, and Kafka
- DNS resolution for service discovery

---

## Environment Configuration

### Configuration Files

The User Service uses environment variables for configuration. Create a `.env` file in the service root:

```env
# Service Configuration
NODE_ENV=production
SERVICE_NAME=user-service
SERVICE_PORT=3001
LOG_LEVEL=info

# Database Configuration
DATABASE_URL=postgresql://user:password@postgres.internal:5432/maysar_users
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20
DATABASE_TIMEOUT=30000

# Cache Configuration
REDIS_URL=redis://redis.internal:6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0
CACHE_TTL=3600

# Message Broker Configuration
KAFKA_BROKERS=kafka1.internal:9092,kafka2.internal:9092,kafka3.internal:9092
KAFKA_CLIENT_ID=user-service
KAFKA_GROUP_ID=user-service-group
KAFKA_SASL_MECHANISM=plain
KAFKA_SASL_USERNAME=user-service
KAFKA_SASL_PASSWORD=your-kafka-password

# Authentication Configuration
JWT_SECRET=your-jwt-secret-key-min-32-chars
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@maysar.local
SMTP_PASS=your-app-password
SMTP_FROM=noreply@maysar.local

# Security Configuration
BCRYPT_ROUNDS=10
PASSWORD_MIN_LENGTH=8
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true
PASSWORD_REQUIRE_NUMBERS=true
PASSWORD_REQUIRE_SPECIAL_CHARS=true

# Monitoring Configuration
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
DATADOG_API_KEY=your-datadog-api-key
ENABLE_METRICS=true

# Feature Flags
ENABLE_TWO_FACTOR_AUTH=true
ENABLE_ACCOUNT_SUSPENSION=true
ENABLE_SECURITY_BREACH_REPORTING=true
```

### Configuration Validation

Before starting the service, validate the configuration:

```bash
npm run validate:config
```

This command checks that all required environment variables are set and have valid values.

---

## Deployment

### Local Development

For local development, use the development setup:

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate:dev

# Start development server
npm run dev
```

The service will start on `http://localhost:3001`.

### Docker Deployment

Build and run the service in Docker:

```bash
# Build Docker image from monorepo root
docker build -t maysar/user-service:latest -f services/user-service/Dockerfile .

# Run container
docker run -p 3001:3001 \
  --env-file services/user-service/.env.production \
  --name user-service \
  maysar/user-service:latest

# View logs
docker logs -f user-service

# Stop container
docker stop user-service
```

### Docker Compose

For multi-service development, use Docker Compose:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f user-service

# Stop services
docker-compose down
```

### Orchestrator Deployment

Deploy to Orchestrator using provided manifests:

```bash
# Create namespace
deployctl create namespace maysar

# Create secrets
deployctl create secret generic user-service-secrets \
  --from-env-file=.env \
  -n maysar

# Deploy service
deployctl apply -f deploy/deployment.yaml -n maysar
deployctl apply -f deploy/service.yaml -n maysar
deployctl apply -f deploy/ingress.yaml -n maysar

# Verify deployment
deployctl get pods -n maysar -l app=user-service
deployctl get svc -n maysar -l app=user-service

# View logs
deployctl logs -f deployment/user-service -n maysar
```

### Database Migrations

Before starting the service, run database migrations:

```bash
# Run pending migrations
npm run prisma:migrate:deploy

# Create new migration
npm run prisma:migrate:create -- --name migration_name

# Reset database (development only)
npm run prisma:migrate:reset
```

---

## Monitoring

### Health Checks

The User Service provides health check endpoints for monitoring:

```bash
# Overall health
curl http://localhost:3001/health

# Liveness probe
curl http://localhost:3001/health/live

# Readiness probe
curl http://localhost:3001/health/ready
```

### Orchestrator Health Probes

Configure Orchestrator health probes in the deployment manifest:

```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 3001
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /health/ready
    port: 3001
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 2
```

### Logging

The User Service uses structured JSON logging:

```bash
# View logs in real-time
docker logs -f user-service

# View logs with filtering
docker logs user-service | grep "ERROR"

# Export logs to file
docker logs user-service > service.log 2>&1
```

### Metrics

Monitor key metrics:

- **Request Rate**: Requests per second
- **Response Time**: P50, P95, P99 latencies
- **Error Rate**: Failed requests percentage
- **Database Connections**: Active connections
- **Cache Hit Rate**: Cache effectiveness
- **Event Publishing Latency**: Message broker performance

### Alerting

Set up alerts for critical conditions:

- Service down (health check fails)
- High error rate (>5%)
- High latency (P95 > 500ms)
- Database connection pool exhausted
- Cache unavailable
- Message broker unavailable

---

## Troubleshooting

### Service Won't Start

**Symptoms**: Service exits immediately or fails to bind to port

**Diagnosis**:
```bash
# Check logs for errors
docker logs user-service

# Verify port is available
netstat -an | grep 3001

# Check environment variables
env | grep DATABASE_URL
```

**Solutions**:
- Verify all required environment variables are set
- Check database connectivity
- Ensure port 3001 is not in use
- Review logs for specific error messages

### Database Connection Issues

**Symptoms**: "Connection refused" or "Connection timeout" errors

**Diagnosis**:
```bash
# Test database connectivity
psql postgresql://user:password@postgres.internal:5432/maysar_users

# Check database logs
docker logs postgres

# Verify network connectivity
ping postgres.internal
```

**Solutions**:
- Verify DATABASE_URL is correct
- Check PostgreSQL is running
- Verify network connectivity
- Check database credentials
- Increase connection timeout if needed

### Cache Issues

**Symptoms**: Cache-related errors or missing cached data

**Diagnosis**:
```bash
# Test Redis connectivity
redis-cli -h redis.internal ping

# Check Redis memory usage
redis-cli -h redis.internal info memory

# View Redis logs
docker logs redis
```

**Solutions**:
- Verify Redis is running
- Check Redis memory availability
- Clear cache if corrupted: `redis-cli FLUSHDB`
- Increase Redis memory if needed

### Message Broker Issues

**Symptoms**: Events not being published or consumed

**Diagnosis**:
```bash
# Check Kafka broker status
kafka-broker-api-versions.sh --bootstrap-server kafka.internal:9092

# List topics
kafka-topics.sh --list --bootstrap-server kafka.internal:9092

# Check consumer groups
kafka-consumer-groups.sh --list --bootstrap-server kafka.internal:9092
```

**Solutions**:
- Verify Kafka brokers are running
- Check topic exists: `user-events`
- Verify credentials are correct
- Check network connectivity to brokers

### High Memory Usage

**Symptoms**: Service consuming excessive memory

**Diagnosis**:
```bash
# Check memory usage
docker stats user-service

# Check for memory leaks
node --inspect=0.0.0.0:9229 src/main.ts

# Analyze heap dump
node --heap-prof src/main.ts
```

**Solutions**:
- Increase container memory limit
- Check for memory leaks in code
- Reduce cache TTL
- Implement pagination for large queries

### High CPU Usage

**Symptoms**: Service consuming excessive CPU

**Diagnosis**:
```bash
# Check CPU usage
docker stats user-service

# Profile CPU usage
node --prof src/main.ts
node --prof-process isolate-*.log > profile.txt
```

**Solutions**:
- Optimize database queries
- Implement caching for expensive operations
- Reduce event processing frequency
- Scale horizontally with multiple instances

---

## Maintenance Tasks

### Regular Backups

Implement regular database backups:

```bash
# Manual backup
pg_dump postgresql://user:password@postgres.internal:5432/maysar_users > backup.sql

# Automated backup (daily at 2 AM)
0 2 * * * pg_dump postgresql://user:password@postgres.internal:5432/maysar_users | gzip > /backups/maysar_users_$(date +\%Y\%m\%d).sql.gz
```

### Database Maintenance

Perform regular database maintenance:

```bash
# Analyze query performance
npm run prisma:db:analyze

# Vacuum database (remove dead rows)
npm run prisma:db:vacuum

# Reindex tables
npm run prisma:db:reindex
```

### Cache Cleanup

Periodically clean up cache:

```bash
# Clear expired cache entries
redis-cli -h redis.internal EVAL "return redis.call('del', unpack(redis.call('keys', ARGV[1])))" 0 "cache:*"

# Monitor cache size
redis-cli -h redis.internal INFO memory
```

### Log Rotation

Implement log rotation to manage disk space:

```bash
# Configure logrotate
cat > /etc/logrotate.d/user-service << EOF
/var/log/user-service/*.log {
  daily
  rotate 7
  compress
  delaycompress
  notifempty
  create 0640 nobody nobody
  sharedscripts
  postrotate
    docker kill -s HUP user-service
  endscript
}
EOF
```

### Security Updates

Keep dependencies updated:

```bash
# Check for vulnerabilities
npm audit

# Update dependencies
npm update

# Update to latest versions
npm upgrade

# Rebuild and redeploy
docker build -t maysar/user-service:latest .
```

---

## Scaling

### Horizontal Scaling

Deploy multiple instances of the User Service:

```yaml
# Orchestrator deployment with multiple replicas
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: user-service
  template:
    metadata:
      labels:
        app: user-service
    spec:
      containers:
      - name: user-service
        image: maysar/user-service:latest
        ports:
        - containerPort: 3001
```

### Load Balancing

Configure load balancing across instances:

```yaml
# Orchestrator service
apiVersion: v1
kind: Service
metadata:
  name: user-service
spec:
  type: LoadBalancer
  selector:
    app: user-service
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3001
```

### Auto-Scaling

Enable auto-scaling based on metrics:

```yaml
# Horizontal Pod Autoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: user-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: user-service
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

---

## Disaster Recovery

### Backup Strategy

Implement a comprehensive backup strategy:

- **Daily backups**: Full database backup daily
- **Hourly backups**: Incremental backups hourly
- **Off-site storage**: Store backups in separate location
- **Backup verification**: Regularly test backup restoration

### Recovery Procedures

Procedures for recovering from failures:

```bash
# Restore from backup
psql postgresql://user:password@postgres.internal:5432/maysar_users < backup.sql

# Verify data integrity
npm run verify:data

# Restart service
docker restart user-service

# Verify service health
curl http://localhost:3001/health
```

### Failover

Configure failover for high availability:

- Primary and standby database instances
- Automatic failover on primary failure
- Read replicas for load distribution
- Connection pooling for resilience

---

## Performance Optimization

### Database Optimization

Optimize database performance:

```bash
# Analyze slow queries
npm run analyze:slow-queries

# Create indexes
npm run create:indexes

# Update statistics
npm run update:statistics
```

### Caching Strategy

Implement effective caching:

- Cache user profiles (1-hour TTL)
- Cache user permissions (30-minute TTL)
- Cache verification tokens (15-minute TTL)
- Invalidate cache on updates

### Query Optimization

Optimize database queries:

- Use pagination for large result sets
- Add database indexes for frequently queried fields
- Use connection pooling
- Implement query result caching

---

## Security Hardening

### Network Security

- Use VPN for inter-service communication
- Implement network policies in Orchestrator
- Use TLS for all external connections
- Restrict inbound traffic to necessary ports

### Access Control

- Use strong authentication credentials
- Implement role-based access control
- Audit all access attempts
- Rotate credentials regularly

### Data Protection

- Encrypt sensitive data at rest
- Encrypt data in transit (HTTPS/TLS)
- Mask PII in logs
- Implement data retention policies

---

## Compliance

### Audit Logging

Maintain comprehensive audit logs:

- All user operations logged
- Access attempts recorded
- Configuration changes tracked
- Security events documented

### Data Retention

Implement data retention policies:

- User data retained for account lifetime
- Deleted user data archived for 90 days
- Audit logs retained for 1 year
- Backup data retained for 30 days

### GDPR Compliance

Ensure GDPR compliance:

- Right to access: Provide user data export
- Right to deletion: Implement account deletion
- Right to portability: Export data in standard format
- Data minimization: Collect only necessary data

---

## Conclusion

This operations guide provides comprehensive procedures for deploying, monitoring, and maintaining the User Service in production environments. Follow these guidelines to ensure reliable, secure, and performant service operation.

For additional support or questions, contact the operations team or refer to the service documentation.
