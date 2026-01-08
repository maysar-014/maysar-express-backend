@echo off
echo Testing Logistics Service Endpoints...
echo.

echo === Health Endpoints ===
curl -s http://localhost:3007/health | jq .
echo.

echo === New Routes Endpoint ===
curl -s http://localhost:3007/api/v1/routes | jq .
echo.

echo === New Analytics Endpoint ===
curl -s http://localhost:3007/api/v1/analytics | jq .
echo.

echo === New Earnings Endpoint ===
curl -s http://localhost:3007/api/v1/earnings | jq .
echo.

echo === POST Routes Test ===
curl -s -X POST http://localhost:3007/api/v1/routes -H "Content-Type: application/json" -d "{\"name\":\"Test Route\",\"stops\":[\"Stop 1\",\"Stop 2\"],\"priority\":\"high\"}" | jq .
echo.

echo === POST Earnings Test ===
curl -s -X POST http://localhost:3007/api/v1/earnings -H "Content-Type: application/json" -d "{\"courierId\":\"courier_001\",\"deliveryId\":\"del_001\",\"amount\":5000,\"type\":\"delivery_fee\"}" | jq .
echo.

echo Testing complete!