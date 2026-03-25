#!/usr/bin/env bash

# Run on remote host after code sync. Deploys selected environment using Docker Compose.

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <staging|production>"
  exit 1
fi

TARGET_ENV="$1"

case "$TARGET_ENV" in
  staging)
    ENV_FILE=".env.staging"
    COMPOSE_FILES=(-f docker-compose.yml -f docker-compose.staging.yml)
    ;;
  production)
    ENV_FILE=".env.production"
    COMPOSE_FILES=(-f docker-compose.prod.yml)
    ;;
  *)
    echo "Unsupported environment: $TARGET_ENV"
    echo "Supported values: staging, production"
    exit 1
    ;;
esac

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing environment file: $ENV_FILE"
  exit 1
fi

docker compose --env-file "$ENV_FILE" "${COMPOSE_FILES[@]}" config >/dev/null
docker compose --env-file "$ENV_FILE" "${COMPOSE_FILES[@]}" pull || true
docker compose --env-file "$ENV_FILE" "${COMPOSE_FILES[@]}" up -d --build --remove-orphans
docker compose --env-file "$ENV_FILE" "${COMPOSE_FILES[@]}" ps
