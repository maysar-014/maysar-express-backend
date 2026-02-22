# Test Resource Cleanup Issues - Fixed

## Problems Identified

### 1. Memory Leaks
- **Issue**: Tests running out of memory (heap limit exceeded)
- **Root Cause**: 
  - 29 test projects running simultaneously
  - No proper cleanup of database connections (Prisma clients)
  - No memory limits per worker
  - Mocks and test data accumulating in memory

### 2. Resource Cleanup
- **Issue**: Database connections not properly closed
- **Root Cause**: 
  - `order-service/setup.integration.ts` didn't handle disconnect errors
  - Missing `afterAll` hooks in some setup files
  - Prisma client instances not set to null after disconnect

### 3. Concurrent Execution
- **Issue**: Too many tests running in parallel
- **Root Cause**: 
  - Default Jest configuration allows 50% of CPU cores
  - Each project spawns its own worker
  - No concurrency limits

## Solutions Implemented

### 1. Jest Configuration Updates (`jest.config.js`)
```javascript
// Added global setup/teardown
globalSetup: '<rootDir>/tests/global-setup.js',
globalTeardown: '<rootDir>/tests/global-teardown.js',

// Memory management
maxConcurrency: 3,
workerIdleMemoryLimit: '256MB',

// Mock cleanup
clearMocks: true,
resetMocks: true,
restoreMocks: true
```

### 2. Integration Test Cleanup (`setup.integration.ts`)
- Added proper error handling in `teardownTestDatabase()`
- Set `prismaClient = null` after disconnect
- Added timeout to `beforeAll` and `afterAll` hooks (30s)

### 3. Package.json Scripts
```json
"test:coverage": "cross-env NODE_OPTIONS=--max-old-space-size=8192 jest --coverage --maxWorkers=2 --runInBand"
```
- Increased heap size to 8GB
- Limited to 2 workers
- Force sequential execution with `--runInBand`

### 4. Per-Service Test Scripts
Created `test-services-coverage.bat` to run tests per service:
- Avoids running all 29 projects simultaneously
- Each service gets fresh memory allocation
- Better isolation between test suites

## Recommendations

### Short Term
1. **Run tests per service** instead of all at once:
   ```bash
   npm run test:user-service:coverage
   npm run test:order-service:coverage
   ```

2. **Use the batch script** for comprehensive testing:
   ```bash
   test-services-coverage.bat
   ```

### Long Term
1. **Reduce test data size**: Review factories and fixtures
2. **Mock external services**: Ensure all external calls are mocked
3. **Split large test files**: Break down tests with 100+ assertions
4. **Add test cleanup utilities**: Create helpers to clear test data
5. **Monitor memory usage**: Add memory profiling to CI/CD

## How to Run Tests Now

### Option 1: All Tests (Requires 8GB+ RAM)
```bash
npm run test:coverage
```

### Option 2: Per Service (Recommended)
```bash
npm run test:user-service:coverage
npm run test:order-service:coverage
# ... etc
```

### Option 3: Batch Script (Best for CI/CD)
```bash
test-services-coverage.bat
```

## Verification

To verify cleanup is working:
1. Run tests with `--detectOpenHandles`
2. Check for warnings about open handles
3. Monitor memory usage during test runs
4. Ensure tests complete without heap errors

## Files Modified

1. `jest.config.js` - Added memory limits and cleanup
2. `package.json` - Updated test scripts with memory allocation
3. `tests/setup/order-service/setup.integration.ts` - Fixed Prisma cleanup
4. `tests/setup/order-service/setup.ts` - Added afterAll hook
5. `tests/global-setup.js` - Created (new)
6. `tests/global-teardown.js` - Created (new)
7. `test-services-coverage.bat` - Created (new)
8. `test-services-coverage.sh` - Created (new)
