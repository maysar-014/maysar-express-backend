#!/bin/bash
set -e

echo "🔍 Starting Container Compliance Validation..."

DOCKERFILE="Dockerfile"
COMPOSE_FILE="docker-compose.prod.yml"

# 1. Non-Root User Check
if grep -q "USER" "$DOCKERFILE"; then
    echo "✅ Dockerfile: USER directive found (Non-Root Mandate)"
else
    echo "❌ Dockerfile: Missing USER directive!"
    exit 1
fi

# 2. Healthcheck Check
if grep -q "HEALTHCHECK" "$DOCKERFILE"; then
    echo "✅ Dockerfile: HEALTHCHECK found (Health Check Mandate)"
else
    echo "❌ Dockerfile: Missing HEALTHCHECK!"
    exit 1
fi

# 3. Dumb-init Signal Handling
if grep -q "dumb-init" "$DOCKERFILE"; then
    echo "✅ Dockerfile: dumb-init used (Signal Handling Law)"
else
    echo "❌ Dockerfile: dumb-init not found!"
    exit 1
fi

# 4. Resource Limits (in prod compose)
if grep -q "limits:" "$COMPOSE_FILE"; then
    echo "✅ Docker Compose (Prod): Resource limits defined (Resource Stewardship)"
else
    echo "❌ Docker Compose (Prod): Missing resource limits!"
    exit 1
fi

# 5. Read-only filesystem recommendation
if grep -q "read_only: true" "$COMPOSE_FILE" || grep -q "readOnlyRootFilesystem: true" "$COMPOSE_FILE"; then
    echo "✅ Filesystem check passed (or verified manually in K8s)"
else
    echo "⚠️  Recommendation: Ensure read-only filesystem where possible (checked in K8s values)"
fi

echo "🎉 All compliance checks passed!"
