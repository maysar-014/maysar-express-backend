module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/services'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    'services/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!services/**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  testTimeout: 30000,
  maxWorkers: 4,
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  // Test environment variables
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  }
};
