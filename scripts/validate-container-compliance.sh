#!/bin/bash
set -e

echo "ðŸ” Starting Container Compliance Validation..."

DOCKERFILE="Dockerfile"
COMPOSE_FILE="docker-compose.prod.yml"

# 1. Non-Root User Check
if grep -q "USER" "$DOCKERFILE"; then
    echo "âœ… Dockerfile: USER directive found (Non-Root Mandate)"
else
    echo "âŒ Dockerfile: Missing USER directive!"
    exit 1
fi

# 2. Healthcheck Check
if grep -q "HEALTHCHECK" "$DOCKERFILE"; then
    echo "âœ… Dockerfile: HEALTHCHECK found (Health Check Mandate)"
else
    echo "âŒ Dockerfile: Missing HEALTHCHECK!"
    exit 1
fi

# 3. Dumb-init Signal Handling
if grep -q "dumb-init" "$DOCKERFILE"; then
    echo "âœ… Dockerfile: dumb-init used (Signal Handling Law)"
else
    echo "âŒ Dockerfile: dumb-init not found!"
    exit 1
fi

# 4. Resource Limits (in prod compose)
if grep -q "limits:" "$COMPOSE_FILE"; then
    echo "âœ… Docker Compose (Prod): Resource limits defined (Resource Stewardship)"
else
    echo "âŒ Docker Compose (Prod): Missing resource limits!"
    exit 1
fi

# 5. Read-only filesystem recommendation
if grep -q "read_only: true" "$COMPOSE_FILE" || grep -q "readOnlyRootFilesystem: true" "$COMPOSE_FILE"; then
    echo "âœ… Filesystem check passed (or verified manually in Orchestrator)"
else
    echo "âš ï¸  Recommendation: Ensure read-only filesystem where possible (checked in Orchestrator values)"
fi

echo "ðŸŽ‰ All compliance checks passed!"
