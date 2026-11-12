module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/shared/database/__tests__/normalize-database-url.bug-condition.test.ts'],
  rootDir: '.',
  forceExit: true,
  detectOpenHandles: false,
  testTimeout: 60000,
  moduleNameMapper: {
    '@prisma/client': '<rootDir>/shared/database/__tests__/__mocks__/prisma-client-mock.js',
  },
  globals: {
    'ts-jest': {
      isolatedModules: true,
    },
  },
};
