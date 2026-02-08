module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 30000,

  projects: [
    {
      displayName: 'user-service',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/services/user-service/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/user-service/setup.ts'],
      moduleNameMapper: {
        '@user/(.*)': '<rootDir>/services/user-service/src/$1',
        '@api/(.*)': '<rootDir>/services/user-service/src/api/$1',
        '@application/(.*)': '<rootDir>/services/user-service/src/application/$1',
        '@domain/(.*)': '<rootDir>/services/user-service/src/domain/$1',
        '@infrastructure/(.*)': '<rootDir>/services/user-service/src/infrastructure/$1',
        '@shared/(.*)': '<rootDir>/shared/$1',
      }
    },
    {
      displayName: 'order-service',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/services/order-service/**/*.test.ts'],
      setupFilesAfterEnv: [
        '<rootDir>/tests/setup/order-service/setup.ts',
        '<rootDir>/tests/setup/order-service/setup.integration.ts'
      ],
      moduleNameMapper: {
        '@order/(.*)': '<rootDir>/services/order-service/src/$1',
        '@shared/(.*)': '<rootDir>/shared/$1',
      }
    },
    {
      displayName: 'order-service-integration',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/services/order-service/**/__tests__/integration/**/*.test.ts',
        '<rootDir>/services/order-service/**/__tests__/integration/**/*.spec.ts',
        '<rootDir>/services/order-service/**/?(*.)+(integration|spec).ts'
      ],
      setupFilesAfterEnv: [
        '<rootDir>/tests/setup/order-service/setup.ts',
        '<rootDir>/tests/setup/order-service/setup.integration.ts'
      ],
      moduleNameMapper: {
        '@order/(.*)': '<rootDir>/services/order-service/src/$1',
        '@shared/(.*)': '<rootDir>/shared/$1',
      },
      testTimeout: 60000,
      reporters: [
        'default',
        ['jest-junit', {
          outputDirectory: 'reports/integration',
          outputName: 'junit.xml',
          suiteName: 'Order Service Integration Tests'
        }]
      ]
    },
    {
      displayName: 'maps-service',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/services/maps-service/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/maps-service/setup.ts'],
      moduleNameMapper: {
        '@maps/(.*)': '<rootDir>/services/maps-service/src/$1',
        '@shared/(.*)': '<rootDir>/shared/$1',
      }
    },
    {
      displayName: 'analytics-service',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/services/analytics-service/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/analytics-service/setup.ts'],
      moduleNameMapper: {
        '@analytics/(.*)': '<rootDir>/services/analytics-service/src/$1',
        '@shared/(.*)': '<rootDir>/shared/$1',
      }
    },
    {
      displayName: 'auth-service',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/services/auth-service/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/auth-service/setup.ts'],
      moduleNameMapper: {
        '@auth/(.*)': '<rootDir>/services/auth-service/src/$1',
        '@shared/(.*)': '<rootDir>/shared/$1',
      }
    },
    {
      displayName: 'business-registry-service',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/services/business-registry-service/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/business-registry-service/setup.ts'],
      moduleNameMapper: {
        '@business-registry/(.*)': '<rootDir>/services/business-registry-service/src/$1',
        '@shared/(.*)': '<rootDir>/shared/$1',
      }
    },
    {
      displayName: 'campaign-service',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/services/campaign-service/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/campaign-service/setup.ts'],
      moduleNameMapper: {
        '@campaign/(.*)': '<rootDir>/services/campaign-service/src/$1',
        '@shared/(.*)': '<rootDir>/shared/$1',
      }
    },
    {
      displayName: 'catalog-service',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/services/catalog-service/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/catalog-service/setup.ts'],
      moduleNameMapper: {
        '@catalog/(.*)': '<rootDir>/services/catalog-service/src/$1',
        '@shared/(.*)': '<rootDir>/shared/$1',
      }
    },
    {
      displayName: 'checkout-service',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/services/checkout-service/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/checkout-service/setup.ts'],
      moduleNameMapper: {
        '@checkout/(.*)': '<rootDir>/services/checkout-service/src/$1',
        '@shared/(.*)': '<rootDir>/shared/$1',
      }
    },
    {
      displayName: 'commission-service',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/services/commission-service/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/commission-service/setup.ts'],
      moduleNameMapper: {
        '@commission/(.*)': '<rootDir>/services/commission-service/src/$1',
        '@shared/(.*)': '<rootDir>/shared/$1',
      }
    },
    {
      displayName: 'community-service',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/services/community-service/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/community-service/setup.ts'],
      moduleNameMapper: {
        '@community/(.*)': '<rootDir>/services/community-service/src/$1',
        '@shared/(.*)': '<rootDir>/shared/$1',
      }
    },
    {
      displayName: 'compliance-service',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/services/compliance-service/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/compliance-service/setup.ts'],
      moduleNameMapper: {
        '@compliance/(.*)': '<rootDir>/services/compliance-service/src/$1',
        '@shared/(.*)': '<rootDir>/shared/$1',
      }
    },
    {
      displayName: 'enabler-service',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/services/enabler-service/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/enabler-service/setup.ts'],
      moduleNameMapper: {
        '@enabler/(.*)': '<rootDir>/services/enabler-service/src/$1',
        '@shared/(.*)': '<rootDir>/shared/$1',
      }
    },
    {
      displayName: 'inventory-service',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/services/inventory-service/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/inventory-service/setup.ts'],
      moduleNameMapper: {
        '@inventory/(.*)': '<rootDir>/services/inventory-service/src/$1',
        '@shared/(.*)': '<rootDir>/shared/$1',
      }
    },
    {
      displayName: 'logistics-service',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/services/logistics-service/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/logistics-service/setup.ts'],
      moduleNameMapper: {
        '@logistics/(.*)': '<rootDir>/services/logistics-service/src/$1',
        '@shared/(.*)': '<rootDir>/shared/$1',
      }
    },
    {
      displayName: 'notification-service',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/services/notification-service/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/notification-service/setup.ts'],
      moduleNameMapper: {
        '@notification/(.*)': '<rootDir>/services/notification-service/src/$1',
        '@shared/(.*)': '<rootDir>/shared/$1',
      }
    },
    {
      displayName: 'payment-service',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/services/payment-service/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/payment-service/setup.ts'],
      moduleNameMapper: {
        '@payment/(.*)': '<rootDir>/services/payment-service/src/$1',
        '@shared/(.*)': '<rootDir>/shared/$1',
      }
    },
    {
      displayName: 'payout-service',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/services/payout-service/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/payout-service/setup.ts'],
      moduleNameMapper: {
        '@payout/(.*)': '<rootDir>/services/payout-service/src/$1',
        '@shared/(.*)': '<rootDir>/shared/$1',
      }
    },
    {
      displayName: 'pricing-service',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/services/pricing-service/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/pricing-service/setup.ts'],
      moduleNameMapper: {
        '@pricing/(.*)': '<rootDir>/services/pricing-service/src/$1',
        '@shared/(.*)': '<rootDir>/shared/$1',
      }
    },
    {
      displayName: 'production-service',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/services/production-service/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/production-service/setup.ts'],
      moduleNameMapper: {
        '@production/(.*)': '<rootDir>/services/production-service/src/$1',
        '@shared/(.*)': '<rootDir>/shared/$1',
      }
    },
    {
      displayName: 'session-service',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/services/session-service/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/session-service/setup.ts'],
      moduleNameMapper: {
        '@session/(.*)': '<rootDir>/services/session-service/src/$1',
        '@shared/(.*)': '<rootDir>/shared/$1',
      }
    },
    {
      displayName: 'sms-service',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/services/sms-service/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/sms-service/setup.ts'],
      moduleNameMapper: {
        '@sms/(.*)': '<rootDir>/services/sms-service/src/$1',
        '@shared/(.*)': '<rootDir>/shared/$1',
      }
    },
    {
      displayName: 'support-service',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/services/support-service/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/support-service/setup.ts'],
      moduleNameMapper: {
        '@support/(.*)': '<rootDir>/services/support-service/src/$1',
        '@shared/(.*)': '<rootDir>/shared/$1',
      }
    },
    {
      displayName: 'training-service',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/services/training-service/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/training-service/setup.ts'],
      moduleNameMapper: {
        '@training/(.*)': '<rootDir>/services/training-service/src/$1',
        '@shared/(.*)': '<rootDir>/shared/$1',
      }
    },
    {
      displayName: 'two-factor-service',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/services/two-factor-service/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/two-factor-service/setup.ts'],
      moduleNameMapper: {
        '@two-factor/(.*)': '<rootDir>/services/two-factor-service/src/$1',
        '@shared/(.*)': '<rootDir>/shared/$1',
      }
    },
    {
      displayName: 'wallet-service',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/services/wallet-service/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/wallet-service/setup.ts'],
      moduleNameMapper: {
        '@wallet/(.*)': '<rootDir>/services/wallet-service/src/$1',
        '@shared/(.*)': '<rootDir>/shared/$1',
      }
    },
    {
      displayName: 'shared',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/shared/**/*.test.ts'],
      moduleNameMapper: {
        '@shared/(.*)': '<rootDir>/shared/$1',
      }
    }
  ],

  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    'services/**/*.{ts,js}',
    'shared/**/*.{ts,js}',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/__tests__/**'
  ],

  maxWorkers: '50%',
  detectOpenHandles: true,
  forceExit: true
};
