@echo off
set NODE_OPTIONS=--max-old-space-size=4096 --expose-gc
npm run test:coverage
