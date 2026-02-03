module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'src/**/*.{js,ts}',
        '!src/**/*.d.ts',
        '!src/**/index.ts',
        '!src/main.ts',
        '!src/infrastructure/database/prisma.ts' // Exclude prisma client initialization from coverage
    ],
    coverageThreshold: {
        'src/domain': {
            branches: 98,
            functions: 98,
            lines: 98,
            statements: 98
        },
        'src/application': {
            branches: 90,
            functions: 90,
            lines: 90,
            statements: 90
        },
        'src/infrastructure': {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
        },
        'src/api': {
            branches: 85,
            functions: 85,
            lines: 85,
            statements: 85
        }
    },
    moduleNameMapper: {
        '^@domain/(.*)$': '<rootDir>/src/domain/$1',
        '^@application/(.*)$': '<rootDir>/src/application/$1',
        '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
        '^@api/(.*)$': '<rootDir>/src/api/$1'
    },
    testTimeout: 30000 // Increased timeout for integration tests
};
