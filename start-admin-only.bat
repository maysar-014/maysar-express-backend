@echo off
echo Stopping all Node.js processes...
taskkill /f /im node.exe 2>nul
timeout /t 2 /nobreak >nul

echo Starting Admin Server...
node admin-server.js