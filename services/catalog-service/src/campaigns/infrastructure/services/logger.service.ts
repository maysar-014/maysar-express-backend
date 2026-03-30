import { injectable } from 'inversify';
import { createLogger, format, transports, Logger } from 'winston';

@injectable()
export class LoggerService {
    private logger: Logger;

    constructor() {
        this.logger = createLogger({
            level: process.env.LOG_LEVEL || 'info',
            format: format.combine(
                format.timestamp(),
                format.json()
            ),
            transports: [
                new transports.Console()
            ],
        });
    }

    info(message: string, meta?: Record<string, unknown>): void {
        this.logger.info(message, meta);
    }

    error(message: string, meta?: Record<string, unknown>): void {
        this.logger.error(message, meta);
    }

    warn(message: string, meta?: Record<string, unknown>): void {
        this.logger.warn(message, meta);
    }

    debug(message: string, meta?: Record<string, unknown>): void {
        this.logger.debug(message, meta);
    }
}

export const logger = new LoggerService();
