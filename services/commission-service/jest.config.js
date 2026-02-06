/** @type {import('jest').Config} */

module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src', '<rootDir>/tests'],

    testMatch: [
        '<rootDir>/src/**/__tests__/**/*.test.ts',
        '<rootDir>/tests/**/*.test.ts',
        '<rootDir>/src/**/*.test.ts',
        '!src/**/*.d.ts'
    ],

    transform: {
        '^.+\\.ts$': [
            'ts-jest',
            {
                tsconfig: 'tsconfig.json'
            }
        ]
    },

    moduleFileExtensions: ['ts', 'js', 'json'],

    moduleNameMapper: {
        '^@domain/(.*)$': '<rootDir>/src/domain/$1',
        '^@application/(.*)$': '<rootDir>/src/application/$1',
        '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
        '^@api/(.*)$': '<rootDir>/src/api/$1',
        '^@config/(.*)$': '<rootDir>/src/config/$1'
    },

    collectCoverage: true,
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/__tests__/**',
        '!src/**/*.test.ts'
    ],

    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
        }
    },

    setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
    globalSetup: '<rootDir>/tests/global-setup.ts',
    globalTeardown: '<rootDir>/tests/global-teardown.ts',

    testTimeout: 10000,
    detectOpenHandles: true,
    forceExit: true
};
