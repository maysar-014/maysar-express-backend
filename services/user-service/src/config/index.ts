import { config as rootConfig } from '@config/index';

/**
 * Configuration manager - back by centralized project configuration
 */
class ConfigManager {
  private config = rootConfig;

  getServiceInfo() {
    return {
      name: 'user-service',
      version: '1.0.0',
      environment: this.config.nodeEnv,
      port: 3001
    };
  }

  get<K extends keyof typeof rootConfig>(section: K): typeof rootConfig[K] {
    return this.config[section];
  }

  isProduction(): boolean {
    return this.config.nodeEnv === 'production';
  }

  isDevelopment(): boolean {
    return this.config.nodeEnv === 'development';
  }

  isTest(): boolean {
    return this.config.nodeEnv === 'test';
  }

  getConfig() {
    return {
      nodeEnv: this.config.nodeEnv,
      port: 3001,
      security: {
        jwtSecret: this.config.services.user.jwtSecret,
        jwtExpire: this.config.services.user.jwtExpiresIn,
      }
      // Add other backward compatibility mappings if needed
    };
  }
}

export const config = new ConfigManager();
export type ConfigSchema = any; // Placeholder for legacy types

