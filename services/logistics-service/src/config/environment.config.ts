export interface EnvironmentConfig {
  nodeEnv: 'development' | 'staging' | 'production';
  port: number;
  database: {
    url: string;
    maxConnections: number;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
}

export class EnvironmentConfiguration {
  private static instance: EnvironmentConfiguration;
  private config: EnvironmentConfig;

  private constructor() {
    this.validateEnvironment();

    this.config = {
      nodeEnv: (process.env.NODE_ENV as any) || 'development',
      port: parseInt(process.env.PORT || '3007'),
      database: {
        url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/logistics',
        maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20')
      },
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD
      },
      jwt: {
        secret: process.env.JWT_SECRET || 'logistics-service-secret',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      }
    };
  }


  static getInstance(): EnvironmentConfiguration {
    if (!EnvironmentConfiguration.instance) {
      EnvironmentConfiguration.instance = new EnvironmentConfiguration();
    }
    return EnvironmentConfiguration.instance;
  }

  getConfig(): EnvironmentConfig {
    return this.config;
  }

  private validateEnvironment(): void {
    const required = ['DATABASE_URL'];
    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
      console.warn(`Missing environment variables: ${missing.join(', ')}`);
    }
  }

  isProduction(): boolean {
    return this.config.nodeEnv === 'production';
  }

  isDevelopment(): boolean {
    return this.config.nodeEnv === 'development';
  }
}