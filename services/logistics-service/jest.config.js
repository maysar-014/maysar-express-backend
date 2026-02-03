module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts',
    '!**/node_modules/**'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/main.ts',
    '!src/bootstrap.ts',
    '!src/test-runner.ts',
    '!src/simple-test.ts',
    '!src/simple-main.ts',
    '!src/diagnose-route-engine.ts',
    '!src/diagnostic-runner.ts',
    '!src/network-operational-status.ts',
    '!src/status-report.ts',
    '!src/supabase-vs-prisma.ts',
    '!src/test-*.ts',
    '!src/migration-*.ts',
    '!src/final-*.ts',
    '!src/corrected-*.ts',
    '!src/confirm-supabase.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    },
    // Constitution Section 11: Domain tests must cover pure logic only
    'src/domain/**/*.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    },
    // Saga orchestration tests
    'src/application/sagas/**/*.ts': {
      branches: 90,
      functions: 95,
      lines: 90,
      statements: 90
    }
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  testTimeout: 10000,
  verbose: true,
  detectOpenHandles: true,
  forceExit: true
};
