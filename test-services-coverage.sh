#!/bin/bash

# Run tests per service with coverage to avoid memory issues

services=(
  "user-service"
  "order-service"
  "auth-service"
  "catalog-service"
  "checkout-service"
  "payment-service"
  "inventory-service"
  "notification-service"
)

echo "Running tests with coverage per service..."

for service in "${services[@]}"; do
  echo "Testing $service..."
  NODE_OPTIONS=--max-old-space-size=4096 npm run test:${service}:coverage
  if [ $? -ne 0 ]; then
    echo "Tests failed for $service"
  fi
done

echo "All service tests completed!"
