// @ts-check
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

const LOOSE_RULES = {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/ban-types': 'off',
    'no-console': 'off',
    'no-control-regex': 'off',
    'no-case-declarations': 'off',
    'no-useless-escape': 'off',
    'no-empty': 'off',
    'prefer-spread': 'off',
    'no-constant-condition': 'off',
    'no-var': 'off',
    'no-irregular-whitespace': 'off',
    'no-useless-catch': 'off',
};

/** @type {import('eslint').Linter.Config[]} */
export default [
    // Global ignores
    {
        ignores: [
            'dist/**',
            'node_modules/**',
            '**/*.js',
            'services/notification-service/notification-service/**',
        ],
    },

    // Base config for all TypeScript files
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: tsparser,
            parserOptions: {
                project: './tsconfig.eslint.json',
                ecmaVersion: 2020,
            },
            globals: {
                // node globals
                process: 'readonly',
                console: 'readonly',
                Buffer: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
                module: 'readonly',
                require: 'readonly',
                exports: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                Promise: 'readonly',
            },
        },
        plugins: {
            '@typescript-eslint': tseslint,
        },
        rules: {
            ...tseslint.configs.recommended.rules,
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/no-namespace': 'off',
            '@typescript-eslint/ban-ts-comment': 'warn',
            '@typescript-eslint/no-var-requires': 'warn',
            '@typescript-eslint/ban-types': 'warn',
            'no-console': 'warn',
            'no-control-regex': 'warn',
            'no-useless-catch': 'warn',
            'no-case-declarations': 'warn',
            'no-useless-escape': 'warn',
            'no-empty': 'warn',
            'prefer-spread': 'warn',
            'no-constant-condition': 'warn',
            'no-var': 'warn',
            'no-irregular-whitespace': 'warn',
        },
    },

    // Test files
    {
        files: ['**/*.test.ts', '**/*.spec.ts', '**/__tests__/**/*.ts', '**/tests/**/*.ts'],
        rules: LOOSE_RULES,
    },

    // Entry points and scripts
    {
        files: [
            'scripts/**/*.ts',
            'services/**/index.ts',
            'services/**/src/index.ts',
            'services/**/src/app.ts',
            'services/**/src/container.ts',
            'services/**/src/main.ts',
            'services/**/src/api/main.ts',
            'services/**/bootstrap.ts',
            'services/**/simple-*.ts',
            'services/**/src/**/*runner.ts',
            'services/**/src/**/*diagnostic*.ts',
            'services/**/src/**/*test*.ts',
            'services/**/src/**/*validator.ts',
            'services/**/diagnose-*.ts',
            'services/**/status-report.ts',
            'tests/global-setup.ts',
            'tests/global-teardown.ts',
            'tests/setup.ts',
        ],
        rules: LOOSE_RULES,
    },

    // Infrastructure / API / shared layers
    {
        files: [
            'src/**/*.ts',
            'shared/middleware/**/*.ts',
            'shared/outbox/**/*.ts',
            'shared/redis/**/*.ts',
            'shared/saga/**/*.ts',
            'shared/storage/**/*.ts',
            'shared/locking/**/*.ts',
            'shared/metrics/**/*.ts',
            'shared/tracing/**/*.ts',
            'services/**/src/api/**/*.ts',
            'services/**/src/config/**/*.ts',
            'services/**/src/infrastructure/**/*.ts',
            'services/**/src/internal/**/*.ts',
            'services/**/src/application/sagas/**/*.ts',
            'services/**/src/application/handlers/**/*.ts',
            'services/**/src/application/mappers/**/*.ts',
            'services/**/src/application/dto/**/*.ts',
            'services/**/src/**/middleware/**/*.ts',
            'services/**/src/**/modules/**/*.ts',
            'services/**/src/**/validators/**/*.ts',
            'services/**/src/**/shared/**/*.ts',
            'services/**/src/**/*api.ts',
            'services/**/src/**/*util.ts',
            'services/**/src/**/*Service.ts',
            'services/**/src/**/*service.ts',
            'services/**/src/**/*.service.ts',
            'services/**/src/**/*.util.ts',
            'services/**/src/**/worker.ts',
            'services/**/prisma/seed.ts',
            'services/**/src/**/api/**/*.ts',
            'services/**/src/**/application/**/*.ts',
            'services/**/src/**/services/**/*.ts',
            'services/**/*api.ts',
            'services/**/*service.ts',
            'services/**/*Service.ts',
            'services/**/*.util.ts',
            'services/**/*worker.ts',
            'services/**/*validator.ts',
        ],
        rules: LOOSE_RULES,
    },

    // Domain layer — slightly stricter
    {
        files: ['services/**/src/domain/**/*.ts'],
        rules: {
            ...LOOSE_RULES,
            'no-control-regex': 'warn',
            'no-case-declarations': 'warn',
            'no-useless-escape': 'warn',
            'no-constant-condition': 'warn',
        },
    },
];
