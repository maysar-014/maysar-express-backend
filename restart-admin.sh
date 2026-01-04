#!/bin/bash
echo "Stopping all Node.js processes..."
taskkill //F //IM node.exe 2>/dev/null || true
echo "Waiting for processes to terminate..."
sleep 3

echo "Starting Admin Server on port 3001..."
echo "Admin Console should connect to: http://localhost:3001"
node admin-server.js