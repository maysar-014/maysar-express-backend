@echo off
echo Running tests with coverage per service...

set NODE_OPTIONS=--max-old-space-size=4096

echo Testing user-service...
call npm run test:user-service:coverage

echo Testing order-service...
call npm run test:order-service:coverage

echo Testing auth-service...
call npm run test:auth-service:coverage

echo Testing catalog-service...
call npm run test:catalog-service:coverage

echo Testing checkout-service...
call npm run test:checkout-service:coverage

echo Testing payment-service...
call npm run test:payment-service:coverage

echo Testing inventory-service...
call npm run test:inventory-service:coverage

echo Testing notification-service...
call npm run test:notification-service:coverage

echo All service tests completed!
