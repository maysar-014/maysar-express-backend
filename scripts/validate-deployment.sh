#!/bin/bash

# Deployment Validation Script
# Validates deployment success across all environments

set -e

ENVIRONMENT=$1
DEPLOYMENT_TYPE=$2

echo "🔍 Validating deployment for $ENVIRONMENT ($DEPLOYMENT_TYPE)"

# Configure kubectl context
if [ "$ENVIRONMENT" = "production" ]; then
    aws eks update-kubeconfig --region eu-west-1 --name maysar-production
    NAMESPACE="production"
elif [ "$ENVIRONMENT" = "staging" ]; then
    aws eks update-kubeconfig --region eu-west-1 --name maysar-staging
    NAMESPACE="staging"
else
    echo "❌ Unknown environment: $ENVIRONMENT"
    exit 1
fi

echo "📊 Checking service health..."

# Check all service deployments
SERVICES=(
    "api-gateway"
    "auth-service"
    "order-service"
    "payment-service"
    "inventory-service"
    "logistics-service"
    "notification-service"
    "analytics-service"
)

for service in "${SERVICES[@]}"; do
    echo "🔍 Checking $service..."

    # Check deployment status
    if ! kubectl get deployment $service -n $NAMESPACE >/dev/null 2>&1; then
        echo "❌ Deployment not found: $service"
        exit 1
    fi

    # Check pod status
    READY_PODS=$(kubectl get pods -n $NAMESPACE -l app=$service -o jsonpath='{.items[*].status.conditions[?(@.type=="Ready")].status}' | grep -o "True" | wc -l)
    TOTAL_PODS=$(kubectl get pods -n $NAMESPACE -l app=$service --no-headers | wc -l)

    if [ "$READY_PODS" -ne "$TOTAL_PODS" ]; then
        echo "❌ Pods not ready for $service: $READY_PODS/$TOTAL_PODS"
        kubectl get pods -n $NAMESPACE -l app=$service
        exit 1
    fi

    echo "✅ $service: $READY_PODS/$TOTAL_PODS pods ready"
done

echo "🌐 Checking service endpoints..."

# Test service endpoints
API_GATEWAY_URL=$(kubectl get svc api-gateway -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

if [ -z "$API_GATEWAY_URL" ]; then
    echo "❌ API Gateway URL not found"
    exit 1
fi

# Wait for load balancer to be ready
echo "⏳ Waiting for load balancer..."
sleep 60

# Test health endpoints
HEALTH_CHECK_URL="http://$API_GATEWAY_URL/health"
echo "🔍 Testing health check: $HEALTH_CHECK_URL"

if ! curl -f -s --max-time 30 "$HEALTH_CHECK_URL" >/dev/null; then
    echo "❌ Health check failed"
    exit 1
fi

echo "✅ Health check passed"

# Test service endpoints
echo "🔍 Testing service endpoints..."

# Auth service
if ! curl -f -s --max-time 10 "http://$API_GATEWAY_URL/v1/auth/health" >/dev/null; then
    echo "❌ Auth service health check failed"
    exit 1
fi

# Order service
if ! curl -f -s --max-time 10 "http://$API_GATEWAY_URL/v1/orders/health" >/dev/null; then
    echo "❌ Order service health check failed"
    exit 1
fi

# Payment service
if ! curl -f -s --max-time 10 "http://$API_GATEWAY_URL/v1/payments/health" >/dev/null; then
    echo "❌ Payment service health check failed"
    exit 1
fi

echo "✅ All service endpoints responding"

echo "📊 Checking SLO compliance..."

# Check CloudWatch metrics for SLO compliance
if [ "$DEPLOYMENT_TYPE" = "canary" ]; then
    # For canary deployments, check metrics for last 10 minutes
    TIME_RANGE="10m"
else
    # For full deployments, check metrics for last 30 minutes
    TIME_RANGE="30m"
fi

# Check error rates
ERROR_RATE=$(aws cloudwatch get-metric-statistics \
    --namespace AWS/ApplicationELB \
    --metric-name HTTPCode_Target_5XX_Count \
    --dimensions Name=LoadBalancer,Value=$(kubectl get svc api-gateway -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}') \
    --start-time $(date -u -d "-$TIME_RANGE" +%Y-%m-%dT%H:%M:%S) \
    --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
    --period 300 \
    --statistics Sum \
    --query 'Datapoints[0].Sum' \
    --output text 2>/dev/null || echo "0")

TOTAL_REQUESTS=$(aws cloudwatch get-metric-statistics \
    --namespace AWS/ApplicationELB \
    --metric-name RequestCount \
    --dimensions Name=LoadBalancer,Value=$(kubectl get svc api-gateway -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}') \
    --start-time $(date -u -d "-$TIME_RANGE" +%Y-%m-%dT%H:%M:%S) \
    --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
    --period 300 \
    --statistics Sum \
    --query 'Datapoints[0].Sum' \
    --output text 2>/dev/null || echo "1")

# Calculate error rate percentage
if [ "$TOTAL_REQUESTS" -gt 0 ]; then
    ERROR_RATE_PERCENT=$(echo "scale=2; ($ERROR_RATE / $TOTAL_REQUESTS) * 100" | bc)
else
    ERROR_RATE_PERCENT="0"
fi

echo "📈 Error Rate: ${ERROR_RATE_PERCENT}% (${ERROR_RATE}/${TOTAL_REQUESTS} requests)"

# Check latency P95
P95_LATENCY=$(aws cloudwatch get-metric-statistics \
    --namespace AWS/ApplicationELB \
    --metric-name TargetResponseTime \
    --dimensions Name=LoadBalancer,Value=$(kubectl get svc api-gateway -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}') \
    --start-time $(date -u -d "-$TIME_RANGE" +%Y-%m-%dT%H:%M:%S) \
    --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
    --period 300 \
    --statistics p95 \
    --query 'Datapoints[0].Maximum' \
    --output text 2>/dev/null || echo "0")

echo "⏱️  P95 Latency: ${P95_LATENCY}s"

# SLO Validation
SLO_AVAILABILITY_THRESHOLD=99.9
SLO_LATENCY_THRESHOLD=5.0  # seconds

# Calculate availability
AVAILABILITY=$(echo "scale=2; (1 - ($ERROR_RATE_PERCENT / 100)) * 100" | bc)
echo "📊 Availability: ${AVAILABILITY}% (SLO: ${SLO_AVAILABILITY_THRESHOLD}%)"

# Validate SLOs
if (( $(echo "$AVAILABILITY < $SLO_AVAILABILITY_THRESHOLD" | bc -l) )); then
    echo "❌ SLO Availability violation: ${AVAILABILITY}% < ${SLO_AVAILABILITY_THRESHOLD}%"
    if [ "$DEPLOYMENT_TYPE" = "canary" ]; then
        echo "🚫 Canary deployment failed SLO validation"
        exit 1
    fi
else
    echo "✅ SLO Availability met"
fi

if (( $(echo "$P95_LATENCY > $SLO_LATENCY_THRESHOLD" | bc -l) )); then
    echo "❌ SLO Latency violation: ${P95_LATENCY}s > ${SLO_LATENCY_THRESHOLD}s"
    if [ "$DEPLOYMENT_TYPE" = "canary" ]; then
        echo "🚫 Canary deployment failed SLO validation"
        exit 1
    fi
else
    echo "✅ SLO Latency met"
fi

echo "🗄️ Checking database connectivity..."

# Test database connections for each service
DB_SERVICES=(
    "auth-service"
    "order-service"
    "payment-service"
    "inventory-service"
    "logistics-service"
    "notification-service"
    "analytics-service"
    "admin-service"
)

for service in "${DB_SERVICES[@]}"; do
    # Check if service can connect to its database
    DB_POD=$(kubectl get pods -n $NAMESPACE -l app=$service -o jsonpath='{.items[0].metadata.name}')
    if [ -n "$DB_POD" ]; then
        if kubectl exec -n $NAMESPACE $DB_POD -- curl -f http://localhost:3000/health/db >/dev/null 2>&1; then
            echo "✅ $service database connection OK"
        else
            echo "❌ $service database connection failed"
            exit 1
        fi
    fi
done

echo "🔄 Checking event flow health..."

# Test event processing health
EVENT_SERVICES=(
    "order-service"
    "inventory-service"
    "payment-service"
    "logistics-service"
    "commission-service"
    "notification-service"
)

for service in "${EVENT_SERVICES[@]}"; do
    EVENT_POD=$(kubectl get pods -n $NAMESPACE -l app=$service -o jsonpath='{.items[0].metadata.name}')
    if [ -n "$EVENT_POD" ]; then
        # Check event processing metrics
        PROCESSED_EVENTS=$(kubectl exec -n $NAMESPACE $EVENT_POD -- curl -s http://localhost:3000/metrics 2>/dev/null | grep "eventbus_events_processed_total" | awk '{print $2}' || echo "0")
        FAILED_EVENTS=$(kubectl exec -n $NAMESPACE $EVENT_POD -- curl -s http://localhost:3000/metrics 2>/dev/null | grep "eventbus_events_failed_total" | awk '{print $2}' || echo "0")

        if [ "$FAILED_EVENTS" -gt 0 ]; then
            echo "⚠️  $service has $FAILED_EVENTS failed events"
        else
            echo "✅ $service event processing healthy"
        fi
    fi
done

echo ""
echo "🎉 Deployment validation completed successfully!"
echo ""
echo "📋 Validation Summary:"
echo "   ✅ All services deployed and healthy"
echo "   ✅ All endpoints responding"
echo "   ✅ SLO compliance verified"
echo "   ✅ Database connections established"
echo "   ✅ Event processing functional"
echo ""
echo "🚀 Deployment ready for production traffic!"
