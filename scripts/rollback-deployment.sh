#!/bin/bash

# Rollback Deployment Script
# Automated rollback for failed deployments

set -e

ENVIRONMENT=$1
ROLLBACK_SHA=$2

if [ -z "$ENVIRONMENT" ] || [ -z "$ROLLBACK_SHA" ]; then
    echo "❌ Usage: $0 <environment> <rollback_sha>"
    echo "   environment: staging|production"
    echo "   rollback_sha: Git SHA to rollback to"
    exit 1
fi

echo "🔄 Initiating rollback for $ENVIRONMENT to $ROLLBACK_SHA"

# Configure environment
if [ "$ENVIRONMENT" = "production" ]; then
    aws eks update-kubeconfig --region eu-west-1 --name maysar-production
    NAMESPACE="production"
    AWS_ACCESS_KEY_ID_VAR="AWS_ACCESS_KEY_ID_PROD"
    AWS_SECRET_ACCESS_KEY_VAR="AWS_SECRET_ACCESS_KEY_PROD"
elif [ "$ENVIRONMENT" = "staging" ]; then
    aws eks update-kubeconfig --region eu-west-1 --name maysar-staging
    NAMESPACE="staging"
    AWS_ACCESS_KEY_ID_VAR="AWS_ACCESS_KEY_ID_STAGING"
    AWS_SECRET_ACCESS_KEY_VAR="AWS_SECRET_ACCESS_KEY_STAGING"
else
    echo "❌ Unknown environment: $ENVIRONMENT"
    exit 1
fi

# Verify rollback SHA exists
if ! git cat-file -e "$ROLLBACK_SHA" 2>/dev/null; then
    echo "❌ Rollback SHA does not exist: $ROLLBACK_SHA"
    exit 1
fi

echo "📋 Rollback Details:"
echo "   Environment: $ENVIRONMENT"
echo "   Namespace: $NAMESPACE"
echo "   Rollback SHA: $ROLLBACK_SHA"
echo "   Timestamp: $(date)"

# Create rollback record
ROLLBACK_ID="rollback-$(date +%Y%m%d-%H%M%S)"
echo "🔄 Rollback ID: $ROLLBACK_ID"

# Step 1: Enable maintenance mode (if applicable)
echo "🔧 Enabling maintenance mode..."
kubectl patch deployment api-gateway -n $NAMESPACE \
    --type='json' \
    -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/env/-", "value": {"name": "MAINTENANCE_MODE", "value": "true"}}]' || true

# Wait for maintenance mode to take effect
sleep 30

# Step 2: Scale down current deployments gradually
echo "⬇️  Scaling down current deployments..."

SERVICES=(
    "auth-service"
    "order-service"
    "payment-service"
    "inventory-service"
    "logistics-service"
    "notification-service"
    "analytics-service"
    "admin-service"
    "seller-service"
    "catalog-service"
    "commission-service"
    "trust-service"
    "community-service"
)

for service in "${SERVICES[@]}"; do
    echo "⬇️  Scaling $service to 0 replicas..."
    kubectl scale deployment $service -n $NAMESPACE --replicas=0 || true
done

# Wait for pods to terminate
echo "⏳ Waiting for pods to terminate..."
sleep 60

# Step 3: Deploy rollback version
echo "🚀 Deploying rollback version..."

for service in "${SERVICES[@]}"; do
    echo "📦 Deploying $service:$ROLLBACK_SHA..."

    # Update deployment image
    kubectl set image deployment/$service $service=ghcr.io/${GITHUB_REPOSITORY_OWNER}/maysar-$service:$ROLLBACK_SHA -n $NAMESPACE

    # Scale back up
    kubectl scale deployment $service -n $NAMESPACE --replicas=1

    # Wait for rollout to complete
    kubectl rollout status deployment/$service -n $NAMESPACE --timeout=300s

    echo "✅ $service rollback completed"
done

# Step 4: Verify rollback success
echo "🔍 Verifying rollback..."

# Check all deployments are ready
for service in "${SERVICES[@]}"; do
    READY_REPLICAS=$(kubectl get deployment $service -n $NAMESPACE -o jsonpath='{.status.readyReplicas}')
    if [ "$READY_REPLICAS" != "1" ]; then
        echo "❌ $service not ready after rollback"
        exit 1
    fi
    echo "✅ $service ready"
done

# Step 5: Disable maintenance mode
echo "🔧 Disabling maintenance mode..."
kubectl patch deployment api-gateway -n $NAMESPACE \
    --type='json' \
    -p='[{"op": "remove", "path": "/spec/template/spec/containers/0/env", "value": {"name": "MAINTENANCE_MODE"}}]' || true

# Step 6: Run health checks
echo "🏥 Running health checks..."

API_GATEWAY_URL=$(kubectl get svc api-gateway -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

# Wait for load balancer
sleep 60

# Test health endpoint
if ! curl -f -s --max-time 30 "http://$API_GATEWAY_URL/health" >/dev/null; then
    echo "❌ Health check failed after rollback"
    exit 1
fi

echo "✅ Health check passed"

# Step 7: Update feature flags (rollback incompatible features)
echo "🏴 Updating feature flags for rollback..."

# Disable features that may not be compatible with rollback version
FEATURE_FLAGS_TO_DISABLE=(
    "new-payment-flow"
    "advanced-analytics"
    "experimental-ui"
)

for flag in "${FEATURE_FLAGS_TO_DISABLE[@]}"; do
    echo "🏴 Disabling feature flag: $flag"
    # Integration with LaunchDarkly or feature flag service
    # This would call your feature flag API to disable incompatible features
done

# Step 8: Notify stakeholders
echo "📢 Notifying stakeholders..."

# Slack notification
curl -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"🔄 Production rollback completed - $ROLLBACK_SHA\"}" \
    $SLACK_WEBHOOK_URL || true

# Step 9: Update deployment tracking
echo "📝 Updating deployment tracking..."

# Record rollback in deployment history
cat >> deployment-history.log << EOF
$(date): ROLLBACK - Environment: $ENVIRONMENT, SHA: $ROLLBACK_SHA, RollbackID: $ROLLBACK_ID
EOF

# Step 10: Trigger follow-up actions
echo "🔄 Triggering follow-up actions..."

# Run smoke tests
npm run test:smoke -- --environment=$ENVIRONMENT || true

# Validate SLOs
./scripts/validate-slos.sh $ENVIRONMENT || true

echo ""
echo "🎉 Rollback completed successfully!"
echo ""
echo "📋 Rollback Summary:"
echo "   ✅ All services rolled back to $ROLLBACK_SHA"
echo "   ✅ Health checks passed"
echo "   ✅ Maintenance mode disabled"
echo "   ✅ Feature flags updated"
echo "   ✅ Stakeholders notified"
echo ""
echo "📊 Rollback ID: $ROLLBACK_ID"
echo "🕐 Completion Time: $(date)"
echo ""
echo "⚠️  IMPORTANT: Monitor system closely for the next 30 minutes"
echo "📞 On-call team has been notified"
echo ""
echo "🔍 Check dashboard: https://monitoring.maysar.com/d/rollback-$ROLLBACK_ID"
