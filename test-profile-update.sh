#!/bin/bash

RESP_FILE="./login_resp_tmp.json"

echo "=== Step 1: Login ==="
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"buyer@maysar.co.tz","password":"Maysar@2024!"}' \
  -o "$RESP_FILE"

TOKEN=$(node -e "const d=require('./${RESP_FILE##*/}');console.log(d.accessToken||'')")
echo "Token length: ${#TOKEN}"

if [ -z "$TOKEN" ]; then
  echo "ERROR: No token"
  cat "$RESP_FILE"
  rm -f "$RESP_FILE"
  exit 1
fi

echo ""
echo "=== Step 2: firstName update ==="
curl -s -X PUT http://localhost:3000/api/user/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"firstName":"Amina"}'

echo ""
echo ""
echo "=== Step 3: address update ==="
curl -s -X PUT http://localhost:3000/api/user/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"addresses":[{"type":"home","isPrimary":true,"street":"Mikocheni A","city":"Dar es Salaam","state":"Dar es Salaam","postalCode":"11101","country":"Tanzania"}]}'

echo ""
rm -f "$RESP_FILE"
