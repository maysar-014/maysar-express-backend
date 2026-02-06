import winston from 'winston';

export class Logger {
    private logger: winston.Logger;
    constructor() {
        this.logger = winston.createLogger({
            level: process.env.LOG_LEVEL || 'info',
            format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
            defaultMeta: { service: 'logistics-service' },
            transports: [new winston.transports.Console()]
        });
    }
    error(m: string, x?: any) { this.logger.error(m, x); }
    warn(m: string, x?: any) { this.logger.warn(m, x); }
    info(m: string, x?: any) { this.logger.info(m, x); }
}
export const logger = new Logger();
