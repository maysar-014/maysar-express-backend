import winston from 'winston';

export class Logger {
    private logger: winston.Logger;

    constructor() {
        this.logger = winston.createLogger({
            level: process.env.LOG_LEVEL || 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            defaultMeta: { service: 'payment-service' },
            transports: [
                new winston.transports.Console({
                    format: winston.format.simple()
                })
            ]
        });
    }

    error(msg: string, meta?: any) { this.logger.error(msg, meta); }
    warn(msg: string, meta?: any) { this.logger.warn(msg, meta); }
    info(msg: string, meta?: any) { this.logger.info(msg, meta); }
}

export const logger = new Logger();
