module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/services', '<rootDir>/shared', '<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
  moduleNameMapper: {
    '@shared/(.*)': '<rootDir>/shared/$1',
    '@shared-events/(.*)': '<rootDir>/shared/events/$1',
    '@events/(.*)': '<rootDir>/events/$1',
    '@config/(.*)': '<rootDir>/src/config/$1',
    '@modules/(.*)': '<rootDir>/services/$1',
    // Module mappings
    '@analytics/(.*)': '<rootDir>/services/analytics-service/src/$1',
    '@auth/(.*)': '<rootDir>/services/auth-service/src/$1',
    '@compliance/(.*)': '<rootDir>/services/compliance-service/src/$1',
    '@catalog/(.*)': '<rootDir>/services/catalog-service/src/$1',
    '@payment/(.*)': '<rootDir>/services/payment-service/src/$1',
    '@user/(.*)': '<rootDir>/services/user-service/src/$1',
    // ... maps to all services if needed, but strict mapping above covers imports
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    'services/**/*.{ts,js}',
    'shared/**/*.{ts,js}',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/vendor/**'
  ]
};
