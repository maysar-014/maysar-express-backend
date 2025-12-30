# Database Outage Response (P0 Incident)

## Overview
Database outage affects all services that depend on data persistence. This is a critical P0 incident that requires immediate response as it impacts revenue generation, user experience, and system availability.

## Detection
- **Alert Sources**:
  - Database connection pool exhaustion alerts
  - Database CPU/memory utilization > 90%
  - Connection timeout errors in application logs
  - PagerDuty alerts from database monitoring
  - Grafana dashboards showing database unavailability

- **User Impact Indicators**:
  - 5xx errors in API responses
  - Order placement failures
  - Payment processing failures
  - User authentication failures

## Impact Assessment
- **Business Impact**: Complete revenue loss during outage
- **User Impact**: Unable to place orders, access accounts, or use platform
- **System Impact**: All services become partially or fully unavailable
- **Recovery Time**: Target < 15 minutes for read-only mode, < 1 hour for full recovery

## Immediate Actions (First 5 minutes)

### 1. Acknowledge and Assess
```bash
# Check database status
kubectl get pods -n database
kubectl logs -f deployment/postgres -n database --tail=50

# Check application connectivity
kubectl exec -it deployment/order-service -n maysar -- curl -f http://postgres:5432/health
```

### 2. Enable Read-Only Mode (if possible)
```bash
# Switch API Gateway to read-only mode
kubectl patch configmap api-gateway-config -n maysar \
  --type merge -p '{"data":{"mode":"read-only"}}'

# Scale down write-heavy services
kubectl scale deployment order-service --replicas=0 -n maysar
kubectl scale deployment payment-service --replicas=0 -n maysar
```

### 3. Notify Stakeholders
- **Immediate**: Engineering team, on-call DBA, management
- **Customer Communication**: Status page update within 5 minutes

## Investigation Steps

### Database Health Check
```bash
# Check database pod status
kubectl describe pod postgres-0 -n database

# Check database logs
kubectl logs postgres-0 -n database --previous

# Check disk space
kubectl exec postgres-0 -n database -- df -h

# Check database connections
kubectl exec postgres-0 -n database -- psql -U postgres -d postgres -c "SELECT count(*) FROM pg_stat_activity;"
```

### Application Layer Investigation
```bash
# Check service health
kubectl get pods -n maysar

# Check recent deployments
kubectl rollout history deployment/order-service -n maysar

# Check for error patterns
kubectl logs -f deployment/order-service -n maysar --tail=100 | grep -i error
```

### Network and Infrastructure Check
```bash
# Check network policies
kubectl get networkpolicies -n database

# Check service mesh status (Istio)
kubectl get pods -n istio-system

# Check AWS RDS status (if applicable)
aws rds describe-db-instances --db-instance-identifier maysar-prod
```

## Resolution Steps

### Scenario 1: Database Connection Issues
```bash
# Restart database connections
kubectl rollout restart deployment/postgres -n database

# Check connection pool settings
kubectl exec postgres-0 -n database -- psql -U postgres -c "SHOW max_connections;"

# Reset connection pools in applications
kubectl rollout restart deployment/order-service -n maysar
```

### Scenario 2: Database Performance Degradation
```bash
# Check slow queries
kubectl exec postgres-0 -n database -- psql -U postgres -c "
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC
LIMIT 10;"

# Kill long-running queries (CAUTION)
kubectl exec postgres-0 -n database -- psql -U postgres -c "
SELECT pg_cancel_backend(pid) FROM pg_stat_activity
WHERE now() - pg_stat_activity.query_start > interval '5 minutes';"
```

### Scenario 3: Database Storage Full
```bash
# Check disk usage
kubectl exec postgres-0 -n database -- du -sh /var/lib/postgresql/data

# Clean up old WAL files (if using replication)
kubectl exec postgres-0 -n database -- pg_archivecleanup /var/lib/postgresql/data/pg_wal <oldest_needed_wal>

# Extend disk space (AWS EBS)
aws ec2 modify-volume --volume-id vol-xxxxxxxx --size 200
```

### Scenario 4: Database Corruption
```bash
# Attempt database recovery
kubectl exec postgres-0 -n database -- pg_resetwal /var/lib/postgresql/data

# Restore from backup (last resort)
kubectl apply -f database-restore-job.yaml
```

## Recovery Verification

### Functional Tests
```bash
# Test database connectivity
kubectl exec deployment/order-service -n maysar -- npm run db:health

# Test basic CRUD operations
curl -X GET https://api.maysar.com/health/database

# Test user authentication
curl -X POST https://api.maysar.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@maysar.com","password":"test123"}'
```

### Performance Validation
```bash
# Check response times
kubectl logs deployment/order-service -n maysar --tail=50 | grep "duration"

# Monitor error rates
curl https://prometheus.maysar.com/api/v1/query?query=rate(http_requests_total{status="500"}[5m])
```

### Business Validation
- Order placement works
- Payment processing functional
- User authentication successful
- Inventory queries return data

## Prevention Measures

### Immediate Actions
1. **Implement Database Connection Pooling**: Configure proper connection limits
2. **Add Database Health Checks**: Implement comprehensive monitoring
3. **Circuit Breaker Pattern**: Implement in application services
4. **Database Query Optimization**: Regular query performance reviews

### Long-term Actions
1. **Database Replication**: Implement read replicas for high availability
2. **Automated Backups**: Daily automated backups with testing
3. **Capacity Planning**: Monitor database growth and plan scaling
4. **Query Monitoring**: Implement query performance monitoring

## Communication Plan

### Internal Communication
- **Slack Channel**: #incidents-database
- **Status Page**: Internal status page updates
- **Management**: Regular updates every 15 minutes

### External Communication
- **Customer Status Page**: https://status.maysar.com
- **Email Notifications**: For prolonged outages (>30 minutes)
- **Social Media**: For major outages affecting many users

## Escalation Path

| Time Since Incident | Action |
|-------------------|--------|
| 0-15 minutes | On-call engineer responds |
| 15-30 minutes | Engineering manager notified |
| 30-60 minutes | VP Engineering notified |
| 60+ minutes | CTO and executive team notified |

## Related Runbooks
- [Payment Service Failure](./payment-service-failure.md)
- [Service Degradation](./../high-priority/service-degradation.md)
- [Database Maintenance](./../maintenance/database-maintenance.md)
- [Zero Downtime Deployment](./../maintenance/zero-downtime-deployment.md)

## Last Updated
2025-12-30 - SRE Team
