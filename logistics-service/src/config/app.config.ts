export interface AppConfig {
  port: number;
  environment: 'development' | 'staging' | 'production';
  serviceName: string;
  version: string;
  cors: {
    origin: string[];
    credentials: boolean;
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  logging: {
    level: string;
    format: 'json' | 'simple';
  };
}

export class AppConfiguration {
  private static instance: AppConfiguration;
  private config: AppConfig;

  private constructor() {
    this.config = {
      port: parseInt(process.env.PORT || '3007'),
      environment: (process.env.NODE_ENV as any) || 'development',
      serviceName: process.env.SERVICE_NAME || 'logistics-service',
      version: process.env.SERVICE_VERSION || '1.0.0',
      cors: {
        origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
        credentials: process.env.CORS_CREDENTIALS === 'true'
      },
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
        max: parseInt(process.env.RATE_LIMIT_MAX || '100')
      },
      jwt: {
        secret: process.env.JWT_SECRET || 'logistics-service-secret',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      },
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: (process.env.LOG_FORMAT as any) || 'json'
      }
    };
  }

  static getInstance(): AppConfiguration {
    if (!AppConfiguration.instance) {
      AppConfiguration.instance = new AppConfiguration();
    }
    return AppConfiguration.instance;
  }

  getConfig(): AppConfig {
    return this.config;
  }

  isDevelopment(): boolean {
    return this.config.environment === 'development';
  }

  isProduction(): boolean {
    return this.config.environment === 'production';
  }

  getServiceInfo() {
    return {
      name: this.config.serviceName,
      version: this.config.version,
      environment: this.config.environment,
      port: this.config.port
    };
  }
}